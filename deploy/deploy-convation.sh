#!/usr/bin/env bash
# ============================================================================
# Convation 官网一键部署（意大利服务器 · Ubuntu/Debian）
#
# 在服务器控制台以 root 执行：
#   curl -fsSL https://raw.githubusercontent.com/<owner>/convation/main/deploy/deploy-convation.sh | bash
#
# 幂等：可重复执行。完成后站点在 https://www.convation.it
# 前置（人工完成，脚本会检查并提示）：
#   1. 域名 convation.it 的 A 记录指向本机公网 IP（@ 和 www）
#   2. 服务器 80/443 端口对外开放
#   3. 仓库为 public（autopull 匿名拉取）；若 private 需先放 deploy key
# ============================================================================
set -uo pipefail

DOMAIN="convation.it"
APP_DIR="/var/www/convation"
REPO="${CONVATION_REPO:-https://github.com/yhai3596/convation.git}"   # private 仓库需在服务器放 deploy key
PORT=8202
SERVICE="convation"
SERVER_IP="$(curl -s --max-time 8 ifconfig.me || echo unknown)"

log() { echo -e "\n\033[1;33m==> $*\033[0m"; }

# ---------------------------------------------------------------- 0. 环境
log "0/8 检查 root 与系统"
[ "$(id -u)" = "0" ] || { echo "请以 root 执行"; exit 1; }
command -v nginx >/dev/null || { log "安装 nginx"; apt-get update -qq && apt-get install -y -qq nginx; }
command -v node >/dev/null || { log "安装 Node 20"; curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y -qq nodejs; }
command -v acme.sh >/dev/null || { log "安装 acme.sh"; curl -fsSL https://get.acme.sh | sh -s email=admin@convation.it; source ~/.bashrc; }
log "Node $(node -v) · nginx $(nginx -v 2>&1) · IP ${SERVER_IP}"

# ---------------------------------------------------------------- 1. 拉代码
log "1/8 克隆仓库到 ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then cd "${APP_DIR}" && git pull --ff-only; else git clone "${REPO}" "${APP_DIR}" && cd "${APP_DIR}"; fi

# ---------------------------------------------------------------- 2. 依赖
log "2/8 安装依赖"
npm ci --omit=dev

# ---------------------------------------------------------------- 3. 环境变量
log "3/8 生成 .env（首次）"
if [ ! -f "${APP_DIR}/.env" ]; then
  SECRET="$(openssl rand -hex 32)"
  cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=production
PORT=${PORT}
HOST=127.0.0.1
SESSION_SECRET=${SECRET}
SITE_ORIGIN=https://www.${DOMAIN}
# 可选：SMTP（联系表单邮件通知）
# SMTP_HOST= SMTP_USER= SMTP_PASS= SMTP_PORT=465 SMTP_FROM= MAIL_NOTIFY_TO=info@convation.it
# 可选：LLM（AI 助理升级）
# LLM_BASE= LLM_KEY= LLM_MODEL=
EOF
  echo ".env 已生成（含随机 SESSION_SECRET）";
fi

# ---------------------------------------------------------------- 4. systemd
log "4/8 注册 systemd 服务"
cat > /etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=Convation official site
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
EnvironmentFile=${APP_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ${SERVICE}
systemctl restart ${SERVICE}
sleep 2
curl -s -o /dev/null -w "本地健康检查: %{http_code}\n" http://127.0.0.1:${PORT}/

# ---------------------------------------------------------------- 5. 证书
log "5/8 签发 TLS 证书（acme.sh http-01）"
~/.acme.sh/acme.sh --issue -d ${DOMAIN} -d www.${DOMAIN} --webroot "${APP_DIR}/public" --keylength ec-256 || echo "[INFO] 证书已存在或稍后重试"

# ---------------------------------------------------------------- 6. nginx
log "6/8 配置 nginx 反代"
cat > /etc/nginx/sites-available/${DOMAIN} <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root ${APP_DIR}/public; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate     $(~/.acme.sh/acme.sh --home ~/.acme.sh --install-cert -d ${DOMAIN} --ecc 2>/dev/null | grep -oP 'key-file \K[^ ]+' | head -1 | xargs dirname | xargs -I{} echo {}/fullchain.cer 2>/dev/null || echo /etc/ssl/certs/dummy);
    ssl_certificate_key $(~/.acme.sh/acme.sh --home ~/.acme.sh --install-cert -d ${DOMAIN} --ecc 2>/dev/null | grep -oP 'key-file \K[^ ]+' | head -1 || echo /etc/ssl/private/dummy);

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
# 安装证书到固定路径并 reload
~/.acme.sh/acme.sh --install-cert -d ${DOMAIN} --ecc \
  --key-file /etc/ssl/${DOMAIN}/key.pem \
  --fullchain-file /etc/ssl/${DOMAIN}/fullchain.pem \
  --reloadcmd "systemctl reload nginx" 2>/dev/null || true
mkdir -p /etc/ssl/${DOMAIN}
nginx -t && systemctl reload nginx

# ---------------------------------------------------------------- 7. autopull
log "7/8 autopull 定时器（每分钟拉取 + 按需重启）"
cat > /usr/local/bin/${SERVICE}-autopull.sh <<'EOF'
#!/usr/bin/env bash
set -uo pipefail
APP="/var/www/convation"
cd "$APP" || exit 0
OLD=$(git rev-parse HEAD)
git pull --ff-only -q 2>/dev/null || exit 0
NEW=$(git rev-parse HEAD)
[ "$OLD" = "$NEW" ] && exit 0
if ! git diff --quiet "$OLD" "$NEW" -- package.json package-lock.json; then npm ci --omit=dev 2>&1 | tail -1; fi
systemctl restart convation
echo "$(date) $OLD → $NEW" >> /var/log/convation-autopull.log
EOF
chmod +x /usr/local/bin/${SERVICE}-autopull.sh
cat > /etc/systemd/system/${SERVICE}-autopull.service <<EOF
[Unit]
Description=Convation autopull
[Service]
ExecStart=/usr/local/bin/${SERVICE}-autopull.sh
EOF
cat > /etc/systemd/system/${SERVICE}-autopull.timer <<EOF
[Unit]
Description=Convation autopull every minute
[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now ${SERVICE}-autopull.timer

# ---------------------------------------------------------------- 8. cron 备份
log "8/8 cron 每日备份"
( crontab -l 2>/dev/null | grep -v "${SERVICE}-backup" ; echo "0 4 * * * cd ${APP_DIR} && /usr/bin/node scripts/backup-db.js >> /var/log/${SERVICE}-backup.log 2>&1" ) | crontab -

log "部署完成 ✓"
echo "  https://${DOMAIN}  https://www.${DOMAIN}"
echo "  本地改代码 → git push → 1 分钟内线上生效（autopull）"
echo "  管理后台：https://www.${DOMAIN}/admin（初始密码见 ${APP_DIR}/data/admin-credentials.txt）"
echo "  待人工：DNS A 记录 @ 和 www 指向 ${SERVER_IP}"
