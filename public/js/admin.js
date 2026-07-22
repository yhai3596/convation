// 后台核心交互：页签切换 + 内容 CRUD 弹窗 + 删除 + 草稿发布 + AI 生成草稿
(function () {
  var DATA = {};
  try { DATA = JSON.parse(document.getElementById('admin-data').textContent); } catch (e) {}
  window.AdminData = DATA;

  // —— 页签 ——
  var TABS = ['dash', 'content', 'pages', 'agent', 'users'];
  var navBtns = document.querySelectorAll('[data-admin-tab]');
  function showTab(name) {
    if (TABS.indexOf(name) < 0) name = 'dash';
    TABS.forEach(function (t) { var el = document.getElementById('tab-' + t); if (el) el.hidden = t !== name; });
    navBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-admin-tab') === name); });
    try { sessionStorage.setItem('alan-admin-tab', name); } catch (e) {}
  }
  navBtns.forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-admin-tab')); }); });
  try { var saved = sessionStorage.getItem('alan-admin-tab'); if (saved) showTab(saved); } catch (e) {}

  // —— 时间窗 ——
  document.querySelectorAll('input[name="range"]').forEach(function (r) {
    r.addEventListener('change', function () { try { sessionStorage.setItem('alan-admin-tab', 'dash'); } catch (e) {} location.href = '/admin?range=' + r.value; });
  });

  // —— 内容筛选 ——
  document.querySelectorAll('[data-content-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-content-filter');
      document.querySelectorAll('[data-content-filter]').forEach(function (c) {
        var on = c === chip; c.classList.toggle('tag-outline', on); c.classList.toggle('tag-neutral', !on);
      });
      document.querySelectorAll('#content-rows tr').forEach(function (tr) { tr.hidden = f !== 'all' && tr.getAttribute('data-ctype') !== f; });
    });
  });

  // —— 编辑弹窗 ——
  var backdrop = document.getElementById('edit-backdrop');
  var fieldsEl = document.getElementById('edit-fields');
  var titleEl = document.getElementById('edit-title');
  var errEl = document.getElementById('edit-error');
  var current = null;

  function field(label, name, value, kind, options) {
    var wrap = document.createElement('div'); wrap.className = 'field';
    var lab = document.createElement('label'); lab.textContent = label; wrap.appendChild(lab);
    var input;
    if (kind === 'textarea') { input = document.createElement('textarea'); input.className = 'input'; input.style.minHeight = name === 'content_md' ? '220px' : '80px'; input.value = value == null ? '' : value; }
    else if (kind === 'select') { input = document.createElement('select'); input.className = 'input'; (options || []).forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (o[0] === String(value)) op.selected = true; input.appendChild(op); }); }
    else { input = document.createElement('input'); input.className = 'input'; input.type = kind || 'text'; input.value = value == null ? '' : value; }
    input.setAttribute('data-field', name); wrap.appendChild(input); return wrap;
  }

  var SCHEMAS = {
    post: function (d) { d = d || { title: '', category: 'Incentivi', excerpt: '', content_md: '', read_minutes: 5, status: 'draft', locale: 'it' }; return [
      field('标题', 'title', d.title), field('分类', 'category', d.category),
      field('摘要', 'excerpt', d.excerpt, 'textarea'), field('正文（Markdown）', 'content_md', d.content_md, 'textarea'),
      field('阅读时长（分钟）', 'read_minutes', d.read_minutes, 'number'),
      field('语言', 'locale', d.locale || 'it', 'select', [['it', '意大利语'], ['en', '英语']]),
      field('状态', 'status', d.status, 'select', [['published', '已发布'], ['draft', '草稿'], ['archived', '已归档']]) ]; },
    product: function (d) { d = d || { slug: '', category: 'heatpump', name_it: '', name_en: '', desc_it: '', desc_en: '', specs_json: '{}', efficiency: '' }; return [
      field('slug（URL 标识，留空自动生成）', 'slug', d.slug),
      field('品类', 'category', d.category, 'select', [['heatpump', '热泵 Pompe di calore'], ['ac', '空调 Climatizzatori']]),
      field('名称（意语）', 'name_it', d.name_it), field('名称（英语）', 'name_en', d.name_en),
      field('描述（意语）', 'desc_it', d.desc_it, 'textarea'), field('描述（英语）', 'desc_en', d.desc_en, 'textarea'),
      field('参数 JSON（如 {"Potenza":"8 kW"}）', 'specs_json', d.specs_json, 'textarea'),
      field('能效等级（如 A+++）', 'efficiency', d.efficiency) ]; },
    document: function (d) { d = d || { title_it: '', title_en: '', product_id: '', doctype: 'scheda', file: '', lang: 'it', version: '', size: '' }; return [
      field('标题（意语）', 'title_it', d.title_it), field('标题（英语）', 'title_en', d.title_en),
      field('关联产品 ID（可空）', 'product_id', d.product_id, 'number'),
      field('类型', 'doctype', d.doctype, 'select', [['scheda', 'Scheda 技术表'], ['manuale', 'Manuale 手册'], ['cert', 'Certificazione 认证'], ['dichiarazione', 'Dichiarazione 符合性声明']]),
      field('文件路径（/uploads/... 或 http(s)://）', 'file', d.file),
      field('语言', 'lang', d.lang, 'select', [['it', 'IT'], ['en', 'EN'], ['it+en', 'IT+EN']]),
      field('版本', 'version', d.version), field('大小（如 2.4MB）', 'size', d.size) ]; },
    tool: function (d) { d = d || { name: '', description: '', status: 'live', url: '' }; return [
      field('工具名称', 'name', d.name), field('工具介绍', 'description', d.description, 'textarea'),
      field('状态', 'status', d.status, 'select', [['live', '已上线'], ['coming', '筹备中']]),
      field('工具链接（http(s)://，留空=接入中）', 'url', d.url) ]; },
    case: function (d) { d = d || { org: '', title: '', description: '', metric_value: '', metric_label: '', sort: '' }; return [
      field('客户描述（如 Villa unifamiliare · Monza）', 'org', d.org), field('案例标题', 'title', d.title),
      field('案例说明', 'description', d.description, 'textarea'),
      field('指标数值（如 -52%）', 'metric_value', d.metric_value), field('指标说明', 'metric_label', d.metric_label),
      field('排序（小在前）', 'sort', d.sort, 'number') ]; },
  };
  var TYPE_NAMES = { post: '文章', product: '产品', document: '文档', tool: '工具', case: '案例' };

  function openEditor(type, id) {
    var data = null;
    if (id != null) { var list = DATA[type + 's'] || []; for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) { data = list[i]; break; } }
    current = { type: type, id: id };
    titleEl.textContent = (id != null ? '编辑' : '新建') + TYPE_NAMES[type];
    errEl.textContent = ''; fieldsEl.innerHTML = '';
    SCHEMAS[type](data).forEach(function (f) { fieldsEl.appendChild(f); });
    backdrop.hidden = false;
  }
  function closeEditor() { backdrop.hidden = true; current = null; }

  document.addEventListener('click', function (e) {
    var nw = e.target.closest ? e.target.closest('[data-new]') : null;
    if (nw) { closeNewMenu(); openEditor(nw.getAttribute('data-new'), null); return; }
    var edit = e.target.closest ? e.target.closest('[data-edit]') : null;
    if (edit) { openEditor(edit.getAttribute('data-edit'), edit.getAttribute('data-id')); return; }
    var del = e.target.closest ? e.target.closest('[data-del]') : null;
    if (del) { doDelete(del.getAttribute('data-del'), del.getAttribute('data-id'), del.getAttribute('data-name'), del.getAttribute('data-archived') === '1'); return; }
    var rst = e.target.closest ? e.target.closest('[data-restore]') : null;
    if (rst) { doRestore(rst.getAttribute('data-restore'), rst.getAttribute('data-id')); return; }
    var pub = e.target.closest ? e.target.closest('[data-publish]') : null;
    if (pub) { doPublish(pub.getAttribute('data-publish')); return; }
  });
  document.getElementById('edit-cancel').addEventListener('click', closeEditor);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeEditor(); });

  var newBtn = document.getElementById('btn-new-content');
  var newMenu = document.getElementById('new-menu');
  function closeNewMenu() {
    if (!newMenu || newMenu.hidden) return;
    newMenu.hidden = true; newBtn.setAttribute('aria-expanded', 'false');
  }
  if (newBtn && newMenu) {
    newBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = newMenu.hidden;
      newMenu.hidden = !open;
      newBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', closeNewMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNewMenu(); });
  }

  document.getElementById('edit-save').addEventListener('click', function () {
    if (!current) return;
    var payload = { id: current.id != null ? Number(current.id) : undefined };
    fieldsEl.querySelectorAll('[data-field]').forEach(function (inp) { payload[inp.getAttribute('data-field')] = inp.value; });
    errEl.textContent = '';
    post('/admin/api/' + current.type, payload, function (ok, d) {
      if (!ok) { errEl.textContent = d.error || '保存失败'; return; }
      reloadTo('content');
    });
  });

  function doDelete(type, id, name, archived) {
    var msg = archived
      ? '确认彻底删除「' + name + '」？此操作不可恢复' + (type === 'post' ? '，评论与统计一并移除' : '') + '。'
      : '确认下线「' + name + '」？将从前台隐藏' + (type === 'post' ? '（保留评论与统计）' : '') + '，可在后台恢复；再次点删除才彻底移除。';
    if (!confirm(msg)) return;
    post('/admin/api/delete', { type: type, id: Number(id) }, function (ok, d) {
      if (!ok) { alanToast(d.error || '删除失败'); return; }
      if (d.note) alanToast(d.note);
      reloadTo('content');
    });
  }
  function doRestore(type, id) {
    post('/admin/api/restore', { type: type, id: Number(id) }, function (ok, d) {
      if (!ok) { alanToast(d.error || '恢复失败'); return; }
      alanToast('已恢复，前台重新显示');
      reloadTo('content');
    });
  }
  function doPublish(id) {
    if (!confirm('确认发布这篇草稿到前台？')) return;
    post('/admin/api/post-publish', { id: Number(id) }, function (ok, d) {
      if (!ok) { alanToast(d.error || '发布失败'); return; }
      alanToast('已发布'); reloadTo('content');
    });
  }

  // —— AI 生成草稿 ——
  var aiBtn = document.getElementById('btn-ai-draft');
  if (aiBtn) aiBtn.addEventListener('click', function () {
    var topic = prompt('输入文章选题（如：暖通企业如何用 AI 做竞品分析）', '');
    if (!topic) return;
    var outline = prompt('可选：要点/大纲（留空让 AI 自拟）', '') || '';
    aiBtn.disabled = true; aiBtn.textContent = 'AI 生成中…';
    post('/admin/api/post-generate', { topic: topic, outline: outline }, function (ok, d) {
      aiBtn.disabled = false; aiBtn.textContent = '✎ AI 生成草稿';
      if (!ok) { alanToast(d.error || '生成失败'); return; }
      alanToast('草稿已生成：' + d.title + '（在待审草稿中审核发布）'); reloadTo('content');
    });
  });

  // —— 工具 ——
  function post(url, body, cb) {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) { cb(res.ok, res.d); })
      .catch(function () { cb(false, { error: '网络异常' }); });
  }
  function reloadTo(tab) { try { sessionStorage.setItem('alan-admin-tab', tab); } catch (e) {} location.reload(); }
  window.AdminPost = post; window.AdminReloadTo = reloadTo;
})();
