// 前台页面渲染（Convation sitemap + i18n 双挂载 + 内容查库渲染）
// IT：/ 前缀；EN：/en 前缀（各自语义 slug，hreflang 互链）
const express = require('express');
const { marked } = require('marked');
const { db } = require('../db');
const siteContent = require('../content');

const router = express.Router();
const SITE = 'Convation';
const ORIGIN = process.env.SITE_ORIGIN || 'https://www.convation.it';

// [itPath, enPath, view, active, titleIt, titleEn] —— 纯静态页（REGISTRY 文案）
const PAGES = [
  ['/', '/', 'home', 'home', 'Pompe di calore e climatizzatori', 'Heat pumps & air conditioners'],
  ['/chi-siamo', '/about-us', 'chi-siamo', 'chi-siamo', 'Chi siamo', 'About us'],
  ['/detrazioni', '/incentives', 'detrazioni', '', 'Detrazioni e incentivi', 'Incentives & tax deductions'],
  ['/assistenza', '/support', 'assistenza', 'assistenza', 'Assistenza', 'Support'],
  ['/consulenza', '/consultation', 'consulenza', '', 'Consulenza gratuita', 'Free consultation'],
  ['/contatti', '/contact', 'contatti', '', 'Contatti', 'Contact us'],
  ['/privacy', '/privacy-policy', 'privacy', '', 'Privacy e cookie policy', 'Privacy & cookie policy'],
];
// 语义 slug 对照（含数据页，供 hreflang/link() 使用）
const SLUGS = [
  ...PAGES,
  ['/prodotti', '/products'],
  ['/documentazione', '/technical-docs'],
  ['/referenze', '/references'],
  ['/strumenti', '/hvac-tools'],
  ['/news', '/news'],
  ['/login', '/login'],
];
const itToEn = new Map(SLUGS.map(p => [p[0], p[1]]));
const enToIt = new Map(SLUGS.map(p => [p[1], p[0]]));

function makeRouter(locale) {
  const r = express.Router();
  const idx = locale === 'en' ? 1 : 0;

  r.use((req, res, next) => {
    const loc = siteContent.forLocale(locale);
    res.locals.locale = loc.locale;
    res.locals.ct = loc.ct;
    res.locals.ctBr = loc.ctBr;
    res.locals.ctImg = loc.ctImg;
    const sub = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
    const altSub = locale === 'en' ? (enToIt.get(sub) || null) : (itToEn.get(sub) || null);
    res.locals.pathIt = locale === 'it' ? sub : (altSub || '/');
    res.locals.pathEn = locale === 'en' ? sub : (altSub || '/');
    res.locals.hrefIt = ORIGIN + res.locals.pathIt;
    res.locals.hrefEn = ORIGIN + '/en' + (res.locals.pathEn === '/' ? '' : res.locals.pathEn);
    res.locals.urlprefix = locale === 'en' ? '/en' : '';
    res.locals.link = (itPath) => {
      if (locale === 'it') return itPath;
      const en = itToEn.get(itPath);
      return '/en' + (en || itPath);
    };
    next();
  });

  const pathOf = (itPath) => (locale === 'en' ? (itToEn.get(itPath) || itPath) : itPath);

  // —— 纯静态页 ——
  for (const [itPath, enPath, view, active, titleIt, titleEn] of PAGES) {
    const title = `${locale === 'en' ? titleEn : titleIt} · ${SITE}`;
    r.get(locale === 'en' ? enPath : itPath, (req, res) => {
      if (view === 'home') {
        const posts = db.prepare("SELECT * FROM posts WHERE status='published' AND locale=? ORDER BY published_at DESC LIMIT 3").all(locale);
        return res.render(view, { title, active, posts });
      }
      res.render(view, { title, active });
    });
  }

  // —— 产品列表 ——
  r.get(pathOf('/prodotti'), (req, res) => {
    const products = db.prepare('SELECT * FROM products WHERE archived=0 ORDER BY category, no').all();
    res.render('prodotti', {
      title: `${locale === 'en' ? 'Products' : 'Prodotti'} · ${SITE}`,
      active: 'prodotti',
      products,
    });
  });

  // —— 产品详情 ——
  r.get(pathOf('/prodotti') + '/:slug', (req, res) => {
    const p = db.prepare('SELECT * FROM products WHERE slug=? AND archived=0').get(req.params.slug);
    if (!p) return res.status(404).render('404', { title: 'Pagina non trovata', active: '' });
    let specs = [];
    try { specs = Object.entries(JSON.parse(p.specs_json || '{}')); } catch (_) { specs = []; }
    const docs = db.prepare('SELECT * FROM documents WHERE product_id=? AND archived=0 ORDER BY no').all(p.id);
    res.render('prodotto', {
      title: `${locale === 'en' && p.name_en ? p.name_en : p.name_it} · ${SITE}`,
      active: 'prodotti',
      p, specs, docs,
    });
  });

  // —— 技术文档 ——
  r.get(pathOf('/documentazione'), (req, res) => {
    const documents = db.prepare('SELECT * FROM documents WHERE archived=0 ORDER BY doctype, no').all();
    res.render('documentazione', {
      title: `${locale === 'en' ? 'Technical documentation' : 'Documentazione tecnica'} · ${SITE}`,
      active: 'documentazione',
      documents,
    });
  });

  // —— 案例 ——
  r.get(pathOf('/referenze'), (req, res) => {
    const cases = db.prepare('SELECT * FROM cases WHERE archived=0 ORDER BY sort').all();
    res.render('referenze', {
      title: `${locale === 'en' ? 'References' : 'Referenze'} · ${SITE}`,
      active: 'referenze',
      cases,
    });
  });

  // —— 工具 ——
  r.get(pathOf('/strumenti'), (req, res) => {
    const tools = db.prepare('SELECT * FROM tools WHERE archived=0 ORDER BY no').all();
    res.render('strumenti', {
      title: `${locale === 'en' ? 'HVAC tools' : 'Strumenti HVAC'} · ${SITE}`,
      active: 'strumenti',
      tools,
    });
  });

  // —— 工具嵌入页（iframe 直链 hvac.geopro.cc） ——
  r.get(pathOf('/strumenti') + '/:id', (req, res) => {
    const t = db.prepare('SELECT * FROM tools WHERE id=? AND archived=0').get(Number(req.params.id));
    if (!t || !t.url) return res.status(404).render('404', { title: 'Pagina non trovata', active: '' });
    res.render('strumento-embed', {
      title: `${t.name} · ${SITE}`,
      active: 'strumenti',
      t,
    });
  });

  // —— 新闻列表（按 locale 过滤） ——
  r.get(pathOf('/news'), (req, res) => {
    const posts = db.prepare("SELECT * FROM posts WHERE status='published' AND locale=? ORDER BY published_at DESC").all(locale);
    res.render('news', {
      title: `News · ${SITE}`,
      active: '',
      posts,
    });
  });

  // —— 新闻详情 ——
  r.get(pathOf('/news') + '/:slug', (req, res) => {
    const post = db.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").get(req.params.slug);
    if (!post) return res.status(404).render('404', { title: 'Pagina non trovata', active: '' });
    db.prepare('UPDATE posts SET views = views + 1 WHERE id=?').run(post.id);
    post.views += 1;
    const all = db.prepare('SELECT * FROM comments WHERE post_id=? ORDER BY created_at, id').all(post.id);
    const comments = all.filter(c => !c.parent_id).map(c => ({ ...c, replies: all.filter(r => r.parent_id === c.id) }));
    res.render('article', {
      title: `${post.title} · ${SITE}`,
      active: '',
      post,
      contentHtml: marked.parse(post.content_md || ''),
      comments,
      commentCount: all.filter(c => !c.parent_id).length,
    });
  });

  r.get('/login', (req, res) => {
    if (res.locals.user) return res.redirect(req.query.next || res.locals.urlprefix + '/');
    res.render('login', { title: `Area Riservata · ${SITE}`, active: '', next: req.query.next || res.locals.urlprefix + '/' });
  });

  // Area Riservata：登录门槛 + 角色占位页（安装工功能后续阶段填充）
  const raPath = locale === 'en' ? '/reserved-area' : '/area-riservata';
  r.get(raPath, (req, res) => {
    if (!res.locals.user) return res.redirect(`${res.locals.urlprefix}/login?next=${raPath}`);
    res.render('area-riservata', {
      title: `${locale === 'en' ? 'Reserved Area' : 'Area Riservata'} · ${SITE}`,
      active: '',
    });
  });

  return r;
}

router.use('/', makeRouter('it'));
router.use('/en', makeRouter('en'));

// Agent API 文档（管理员，渲染 docs/AGENT_API.md）
router.get('/docs/agent-api', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login?next=/docs/agent-api');
  const fs = require('fs');
  const path = require('path');
  let html = '<p>文档缺失。</p>';
  try { html = marked.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'AGENT_API.md'), 'utf8')); } catch (e) { /* noop */ }
  res.render('doc', { title: `Agent API 文档 · ${SITE}`, active: '', contentHtml: html });
});

// —— SEO：sitemap.xml（IT + EN 全页 + 产品 + 已发布新闻） ——
router.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  const add = (path, altIt, altEn, lastmod, prio) => urls.push(
    `  <url>\n    <loc>${ORIGIN}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>${prio}</priority>${
      altIt ? `\n    <xhtml:link rel="alternate" hreflang="it" href="${ORIGIN}${altIt}"/>` : ''}${
      altEn ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${altEn}"/>` : ''}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${altIt || '/'}"/>\n  </url>`
  );
  // 静态页
  for (const [itPath, enPath] of SLUGS) {
    if (itPath === '/login' || itPath === '/area-riservata') continue;
    add(itPath, itPath, itPath === '/' ? '/en' : '/en' + enPath, today, itPath === '/' ? '1.0' : '0.7');
  }
  // 产品详情
  const products = db.prepare('SELECT slug, updated_at FROM products WHERE archived=0').all();
  for (const p of products) {
    add(`/prodotti/${p.slug}`, `/prodotti/${p.slug}`, `/en/products/${p.slug}`, (p.updated_at || today).slice(0, 10), '0.8');
  }
  // 已发布新闻
  const posts = db.prepare("SELECT slug, locale, published_at FROM posts WHERE status='published'").all();
  for (const p of posts) {
    add(`/news/${p.slug}`, `/news/${p.slug}`, `/en/news/${p.slug}`, (p.published_at || today).slice(0, 10), '0.6');
  }
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`);
});

module.exports = router;
