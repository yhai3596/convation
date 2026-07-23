#!/usr/bin/env bash
# ============================================================================
# Convation — 精准修复 nginx www → apex 跳转（不影响 Node 服务，秒级 reload）
# 适用：站点已部署、证书已签发（含 www SAN），但 www 直接 200 返回、未 301 跳 apex。
# 在腾讯云控制台网页终端以 root 执行：
#   git clone --depth 1 https://github.com/yhai3596/convation.git /tmp/conv && bash /tmp/conv/deploy/fix-nginx-www.sh
# 幂等、轻量：只重建 /etc/nginx/conf.d/convation.conf 并 reload。
# 证书路径自动探测（CERT_DIR → acme.sh 默认目录 → 兜底从 nginx 当前生效配置提取），
# 不依赖硬编码路径。
# ============================================================================
set -uo pipefail

DOMAIN="convation.it"
SERVICE="convation"
CERT_DIR="/etc/ssl/convation"
PORT=8202
WEBROOT="/var/www/convation/public"

log() { echo -e "\033[1;32m==> $*\033[0m"; }
[ "$(id -u)" = "0" ] || { echo "请以 root 执行"; exit 1; }

# ---- 自动探测证书路径 ----
CER=""; KEY=""
probe() {
  local f="$1"
  [ -s "$f" ] && { echo "$f"; return 0; }
  return 1
}
# 1) 部署脚本约定的 CERT_DIR
for f in "${CERT_DIR}/convation.cer" "${CERT_DIR}/fullchain.cer"; do probe "$f" && CER="$f" && break; done
for f in "${CERT_DIR}/convation.key" "${CERT_DIR}/privkey.key"; do probe "$f" && KEY="$f" && break; done
# 2) acme.sh 默认家目录
if [ -z "$CER" ]; then for f in ~/.acme.sh/${DOMAIN}/fullchain.cer ~/.acme.sh/${DOMAIN}/convation.cer; do probe "$f" && CER="$f" && break; done; fi
if [ -z "$KEY" ]; then for f in ~/.acme.sh/${DOMAIN}/convation.key ~/.acme.sh/${DOMAIN}/${DOMAIN}.key; do probe "$f" && KEY="$f" && break; done; fi
# 3) 兜底：从 nginx 当前生效配置提取（最可靠，反映线上实际加载的证书）
if [ -z "$CER" ]; then CER=$(nginx -T 2>/dev/null | grep -oE "ssl_certificate [^;]+" | head -1 | awk '{print $2}'); fi
if [ -z "$KEY" ]; then KEY=$(nginx -T 2>/dev/null | grep -oE "ssl_certificate_key [^;]+" | head -1 | awk '{print $2}'); fi

echo "探测到证书: CER=${CER:-<空>}  KEY=${KEY:-<空>}"
[ -n "$CER" ] && [ -s "$CER" ] || { echo "[ERROR] 找不到证书文件，请先签发：${CERT_DIR}/ 或 ~/.acme.sh/${DOMAIN}/"; exit 1; }
[ -n "$KEY" ] && [ -s "$KEY" ] || { echo "[ERROR] 找不到私钥文件"; exit 1; }

# ---- 校验 SAN 含 www ----
if openssl x509 -in "$CER" -noout -text 2>/dev/null | grep -q "DNS:www.${DOMAIN}"; then
  log "证书含 www SAN ✓，重建 80 + 443 双跳转 vhost"
else
  echo "[WARN] 证书 SAN 不含 www.${DOMAIN}，www 跳转块将用此证书（浏览器对 www 访问可能报证书告警）。"
  echo "        建议改签含 www 的证书后重跑；或先接受此警告继续。"
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
