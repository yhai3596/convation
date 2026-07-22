#!/usr/bin/env bash
# ============================================================================
# Convation 官网一键部署（服务器 43.156.58.154 · OpenCloudOS，与 alan-platform 同机）
# 端口 8202（alan 用 8201，互不冲突）；nginx 新增独立 vhost，不动 geopro.cc 配置。
#
# 在腾讯云控制台网页终端以 root 执行（与 alan 部署同一路径）：
#   git clone --depth 1 https://github.com/yhai3596/convation.git /tmp/conv && bash /tmp/conv/deploy/deploy-convation.sh
# 幂等：可重复执行。完成后站点在 https://convation.it（www 跳转 apex）。
# 前置（已确认）：DNS @ 和 www 的 A 记录指向 43.156.58.154。
# ============================================================================
set -uo pipefail

DOMAIN="convation.it"
APP_DIR="/var/www/convation"
REPO="https://github.com/yhai3596/convation.git"
PORT=8202
SERVICE="convation"
CERT_DIR="/etc/ssl/convation"
WEBROOT="/var/www/convation/public"

log() { echo -e "\n\033[1;33m==> $*\033[0m"; }

# ---------------------------------------------------------------- 0. 系统
log "0/8 检查 root + 装基础包"
[ "$(id -u)" = "0" ] || { echo "请以 root 执行"; exit 1; }
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | grep -oP '\d+' | head -1)" -lt 20 ]; then
  log "安装 Node 20+"
  dnf -y module reset nodejs >/dev/null 2>&1 || true
  dnf -y module enable nodejs:20 >/dev/null 2>&1 || true
  dnf -y install nodejs npm || apt-get update -qq && apt-get install -y nodejs npm || { echo "[ERROR] Node 安装失败"; exit 1; }
fi
command -v nginx >/dev/null 2>&1 || dnf -y install nginx || apt-get install -y nginx
command -v git >/dev/null 2>&1 || dnf -y install git || apt-get install -y git
if ! command -v acme.sh >/dev/null 2>&1; then
  log "安装 acme.sh"
  curl -fsSL https://get.acme.sh | sh -s email=admin@convation.it
  export PATH="$HOME/.acme.sh:$PATH"
fi
echo "node $(node -v) / nginx $(nginx -v 2>&1) / $(command -v acme.sh >/dev/null 2>&1 && echo 'acme.sh ✓' || echo 'acme.sh ✗')"

# ---------------------------------------------------------------- 1. 代码
log "1/8 拉取代码到 ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO}" "${APP_DIR}"
fi

# ---------------------------------------------------------------- 2. 依赖
log "2/8 安装依赖（含字体自托管 postinstall）"
cd "${APP_DIR}"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund || { echo "[ERROR] npm 依赖安装失败"; exit 1; }

# ---------------------------------------------------------------- 3. .env
log "3/8 生成 .env（已存在则保留）"
if [ ! -f "${APP_DIR}/.env" ]; then
  cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=production
PORT=${PORT}
HOST=127.0.0.1
SITE_ORIGIN=https://${DOMAIN}
SESSION_SECRET=$(openssl rand -hex 32)
# 可选增强（填好后 systemctl restart ${SERVICE} 生效）：
# SMTP_HOST=          # 联系表单邮件通知
# SMTP_PORT=465
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=
# MAIL_NOTIFY_TO=info@convation.it
# LLM_BASE=           # AI 助理由 FAQ 升级为生成式
# LLM_KEY=
# LLM_MODEL=
EOF
  echo ".env 已生成（SESSION_SECRET 随机）"
else
  echo ".env 已存在，保留"
fi

# ---------------------------------------------------------------- 4. systemd
log "4/8 配置 systemd 服务 ${SERVICE}.service"
cat > /etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=Convation official site (Italian HVAC)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now ${SERVICE}
sleep 2
systemctl restart ${SERVICE}
sleep 2
if curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" | grep -q 200; then
  echo "应用已监听 127.0.0.1:${PORT}"
else
  echo "[ERROR] 应用未正常启动：journalctl -u ${SERVICE} -n 50"; journalctl -u ${SERVICE} -n 30 --no-pager; exit 1
fi

# ---------------------------------------------------------------- 5. 证书（webroot HTTP-01，两阶段 nginx）
log "5/8 签发证书（${DOMAIN} + www.${DOMAIN}，webroot 模式）"
mkdir -p "${CERT_DIR}" "${WEBROOT}/.well-known/acme-challenge"

# 先放一个仅 80 端口、只服务 acme 挑战的临时 vhost（不动已有站点）
cat > /etc/nginx/conf.d/${SERVICE}-acme.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root ${WEBROOT}; }
    location / { return 301 https://${DOMAIN}\$request_uri; }
}
EOF
nginx -t && nginx -s reload

HAS_CERT=0
if [ -s "${CERT_DIR}/convation.cer" ] && openssl x509 -in "${CERT_DIR}/convation.cer" -noout -text 2>/dev/null | grep -q "DNS:www.${DOMAIN}"; then
  HAS_CERT=1; echo "证书已存在（含 www SAN）"
else
  ~/.acme.sh/acme.sh --issue -d "${DOMAIN}" -d "www.${DOMAIN}" --webroot "${WEBROOT}" --server letsencrypt && \
  ~/.acme.sh/acme.sh --install-cert -d "${DOMAIN}" \
    --fullchain-file "${CERT_DIR}/convation.cer" \
    --key-file "${CERT_DIR}/convation.key" \
    --reloadcmd "nginx -s reload" && HAS_CERT=1
  [ "$HAS_CERT" = "1" ] || echo "[WARN] 证书签发失败，先以 HTTP 提供服务；DNS 生效后重跑本脚本重试"
fi
rm -f /etc/nginx/conf.d/${SERVICE}-acme.conf   # 拆掉临时 acme vhost，由正式 vhost 接管

# ---------------------------------------------------------------- 6. nginx 正式 vhost
log "6/8 配置 nginx 反代"
if [ "$HAS_CERT" = "1" ]; then
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
else
  cat > /etc/nginx/conf.d/${SERVICE}.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
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
fi
nginx -t && nginx -s reload && echo "nginx 已加载 ${DOMAIN} 站点"

# ---------------------------------------------------------------- 7. autopull
log "7/8 autopull（每分钟拉取，代码变更自动重启）"
cat > /usr/local/bin/${SERVICE}-autopull.sh <<EOF
#!/usr/bin/env bash
set -uo pipefail
APP="${APP_DIR}"
cd "\$APP" || exit 0
OLD=\$(git rev-parse HEAD)
git pull --ff-only -q 2>/dev/null || exit 0
NEW=\$(git rev-parse HEAD)
[ "\$OLD" = "\$NEW" ] && exit 0
if ! git diff --quiet "\$OLD" "\$NEW" -- package.json package-lock.json; then npm ci --no-audit --no-fund 2>&1 | tail -1; fi
systemctl restart ${SERVICE}
echo "\$(date) \$OLD → \$NEW" >> /var/log/${SERVICE}-autopull.log
EOF
chmod +x /usr/local/bin/${SERVICE}-autopull.sh
cat > /etc/systemd/system/${SERVICE}-autopull.service <<EOF
[Unit]
Description=Convation auto git pull
[Service]
Type=oneshot
ExecStart=/usr/local/bin/${SERVICE}-autopull.sh
EOF
cat > /etc/systemd/system/${SERVICE}-autopull.timer <<EOF
[Unit]
Description=Run ${SERVICE}-autopull every minute
[Timer]
OnCalendar=*-*-* *:*:00
Persistent=false
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now ${SERVICE}-autopull.timer

# ---------------------------------------------------------------- 8. cron 备份
log "8/8 cron 每日备份（凌晨 4 点）"
( crontab -l 2>/dev/null | grep -v "${SERVICE}-backup" ; echo "0 4 * * * cd ${APP_DIR} && /usr/bin/node scripts/backup-db.js >> /var/log/${SERVICE}-backup.log 2>&1" ) | crontab -

# ---------------------------------------------------------------- 完成
log "部署完成"
echo "站点：$([ "$HAS_CERT" = "1" ] && echo https || echo http)://${DOMAIN}"
echo "服务：systemctl status ${SERVICE} | 日志：journalctl -u ${SERVICE} -f"
echo "自动更新：本地 git push 后 1 分钟内生效（日志 /var/log/${SERVICE}-autopull.log）"
echo "冒烟：cd ${APP_DIR} && node scripts/smoke.js https://${DOMAIN}"
if [ -f "${APP_DIR}/data/admin-credentials.txt" ]; then
  echo; echo "★ 管理员初始账号（请登录后妥善保存/修改）："
  cat "${APP_DIR}/data/admin-credentials.txt"
fi
