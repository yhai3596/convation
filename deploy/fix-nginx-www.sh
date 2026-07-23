#!/usr/bin/env bash
# ============================================================================
# Convation — 精准修复 nginx www → apex 跳转（不影响 Node 服务，秒级 reload）
# 适用：站点已部署、证书已签发（含 www SAN），但 www 直接 200 返回、未 301 跳 apex。
# 在腾讯云控制台网页终端以 root 执行：
#   rm -rf /tmp/conv && git clone --depth 1 https://github.com/yhai3596/convation.git /tmp/conv && bash /tmp/conv/deploy/fix-nginx-www.sh
# 幂等、轻量：只重建 /etc/nginx/conf.d/convation.conf 并 reload。
# 证书路径自动探测（CERT_DIR → acme.sh → convation.conf → 兜底遍历 nginx 所有证书找 SAN 含 www 的），
# 并去掉 nginx 配置里可能的引号。
# ============================================================================
set -uo pipefail

DOMAIN="convation.it"
SERVICE="convation"
CERT_DIR="/etc/ssl/convation"
PORT=8202
WEBROOT="/var/www/convation/public"

log() { echo -e "\033[1;32m==> $*\033[0m"; }
[ "$(id -u)" = "0" ] || { echo "请以 root 执行"; exit 1; }

CER=""; KEY=""
# 1) 部署约定的 CERT_DIR
for f in "${CERT_DIR}/convation.cer" "${CERT_DIR}/fullchain.cer"; do [ -s "$f" ] && CER="$f" && break; done
for f in "${CERT_DIR}/convation.key" "${CERT_DIR}/privkey.key"; do [ -s "$f" ] && KEY="$f" && break; done
# 2) acme.sh 默认目录
[ -z "$CER" ] && for f in ~/.acme.sh/${DOMAIN}/fullchain.cer ~/.acme.sh/${DOMAIN}/convation.cer; do [ -s "$f" ] && CER="$f" && break; done
[ -z "$KEY" ] && for f in ~/.acme.sh/${DOMAIN}/convation.key ~/.acme.sh/${DOMAIN}/${DOMAIN}.key; do [ -s "$f" ] && KEY="$f" && break; done
# 3) convation.conf 当前引用（去引号）
if [ -z "$CER" ] && [ -f /etc/nginx/conf.d/${SERVICE}.conf ]; then
  c=$(grep -oE "ssl_certificate [^;]+" /etc/nginx/conf.d/${SERVICE}.conf | head -1 | awk '{print $2}' | tr -d "\"'")
  [ -s "$c" ] && CER="$c"
fi
if [ -z "$KEY" ] && [ -f /etc/nginx/conf.d/${SERVICE}.conf ]; then
  k=$(grep -oE "ssl_certificate_key [^;]+" /etc/nginx/conf.d/${SERVICE}.conf | head -1 | awk '{print $2}' | tr -d "\"'")
  [ -s "$k" ] && KEY="$k"
fi
# 4) 兜底：遍历 nginx 所有引用的证书，找 SAN 含 www 的那个（+ 配对 key）
if [ -z "$CER" ] || [ -z "$KEY" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -s "$f" ] || continue
    if openssl x509 -in "$f" -noout -text 2>/dev/null | grep -q "DNS:www.${DOMAIN}"; then
      CER="$f"
      d=$(dirname "$f"); b=$(basename "$f")
      for k in "$d/privkey.pem" "$d/${b%.crt}.key" "$d/${b%.cer}.key" "$d/${b%.pem}.key"; do
        [ -s "$k" ] && KEY="$k" && break
      done
      [ -z "$KEY" ] && KEY=$(nginx -T 2>/dev/null | grep -oE "ssl_certificate_key [^;]+" | awk '{print $2}' | tr -d "\"''" | sort -u | head -1)
      break
    fi
  done < <(nginx -T 2>/dev/null | grep -oE "ssl_certificate [^;]+" | awk '{print $2}' | tr -d "\"''" | sort -u)
fi

echo "探测到证书: CER=${CER:-<空>}  KEY=${KEY:-<空>}"
[ -n "$CER" ] && [ -s "$CER" ] || { echo "[ERROR] 找不到有效证书。nginx 当前引用的证书路径:"; nginx -T 2>/dev/null | grep -oE "ssl_certificate [^;]+" | sort -u; exit 1; }
[ -n "$KEY" ] && [ -s "$KEY" ] || { echo "[ERROR] 找不到对应私钥文件。"; exit 1; }

if openssl x509 -in "$CER" -noout -text 2>/dev/null | grep -q "DNS:www.${DOMAIN}"; then
  log "证书含 www SAN ✓，重建 80 + 443 双跳转 vhost"
else
  echo "[WARN] 证书 SAN 不含 www.${DOMAIN}（路径 ${CER}）。www 跳转块将用此证书，浏览器对 www 访问可能报证书告警。建议改签含 www 的证书后重跑。"
fi

cat > /etc/nginx/conf.d/${SERVICE}.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root ${WEBROOT}; }
    return 301 https://${DOMAIN}\$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    server_name www.${DOMAIN};
    ssl_certificate ${CER};
    ssl_certificate_key ${KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    return 301 https://${DOMAIN}\$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};
    ssl_certificate ${CER};
    ssl_certificate_key ${KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 15m;
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
nginx -t && nginx -s reload && echo "✅ nginx 已重载，www → apex 跳转生效（验证: curl -sI https://www.${DOMAIN}/ | head -3）"
