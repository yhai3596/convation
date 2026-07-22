// 前台页面渲染（Convation sitemap，DESIGN.md §11 + i18n 双挂载）
// IT：/ 前缀，意语语义 slug；EN：/en 前缀，英语语义 slug（hreflang 互链）
const express = require('express');
const { marked } = require('marked');
const { db } = require('../db');
const siteContent = require('../content');

const router = express.Router();
const SITE = 'Convation';
const ORIGIN = process.env.SITE_ORIGIN || 'https://www.convation.it';

// [itPath, enPath, view, active, titleIt, titleEn]
const PAGES = [
  ['/', '/', 'home', 'home', 'Pompe di calore e climatizzatori', 'Heat pumps & air conditioners'],
  ['/chi-siamo', '/about-us', 'chi-siamo', 'chi-siamo', 'Chi siamo', 'About us'],
  ['/prodotti', '/products', 'prodotti', 'prodotti', 'Prodotti', 'Products'],
  ['/documentazione', '/technical-docs', 'documentazione', 'documentazione', 'Documentazione tecnica', 'Technical documentation'],
  ['/referenze', '/references', 'referenze', 'referenze', 'Referenze', 'References'],
  ['/strumenti', '/hvac-tools', 'strumenti', 'strumenti', 'Strumenti HVAC', 'HVAC tools'],
  ['/detrazioni', '/incentives', 'detrazioni', '', 'Detrazioni e incentivi', 'Incentives & tax deductions'],
  ['/assistenza', '/support', 'assistenza', 'assistenza', 'Assistenza', 'Support'],
  ['/consulenza', '/consultation', 'consulenza', '', 'Consulenza gratuita', 'Free consultation'],
  ['/news', '/news', 'news', '', 'News', 'News'],
  ['/contatti', '/contact', 'contatti', '', 'Contatti', 'Contact us'],
  ['/privacy', '/privacy-policy', 'privacy', '', 'Privacy e cookie policy', 'Privacy & cookie policy'],
];
const itToEn = new Map(PAGES.map(p => [p[0], p[1]]));
const enToIt = new Map(PAGES.map(p => [p[1], p[0]]));

function makeRouter(locale) {
  const r = express.Router();
  const idx = locale === 'en' ? 1 : 0;

  // locale 绑定 + hreflang 互链路径
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
    // 模板跨页链接助手：按当前 locale 解析对侧 slug
    res.locals.link = (itPath) => {
      if (locale === 'it') return itPath;
      const en = itToEn.get(itPath);
      return '/en' + (en || itPath);
    };
    next();
  });

  for (const [itPath, enPath, view, active, titleIt, titleEn] of PAGES) {
    const path = locale === 'en' ? enPath : itPath;
    const title = `${locale === 'en' ? titleEn : titleIt} · ${SITE}`;
    r.get(path === '/' ? '/' : path, (req, res) => res.render(view, { title, active }));
  }

  // 新闻详情（P4 接 posts.locale；当前双语同库渲染）
  r.get('/news/:slug', (req, res) => {
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

module.exports = router;
