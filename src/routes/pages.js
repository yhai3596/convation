// 前台页面渲染（Convation sitemap，DESIGN.md §11）
// P1：静态页（REGISTRY 文案）；P4 起各列表页改为查库渲染
const express = require('express');
const { marked } = require('marked');
const { db } = require('../db');

const router = express.Router();

const SITE = 'Convation';

router.get('/', (req, res) => {
  res.render('home', { title: `${SITE} · Pompe di calore e climatizzatori`, active: 'home' });
});

router.get('/chi-siamo', (req, res) => {
  res.render('chi-siamo', { title: `Chi siamo · ${SITE}`, active: 'chi-siamo' });
});

router.get('/prodotti', (req, res) => {
  res.render('prodotti', { title: `Prodotti · ${SITE}`, active: 'prodotti' });
});

router.get('/documentazione', (req, res) => {
  res.render('documentazione', { title: `Documentazione tecnica · ${SITE}`, active: 'documentazione' });
});

router.get('/referenze', (req, res) => {
  res.render('referenze', { title: `Referenze · ${SITE}`, active: 'referenze' });
});

router.get('/strumenti', (req, res) => {
  res.render('strumenti', { title: `Strumenti HVAC · ${SITE}`, active: 'strumenti' });
});

router.get('/detrazioni', (req, res) => {
  res.render('detrazioni', { title: `Detrazioni e incentivi · ${SITE}`, active: '' });
});

router.get('/assistenza', (req, res) => {
  res.render('assistenza', { title: `Assistenza · ${SITE}`, active: 'assistenza' });
});

router.get('/consulenza', (req, res) => {
  res.render('consulenza', { title: `Consulenza gratuita · ${SITE}`, active: '' });
});

router.get('/news', (req, res) => {
  res.render('news', { title: `News · ${SITE}`, active: '' });
});

router.get('/contatti', (req, res) => {
  res.render('contatti', { title: `Contatti · ${SITE}`, active: '' });
});

// 新闻详情（P4 接 posts 表；此处保留路由结构）
router.get('/news/:slug', (req, res) => {
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

router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect(req.query.next || '/');
  res.render('login', { title: `Area Riservata · ${SITE}`, active: '', next: req.query.next || '/' });
});

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
