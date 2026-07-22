# Convation 官网 · 部署手册

> 项目：`E:\AICoding\Euro\convation` · 域名 www.convation.it · 端口 8202
> 栈：Express + EJS + SQLite（fork 自 alan-platform 套件）

## 部署前清单（需 Alan 提供）

- [ ] **服务器 SSH** + root 权限 + Ubuntu/Debian 系统
- [ ] **DNS**：convation.it 的 `@` 和 `www` A 记录指向服务器公网 IP（在域名注册商后台设置）
- [ ] **GitHub 仓库**：把本地 `E:\AICoding\Euro\convation` 推到 GitHub（public 或 private+deploy key）
- [ ] **logo SVG**（可选，当前用 logo.jpg 位图）
- [ ] **SMTP**（可选，配置后联系表单自动邮件通知 info@convation.it）
- [ ] **LLM API key**（可选，配置后 AI 助理从 FAQ 升级为生成式）

## 一键部署（服务器上执行）

以 root 在服务器控制台执行：

```bash
curl -fsSL https://raw.githubusercontent.com/yhai3596/convation/main/deploy/deploy-convation.sh | bash
```
（仓库为 private：服务器需先放 deploy key 才能匿名 pull；或临时改 public）

脚本会自动完成：装 Node 20 + nginx + acme.sh → 克隆仓库 → npm ci → 生成 .env（含随机 SESSION_SECRET）→ systemd 服务（监听 127.0.0.1:8202）→ 签 TLS 证书 → nginx 443 反代 → autopull 每分钟定时器 → cron 每日备份。

完成后：
- 站点：`https://www.convation.it`
- 管理后台：`https://www.convation.it/admin`（初始密码在服务器 `data/admin-credentials.txt`，登录后请改）
- 改代码：本地 `git push` → 1 分钟内 autopull 自动上线

## 部署后配置（后台）

登录 `/admin` → 「Agent 自动化」页签：
1. 添加 LLM provider（OpenAI 兼容）→ 测试连接 → AI 助理升级
2. 创建 Agent API token（给小龙虾/hermes 用）→ 复制保存（只显示一次）
3. 「页面内容」页签按语言编辑前台文案（IT/EN 双语）
4. 「内容管理」增删产品/文档/工具/案例/文章

## 运维

| 操作 | 命令 |
|---|---|
| 看日志 | `journalctl -u convation -f` |
| 重启 | `systemctl restart convation` |
| 手动备份 | `cd /var/www/convation && node scripts/backup-db.js` |
| 恢复 | 停服 → 删 app.db* → 备份文件复制为 app.db → 启动 |
| 跑冒烟 | `node scripts/smoke.js https://www.convation.it` |
| 看 autopull 日志 | `tail -f /var/log/convation-autopull.log` |

## 已知待办（非阻塞上线）

- 安装工资质审核流（users 表已预留 status/company/piva 列，后台审批 UI 后续补）
- 工具站 hvac.geopro.cc 英文界面 → 后续评估意大利语化
- 旧 alan 视图孤儿文件（about/services/courses/diagnosis.ejs 等）未删，不影响运行，可择期清理
- 保留的旧字体包（cormorant-garamond/lora/noto-serif-sc）未从 package.json 移除（绕开 npm 删除被拒），不影响运行
