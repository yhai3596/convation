// SQLite 数据层：schema + 内容种子（内容来自设计交付稿，可在管理后台维护）
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  source TEXT NOT NULL DEFAULT '直接访问',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '行业观察',
  excerpt TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  read_minutes INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  read_completes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id INTEGER,
  is_agent INTEGER NOT NULL DEFAULT 0,
  agent_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lectures INTEGER,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'live',
  tag TEXT NOT NULL DEFAULT '',
  kicker TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metric_value TEXT NOT NULL DEFAULT '',
  metric_label TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live',
  url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS diagnosis_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  level TEXT NOT NULL,
  spots INTEGER NOT NULL,
  summary TEXT NOT NULL,
  report_json TEXT NOT NULL,
  generator TEXT NOT NULL DEFAULT 'template',
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sid TEXT,
  user_id INTEGER,
  type TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  ref_class TEXT NOT NULL DEFAULT '直接访问',
  meta TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON analytics_events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_sid ON analytics_events(sid);
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expire INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  revoked INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  ok INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON agent_activity(created_at);
-- Convation 产品目录（冷暖双品类，双语字段）
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no INTEGER NOT NULL DEFAULT 0,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'heatpump',
  name_it TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  desc_it TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '',
  specs_json TEXT NOT NULL DEFAULT '{}',
  efficiency TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Convation 技术文档库（PDF，安装工高频）
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_it TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  product_id INTEGER,
  doctype TEXT NOT NULL DEFAULT 'scheda',
  file TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'it',
  version TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  no INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- AI 内容草稿队列（小龙虾/hermes 产出 → 人工审核发布）
CREATE TABLE IF NOT EXISTS ai_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'agent',
  type TEXT NOT NULL DEFAULT 'post',
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON ai_drafts(status, created_at);
`);

// ---------- 增量迁移（线上库为既有 schema，只做加列，幂等） ----------
function addColumn(table, colDef) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch (_) { /* 已存在 */ }
}
addColumn('posts', "created_by TEXT NOT NULL DEFAULT 'admin'");     // admin | ai | agent:<name>
addColumn('posts', "locale TEXT NOT NULL DEFAULT 'it'");            // it | en（新闻分语言运营）
addColumn('comments', 'agent_status TEXT');                          // NULL/pending=待自动处理 replied/skipped=已终态
addColumn('courses', "cover_url TEXT NOT NULL DEFAULT ''");
// 两段式删除：0=正常 1=已归档（前台隐藏、后台可恢复），归档态再删才物理移除。
// 用独立列而非复用 status——courses/tools 的 status 已表示业务态（live=已上线 / coming=筹备中），两者正交。
addColumn('courses', 'archived INTEGER NOT NULL DEFAULT 0');
addColumn('tools', 'archived INTEGER NOT NULL DEFAULT 0');
addColumn('cases', 'archived INTEGER NOT NULL DEFAULT 0');
// Convation 用户角色：role ∈ admin | installer | consumer（register 默认 consumer）；
// status/company/piva 为安装工资质审核预留列（审核流暂缓，DESIGN.md §12）。
addColumn('users', "status TEXT NOT NULL DEFAULT 'active'");         // active | pending（预留）
addColumn('users', "company TEXT NOT NULL DEFAULT ''");              // 安装工公司名（预留）
addColumn('users', "piva TEXT NOT NULL DEFAULT ''");                 // P.IVA 税号（预留）
// 存量评论：已有回复的顶层评论视为已处理，避免 Worker 重复回帖
db.exec(`UPDATE comments SET agent_status='replied'
  WHERE parent_id IS NULL AND agent_status IS NULL
    AND id IN (SELECT DISTINCT parent_id FROM comments WHERE parent_id IS NOT NULL)`);

const getSetting = (k, d = null) => {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k);
  return r ? r.value : d;
};
const setSetting = (k, v) =>
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));

// ---------- 内容种子（Convation 设计稿内容；后续在管理后台维护） ----------
function seedContent() {
  if (db.prepare('SELECT COUNT(*) c FROM posts').get().c > 0) return;

  const insPost = db.prepare(`INSERT INTO posts(slug,title,category,excerpt,content_md,read_minutes,status,published_at,locale)
    VALUES (@slug,@title,@category,@excerpt,@content_md,@read_minutes,'published',@published_at,@locale)`);
  insPost.run({
    slug: 'conto-termico-3-guida',
    title: 'Conto Termico 3.0: come funziona e quanto puoi ottenere',
    category: 'Incentivi',
    excerpt: 'La guida chiara al principale incentivo per le pompe di calore: requisiti, percentuali, tempi di erogazione e errori da evitare.',
    content_md: [
      'Il Conto Termico 3.0 è oggi il modo più rapido per recuperare buona parte dell’investimento in una pompa di calore. In questa guida riassumiamo quello che serve sapere prima di partire.',
      '',
      '## Chi può accedere',
      '',
      'Privati, condomini e imprese che sostituiscono un generatore a combustibile fossile con una pompa di calore nuova. L’incentivo si calcola sulla potenza e sull’efficienza del nuovo generatore.',
      '',
      '## Quanto si ottiene',
      '',
      'Fino al 65% della spesa ammissibile, erogato dal GSE in 2-5 rate annuali. La pratica si presenta entro 90 giorni dalla fine lavori.',
      '',
      '## Gli errori più comuni',
      '',
      'Generatore non in elenco, documentazione incompleta, mancata registrazione ENEA. Per questo accompagniamo ogni cliente nella verifica di fattibilità prima dell’installazione.',
    ].join('\n'),
    read_minutes: 6,
    published_at: '2026-07-15',
    locale: 'it',
  });
  insPost.run({
    slug: 'pompa-di-calore-o-caldaia',
    title: 'Pompa di calore o caldaia a condensazione: il confronto onesto',
    category: 'Guide',
    excerpt: 'Costi, consumi, comfort e incentivi a confronto. Quando conviene l’una e quando ha ancora senso l’altra.',
    content_md: 'Costo iniziale, costo annuale in bolletta, comfort d’uso e accesso agli incentivi: mettiamo in fila i numeri reali di un appartamento di 100 m².\n\n> Articolo in completamento — modificabile dal pannello di amministrazione.',
    read_minutes: 8,
    published_at: '2026-07-05',
    locale: 'it',
  });
  insPost.run({
    slug: 'f-gas-2026-cosa-cambia',
    title: 'Normativa F-Gas 2026: cosa cambia per climatizzatori e installatori',
    category: 'Normativa',
    excerpt: 'Refrigeranti A2L, obblighi di certificazione e scorte: quello che tecnici e clienti devono sapere quest’anno.',
    content_md: 'La transizione ai refrigeranti a basso GWP entra nel vivo: cosa significa per i nuovi climatizzatori R32/A2L e per chi li installa.\n\n> Articolo in completamento — modificabile dal pannello di amministrazione.',
    read_minutes: 5,
    published_at: '2026-06-20',
    locale: 'it',
  });
  insPost.run({
    slug: 'heat-pump-incentives-italy-2026',
    title: 'Heat pump incentives in Italy: a 2026 practical guide',
    category: 'Incentives',
    excerpt: 'Conto Termico 3.0 and 50% deductions explained for international homeowners and installers working in Italy.',
    content_md: 'A practical English overview of the main Italian incentives for heat pumps and air conditioning upgrades.\n\n> Article in progress — editable from the admin panel.',
    read_minutes: 7,
    published_at: '2026-07-10',
    locale: 'en',
  });

  const insTool = db.prepare('INSERT INTO tools(no,name,description,status,url) VALUES (?,?,?,?,?)');
  const TOOLS = [
    ['Refrigerant Properties', 'Proprietà di 12 refrigeranti a qualsiasi stato T-P, tabelle di saturazione e glide.', 'https://hvac.geopro.cc/refprops.html'],
    ['P-h Cycle Calculator', 'Ciclo frigorifero: COP, capacità, temperatura di mandata e diagramma P-h.', 'https://hvac.geopro.cc/phcalc.html'],
    ['Psychrometrics', 'Aria umida: bulbo secco/umido, UR, punto di rugiada, entalpia.', 'https://hvac.geopro.cc/psychro.html'],
    ['Hydronic Design', 'Perdite di carico tubazioni, dimensionamento pompe, verifica EC(H)R.', 'https://hvac.geopro.cc/hydronic.html'],
    ['Duct Size & Loss', 'Dimensionamento canali a pari attrito e pressione statica totale.', 'https://hvac.geopro.cc/duct.html'],
    ['Annual Energy & Cost', 'Stima kWh/anno e costi da SEER2/HSPF2, confronto tra due modelli.', 'https://hvac.geopro.cc/energy.html'],
    ['Unit Converter', 'Conversione unità US/metriche: pressione, portata, potenza, energia.', 'https://hvac.geopro.cc/units.html'],
    ['Inverter System Simulation', 'Simulazione pompa di calore inverter con diagramma P-h animato.', 'https://hvac.geopro.cc/sim.html'],
    ['A2L & EPA 608 Quiz', 'Quiz di autovalutazione su refrigeranti A2L e normativa EPA 608.', 'https://hvac.geopro.cc/quiz.html'],
  ];
  TOOLS.forEach((t, i) => insTool.run(i + 1, t[0], t[1], 'live', t[2]));

  const insProduct = db.prepare(`INSERT INTO products(no,slug,category,name_it,name_en,desc_it,desc_en,specs_json,efficiency)
    VALUES (@no,@slug,@category,@name_it,@name_en,@desc_it,@desc_en,@specs_json,@efficiency)`);
  insProduct.run({
    no: 1, slug: 'cv-therma-8', category: 'heatpump',
    name_it: 'Convation THERMA 8', name_en: 'Convation THERMA 8',
    desc_it: 'Pompa di calore aria-acqua monoblocco da 8 kW per ville unifamiliari. Riscaldamento, raffrescamento e ACS fino a 60 °C.',
    desc_en: '8 kW monobloc air-to-water heat pump for detached homes. Heating, cooling and DHW up to 60 °C.',
    specs_json: JSON.stringify({ 'Potenza termica': '8,0 kW', 'Refrigerante': 'R290', 'COP (A7/W35)': '4,9', 'Alimentazione': '230V monofase', 'Rumorosità': '42 dB(A) a 1 m' }),
    efficiency: 'A+++',
  });
  insProduct.run({
    no: 2, slug: 'cv-therma-16t', category: 'heatpump',
    name_it: 'Convation THERMA 16T', name_en: 'Convation THERMA 16T',
    desc_it: 'Trifase da 16 kW per edifici grandi e piccole attività commerciali. Cascata fino a 4 unità.',
    desc_en: 'Three-phase 16 kW unit for large buildings and small businesses. Cascade up to 4 units.',
    specs_json: JSON.stringify({ 'Potenza termica': '16,0 kW', 'Refrigerante': 'R290', 'COP (A7/W35)': '4,7', 'Alimentazione': '400V trifase', 'Cascata': 'fino a 4 unità' }),
    efficiency: 'A+++',
  });
  insProduct.run({
    no: 3, slug: 'cv-aria-35', category: 'ac',
    name_it: 'Convation ARIA 35', name_en: 'Convation ARIA 35',
    desc_it: 'Climatizzatore split inverter 3,5 kW (12.000 BTU) con Wi-Fi integrato e filtro antipolline.',
    desc_en: '3.5 kW (12,000 BTU) inverter split air conditioner with built-in Wi-Fi and pollen filter.',
    specs_json: JSON.stringify({ 'Potenza freddo': '3,5 kW', 'Refrigerante': 'R32', 'SEER': '8,5', 'Alimentazione': '230V monofase', 'Rumorosità interna': '19 dB(A)' }),
    efficiency: 'A++',
  });
  insProduct.run({
    no: 4, slug: 'cv-aria-multi-2x25', category: 'ac',
    name_it: 'Convation ARIA DUAL 2×2,5', name_en: 'Convation ARIA DUAL 2×2.5',
    desc_it: 'Dual split 2×2,5 kW con una sola unità esterna: due stanze, un ingombro.',
    desc_en: '2×2.5 kW dual split with a single outdoor unit: two rooms, one footprint.',
    specs_json: JSON.stringify({ 'Potenza freddo': '2×2,5 kW', 'Refrigerante': 'R32', 'SEER': '7,8', 'Unità esterne': '1', 'Rumorosità interna': '20 dB(A)' }),
    efficiency: 'A++',
  });

  const insCase = db.prepare('INSERT INTO cases(org,title,description,metric_value,metric_label,sort) VALUES (?,?,?,?,?,?)');
  insCase.run('Villa unifamiliare · Monza (MB)', 'Caldaia a gas → THERMA 8 con Conto Termico',
    'Sostituzione caldaia a gas del 2008 con pompa di calore da 8 kW e radiatori esistenti. Pratica GSE gestita dal nostro team.', '-52%', 'spesa annuale riscaldamento', 1);
  insCase.run('Condominio 12 unità · Bergamo (BG)', 'Climatizzazione estiva multi-appartamento',
    'Installazione di 12 split ARIA 35 in 6 settimane, con pratiche condominiali e detrazione 50%.', 'A++', 'classe energetica media', 2);
  insCase.run('Agriturismo · Langhe (CN)', 'Riscaldamento e ACS con THERMA 16T',
    'Pompa di calore trifase per 280 m² di struttura ricettiva: riscaldamento a pavimento e acqua calda per 8 camere.', '24/7', 'monitoraggio e assistenza', 3);

  if (getSetting('agent_autoreply') === null) setSetting('agent_autoreply', '1');
}

// 运行配置默认值（每次启动补齐缺失项，不覆盖已有值）
function seedDefaults() {
  const defaults = {
    agent_autoreply: '1',        // 评论自动回复（用户决策：自动）
    agent_content_review: '1',   // Agent/AI 产出内容走草稿审核（用户决策：审核制）
    agent_scan_interval_min: '5' // Worker 巡检间隔（分钟）
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (getSetting(k) === null) setSetting(k, v);
  }
}

// ---------- 管理员种子 ----------
function seedAdmin() {
  if (db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin'").get().c > 0) return;
  const email = process.env.ADMIN_EMAIL || 'admin@convation.it';
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) { password = crypto.randomBytes(9).toString('base64url'); generated = true; }
  db.prepare("INSERT INTO users(email,name,password_hash,role) VALUES (?,?,?,'admin')")
    .run(email, 'Admin', bcrypt.hashSync(password, 10));
  if (generated) {
    const credFile = path.join(DATA_DIR, 'admin-credentials.txt');
    fs.writeFileSync(credFile, `管理员账号（首次启动自动生成，请尽快登录后妥善保存/修改）\nemail: ${email}\npassword: ${password}\n`);
    console.log(`[seed] 管理员已创建：${email}（初始密码见 ${credFile}）`);
  } else {
    console.log(`[seed] 管理员已创建：${email}（密码来自 ADMIN_PASSWORD 环境变量）`);
  }
}

// ---------- 演示数据（仅本地验证用：SEED_DEMO=1；生产不启用） ----------
function seedDemo() {
  if (process.env.SEED_DEMO !== '1') return;
  if (getSetting('demo_seeded') === '1') return;

  const demoUsers = [
    ['wang@hvac-co.cn', '王工', '搜索引擎', 3],
    ['li.chen@example.com', 'Li Chen', 'LinkedIn / 其他', 5],
    ['zhang@manufact.cn', '张经理', '微信 / 公众号', 9],
    ['liu@coolsys.cn', '刘工', '直接访问', 17],
    ['amy@nagroup.com', 'Amy Zhou', '搜索引擎', 25],
  ];
  const insUser = db.prepare(`INSERT INTO users(email,name,password_hash,role,source,created_at)
    VALUES (?,?,?,'member',?,datetime('now','-'||?||' days'))`);
  const pw = bcrypt.hashSync('demo12345', 10);
  const userIds = {};
  for (const [email, name, source, daysAgo] of demoUsers) {
    const r = insUser.run(email, name, pw, source, daysAgo);
    userIds[name] = r.lastInsertRowid;
  }

  // 设计稿文章页的示例评论（含 Agent 自动回复示例）
  const post = db.prepare('SELECT id FROM posts WHERE slug=?').get('conto-termico-3-guida');
  if (post) {
    const insC = db.prepare(`INSERT INTO comments(post_id,user_id,author_name,body,parent_id,is_agent,agent_label,created_at)
      VALUES (?,?,?,?,?,?,?,datetime('now','-'||?||' days'))`);
    const c1 = insC.run(post.id, userIds['王工'], 'Marco B.',
      'Guida molto chiara. Per un condominio di 8 unità serve la pratica unica o una per unità? Grazie.', null, 0, null, 6);
    insC.run(post.id, null, 'Convation',
      'Dipende dall’impianto: con centrale termica comune la pratica è unica a nome del condominio; con generatori autonomi ogni unità presenta la sua. Contattaci per una verifica gratuita.', c1.lastInsertRowid, 1, 'AI 自动回复 · via 小龙虾', 6);
    const c2 = insC.run(post.id, userIds['Amy Zhou'], 'Giulia R.',
      'Finalmente una spiegazione senza tecnicismi. Condivisa con il mio installatore.', null, 0, null, 5);
    insC.run(post.id, null, 'Convation', 'Grazie Giulia! Il prossimo articolo sarà proprio sulla scelta tra Conto Termico e detrazione 50%.', c2.lastInsertRowid, 0, '官方回复', 4);
  }

  // 30 天内的模拟访问事件，让看板可视化有数据
  const insEvt = db.prepare(`INSERT INTO analytics_events(sid,user_id,type,path,ref_class,meta,created_at)
    VALUES (?,?,?,?,?,?,datetime('now','-'||?||' minutes'))`);
  const paths = ['/', '/', '/', '/prodotti', '/prodotti', '/strumenti', '/detrazioni', '/news/conto-termico-3-guida', '/referenze', '/chi-siamo', '/consulenza', '/login'];
  const refs = ['搜索引擎', '搜索引擎', '搜索引擎', '搜索引擎', '社交媒体', '社交媒体', '直接访问', '直接访问', 'AI 引擎引用'];
  const toolNames = ['Refrigerant Properties', 'P-h Cycle Calculator', 'Psychrometrics', 'Hydronic Design', 'Annual Energy & Cost', 'Unit Converter'];
  const seedEvents = db.transaction(() => {
    for (let d = 29; d >= 0; d--) {
      const sessions = 6 + Math.floor(Math.random() * 6) + Math.floor((29 - d) / 4);
      for (let s = 0; s < sessions; s++) {
        const sid = `demo-${d}-${s}`;
        const ref = refs[Math.floor(Math.random() * refs.length)];
        const nPages = 1 + Math.floor(Math.random() * 4);
        for (let p = 0; p < nPages; p++) {
          const minutesAgo = d * 1440 + Math.floor(Math.random() * 1200);
          insEvt.run(sid, null, 'pageview', paths[Math.floor(Math.random() * paths.length)], ref, '', minutesAgo);
        }
        if (Math.random() < 0.35) {
          const minutesAgo = d * 1440 + Math.floor(Math.random() * 1200);
          insEvt.run(sid, null, 'tool_click', '/strumenti', ref, toolNames[Math.floor(Math.random() * toolNames.length)], minutesAgo);
        }
        if (Math.random() < 0.08) insEvt.run(sid, null, 'register', '/login', ref, '', d * 1440 + 60);
        if (Math.random() < 0.5) {
          insEvt.run(sid, null, 'read_complete', '/news/conto-termico-3-guida', ref, 'conto-termico-3-guida', d * 1440 + 20);
        }
      }
    }
  });
  seedEvents();
  db.prepare("UPDATE posts SET views = views + abs(random() % 900) + 300 WHERE status='published'").run();
  db.prepare("UPDATE posts SET read_completes = views * (55 + abs(random() % 20)) / 100 WHERE status='published'").run();

  setSetting('demo_seeded', '1');
  console.log('[seed] 演示数据已注入（SEED_DEMO=1，仅用于本地验证）');
}

seedContent();
seedDefaults();
seedAdmin();
seedDemo();

module.exports = { db, getSetting, setSetting };
