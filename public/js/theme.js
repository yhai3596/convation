// Convation 单品牌主题：锁定 logo 蓝 + 暖橙 CTA（DESIGN.md §4），不再提供多主题切换。
// 保留 window.AlanTheme API 形状，避免旧页面引用报错。
(function () {
  var PALETTES = {
    'Convation': {
      accent: '#0F4C8C', a700: '#0D4279', a600: '#0F4C8C', a300: '#A3C3E8', a100: '#E9F1FA',
      a2: '#E06B3A', a2700: '#A84620', a2100: '#FDEEE5',
      bg: '#FAFAF8', surface: '#F0EFEA'
    }
  };
  var KEY = 'convation-theme';
  var DEFAULT_NAME = 'Convation';

  function apply(name) {
    if (!PALETTES[name]) name = DEFAULT_NAME;
    var p = PALETTES[name];
    var r = document.documentElement.style;
    r.setProperty('--color-accent', p.accent);
    r.setProperty('--color-accent-700', p.a700);
    r.setProperty('--color-accent-600', p.a600);
    r.setProperty('--color-accent-300', p.a300);
    r.setProperty('--color-accent-100', p.a100);
    r.setProperty('--color-accent-2', p.a2);
    r.setProperty('--color-accent-2-700', p.a2700);
    r.setProperty('--color-accent-2-100', p.a2100);
    r.setProperty('--color-bg', p.bg);
    r.setProperty('--color-surface', p.surface);
    try { localStorage.setItem(KEY, name); } catch (e) { /* 私隐模式 */ }

    var opts = document.querySelectorAll('[data-theme-opt]');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-theme-opt') === name;
      opts[i].classList.toggle('tag-accent', on);
      opts[i].classList.toggle('tag-outline', !on);
    }
  }
  function current() {
    try { return localStorage.getItem(KEY) || DEFAULT_NAME; } catch (e) { return DEFAULT_NAME; }
  }
  window.AlanTheme = { PALETTES: PALETTES, apply: apply, current: current };
  apply(current());
})();
