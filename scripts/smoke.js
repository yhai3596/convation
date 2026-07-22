// 冒烟测试：对运行中的 Convation 实例做页面与 API 健康检查（部署后回归）
// 用法：node scripts/smoke.js [baseUrl]，默认 http://127.0.0.1:8202
const BASE = process.argv[2] || 'http://127.0.0.1:8202';

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
async function get(p, expect = 200) {
  const r = await fetch(BASE + p, { redirect: 'manual' }).catch(() => null);
  return { status: r ? r.status : 0, ok: !!r && r.status === expect, r };
}

(async () => {
  // 前台 IT 路由
  const itPages = ['/', '/chi-siamo', '/prodotti', '/documentazione', '/referenze', '/strumenti', '/detrazioni', '/assistenza', '/consulenza', '/news', '/contatti', '/privacy'];
  for (const p of itPages) {
    const r = await get(p);
    check(`IT GET ${p}`, r.ok, r.status ? String(r.status) : 'no response');
  }
  // 前台 EN 路由（抽样）
  const enPages = ['/en', '/en/products', '/en/hvac-tools', '/en/incentives', '/en/news', '/en/contact'];
  for (const p of enPages) {
    const r = await get(p);
    check(`EN GET ${p}`, r.ok, r.status ? String(r.status) : 'no response');
  }
  // 产品详情 + 新闻详情（从 DB 动态）
  const prod = await get('/prodotti/cv-therma-8');
  check('产品详情 /prodotti/cv-therma-8', prod.ok, prod.status ? String(prod.status) : '');
  const art = await get('/news/conto-termico-3-guida');
  check('新闻详情 /news/conto-termino-3-guida', art.ok, art.status ? String(art.status) : '');

  // 鉴权门控
  const admin = await get('/admin', 302);
  check('GET /admin 未登录 → 302', admin.ok);
  const reserved = await get('/area-riservata', 302);
  check('GET /area-riservata 未登录 → 302', reserved.ok);

  // 404
  const nf = await get('/definitely-not-a-page', 404);
  check('404 页面', nf.ok);

  // API
  const assist = await fetch(BASE + '/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Come funziona il Conto Termico?', locale: 'it' }),
  }).then(r => r.json()).catch(() => null);
  check('POST /api/assistant', !!assist && assist.ok && !!assist.reply, assist && assist.via ? `via=${assist.via}` : '');

  const msg = await fetch(BASE + '/api/message', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke', email: 'smoke@test.local', body: '冒烟测试留言' }),
  }).then(r => r.json()).catch(() => null);
  check('POST /api/message', !!msg && msg.ok);

  // SEO 资产
  const sitemap = await get('/sitemap.xml');
  check('GET /sitemap.xml 200', sitemap.ok);
  const robots = await get('/robots.txt');
  check('GET /robots.txt 200', robots.ok);

  // 旧路由应已摘除
  const oldDiag = await get('/diagnosis', 404);
  check('旧 /diagnosis → 404', oldDiag.ok);
  const oldApi = await fetch(BASE + '/api/diagnosis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
  check('旧 /api/diagnosis → 404', !!oldApi && oldApi.status === 404, oldApi ? String(oldApi.status) : '');

  const failed = checks.filter(c => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) { console.log('FAILED:', failed.map(c => c.name).join(', ')); process.exit(1); }
})();
