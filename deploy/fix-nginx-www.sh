#!/usr/bin/env bash
# ============================================================================
# Convation — 精准修复 nginx www → apex 跳转（不影响 Node 服务，秒级 reload）
# 适用：站点已部署、证书已签发（含 www SAN），但 www 直接 200 返回、未 301 跳 apex。
# 在腾讯云控制台网页终端以 root 执行：
#   git clone --depth 1 https://github.com/yhai3596/convation.git /tmp/conv && bash /tmp/conv/deploy/fix-nginx-www.sh
# 幂等、轻量：只重建 /etc/nginx/conf.d/convation.conf 并 reload。
# ============================================================================
set -uo pipefail

DOMAIN="convation.it"
SERVICE="convation"
CERT_DIR="/etc/ssl/convation"
PORT=8202
WEBROOT="/var/www/convation/public"

[ "$(id -u)" = "0" ] || { echo "请以 root 执行"; exit 1; }

# 证书是否就绪（含 www SAN）
if [ -s "${CERT_DIR}/convation.cer" ] && openssl x509 -in "${CERT_DIR}/convation.cer" -noout -text 2>/dev/null | grep -q "DNS:www.${DOMAIN}"; then
  log() { echo -e "\033[1;32m==> $*\033[0m"; }
  log "证书就绪（含 www SAN），重建 80 + 443 双跳转 vhost"
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
    ssl_certificate ${CERT_DIR}/convation.cer;
    ssl_certificate_key ${CERT_DIR}/convation.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    return 301 https://${DOMAIN}\$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};
    ssl_certificate ${CERT_DIR}/convation.cer;
    ssl_certificate_key ${CERT_DIR}/convation.key;
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
  nginx -t && nginx -s reload && echo "✅ nginx 已重载，www → apex 跳转生效"
else
  echo "[WARN] 证书缺失或不含 www SAN（$(ls -la ${CERT_DIR}/ 2>/dev/null | tail -n +2)）"
  echo "        请先重跑完整部署脚本签发含 www 的证书："
  echo "        git clone --depth 1 https://github.com/yhai3596/convation.git /tmp/conv && bash /tmp/conv/deploy/deploy-convation.sh"
  exit 1
fi
