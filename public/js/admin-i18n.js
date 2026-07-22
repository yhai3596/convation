// 后台界面语言切换（EN/中文），localStorage 记忆，默认中文。
(function () {
  var KEY = 'convation-admin-lang';
  var DICT = {
    zh: { dash: '数据看板', content: '内容管理', pages: '页面内容', agent: '智能助理', users: '用户管理', back: '← 返回前台', logout: '退出登录', langBtn: 'EN' },
    en: { dash: 'Dashboard', content: 'Content', pages: 'Page copy', agent: 'AI agent', users: 'Users', back: '← Back to site', logout: 'Sign out', langBtn: '中文' },
  };
  function cur() { try { return localStorage.getItem(KEY) || 'zh'; } catch (e) { return 'zh'; } }
  function apply(lang) {
    var d = DICT[lang] || DICT.zh;
    document.querySelectorAll('[data-i18n-admin]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-admin');
      if (d[k] && el.firstChild) el.firstChild.textContent = d[k] + ' ';
    });
    var back = document.getElementById('admin-back');
    if (back) back.textContent = d.back;
    var out = document.getElementById('nav-logout');
    if (out) out.textContent = d.logout;
    var btn = document.getElementById('admin-lang-toggle');
    if (btn) btn.textContent = d.langBtn;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* noop */ }
  }
  document.addEventListener('DOMContentLoaded', function () {
    apply(cur());
    var btn = document.getElementById('admin-lang-toggle');
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); apply(cur() === 'zh' ? 'en' : 'zh'); });
  });
  window.AdminI18n = { apply: apply, current: cur };
})();
