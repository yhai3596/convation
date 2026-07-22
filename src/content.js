// 站点文案键值层（i18n 版）：def = { it, en }；site_content 覆盖键 = `${key}.${locale}`。
// 解析链：override[locale] → def[locale] → def.it（套件 02 册 D4 + Convation i18n 扩展）。
// 默认值即设计稿文案——site_content 无记录时站点与设计稿完全一致；后台改哪条哪条生效。
const { db } = require('./db');

const REGISTRY = [
  ...require('./content-keys-a'),
  ...require('./content-keys-b'),
  ...require('./content-keys-c'),
];

const LOCALES = ['it', 'en'];
const DEFAULT_LOCALE = 'it';

const byKey = new Map(REGISTRY.map(r => [r.key, r]));
const stGet = db.prepare('SELECT value FROM site_content WHERE key=?');
const stSet = db.prepare("INSERT INTO site_content(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at");
const stDel = db.prepare('DELETE FROM site_content WHERE key=?');

function normLocale(locale) {
  return LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}
function defOf(key, locale) {
  const def = byKey.get(key);
  if (!def) return '';
  const d = def.def;
  if (d && typeof d === 'object') return d[locale] || d.it || '';
  return d || '';
}
function raw(key, locale = DEFAULT_LOCALE) {
  const loc = normLocale(locale);
  const row = stGet.get(`${key}.${loc}`);
  if (row && row.value !== '') return row.value;
  return defOf(key, loc);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
// 模板助手：ct=转义文本 ctBr=转义+换行转<br> ctImg=图片路径（仅站内路径）
const makeCt = locale => key => esc(raw(key, locale));
const makeCtBr = locale => key => esc(raw(key, locale)).replace(/\r?\n/g, '<br>');
const makeCtImg = locale => key => {
  const v = raw(key, locale);
  return /^\/(uploads|assets)\/[\w\-./]+$/.test(v) ? v : '';
};
function forLocale(locale) {
  const loc = normLocale(locale);
  return { locale: loc, ct: makeCt(loc), ctBr: makeCtBr(loc), ctImg: makeCtImg(loc) };
}
// 兼容默认（意语）
const ct = makeCt(DEFAULT_LOCALE);
const ctBr = makeCtBr(DEFAULT_LOCALE);
const ctImg = makeCtImg(DEFAULT_LOCALE);

function listForAdmin(locale = DEFAULT_LOCALE) {
  const loc = normLocale(locale);
  return REGISTRY.map(r => {
    const row = stGet.get(`${r.key}.${loc}`);
    return { key: r.key, group: r.group, label: r.label, type: r.type, def: defOf(r.key, loc), value: row ? row.value : '', overridden: !!row };
  });
}
function save(key, value, locale = DEFAULT_LOCALE) {
  if (!byKey.has(key)) throw new Error(`未知内容键：${key}`);
  const loc = normLocale(locale);
  const v = String(value);
  if (v.includes('�')) throw new Error('内容包含无效字符（编码损坏），已拒绝保存'); // 防脏字节入库
  if (v === '' || v === defOf(key, loc)) stDel.run(`${key}.${loc}`); // 清空/等于默认 = 撤销覆盖
  else stSet.run(`${key}.${loc}`, v);
}

module.exports = { REGISTRY, LOCALES, DEFAULT_LOCALE, raw, ct, ctBr, ctImg, forLocale, listForAdmin, save };
