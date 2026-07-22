// 站内 Agent（设计稿中的「小龙虾」职责）：智能助手应答 + 评论自动回复。
// 默认内置 FAQ 知识库；配置 LLM 后自动升级为知识库约束下的生成式回答，失败回退 FAQ。
const { db, getSetting, setSetting } = require('./db');
const llm = require('./llm');
const { logActivity, agentModes } = require('./config');

const SITE_KNOWLEDGE = `Sito: Convation S.r.l. — vendita, installazione e assistenza di pompe di calore e climatizzatori in Italia (www.convation.it).
Sezioni:
- Prodotti (/prodotti): pompe di calore aria-acqua THERMA 8 (8 kW monofase R290) e THERMA 16T (16 kW trifase), climatizzatori ARIA 35 (3,5 kW R32) e ARIA DUAL 2×2,5. Efficienza fino ad A+++.
- Documentazione (/documentazione): schede tecniche, manuali e certificazioni in PDF.
- Strumenti (/strumenti): 9 strumenti di calcolo HVAC online gratuiti (proprietà refrigeranti, ciclo P-h, psicrometria, idraulica, canali, energia annuale, convertitore unità, simulazione inverter, quiz A2L) — attualmente in inglese tecnico.
- Detrazioni (/detrazioni): Conto Termico 3.0 (fino al 65% GSE) e detrazione 50% ristrutturazioni; assistiamo nella verifica di fattibilità.
- Assistenza (/assistenza): garanzia ed estensione fino a 5 anni, ricambi originali con spedizione 48h, ticket tecnico con risposta entro 24h lavorative.
- Consulenza (/consulenza): sopralluogo e preventivo gratuiti. Contatti: telefono ed email in fondo a ogni pagina.
- Area Riservata (/login): per installatori — listino, ordini, formazione (in attivazione).
Regole: rispondi SOLO a domande su Convation, suoi prodotti/servizi, incentivi e HVAC in generale. Non inventare prezzi, date o specifiche non presenti qui. Per preventivi vincolanti, reclami o garanzie: indirizza sempre a un operatore umano (telefono/email/consulenza).`;

// 快捷问题 → 标准答案（精确匹配，保证确定性）
const QUICK_ANSWERS = {
  'Quanto costa una pompa di calore?': 'Dipende da potenza, modello e installazione: per un preventivo gratuito puoi usare la pagina Consulenza — sopralluogo e preventivo sono sempre gratuiti. Con il Conto Termico 3.0 puoi recuperare fino al 65% della spesa.',
  'Come funziona il Conto Termico?': 'È un incentivo GSE fino al 65% per sostituire un generatore a combustibile fossile con una pompa di calore. Si richiede entro 90 giorni dalla fine lavori e arriva in 2-5 rate annuali. La nostra guida è nella pagina Detrazioni; per la verifica di fattibilità ti assistiamo noi.',
  'Fate assistenza fuori zona?': 'Operiamo in tutta Italia con la nostra rete. Per ricambi originali spediamo in 48h; per interventi tecnici scrivi a assistenza@convation.it o apri un ticket dalla pagina Assistenza.',
};

const FAQS = [
  {
    keys: ['conto termico', 'incentiv', 'detrazion', 'ecobonus', 'gse', '65%', '50%'],
    answer: 'Per pompe di calore e climatizzatori ci sono due strade principali: Conto Termico 3.0 (incentivo GSE fino al 65%, in 2-5 rate) e detrazione 50% in 10 anni. Trovi la guida completa nella pagina Detrazioni; per verificare a cosa hai diritto, scrivici dalla pagina Consulenza.',
  },
  {
    keys: ['garanzia', 'ricambi', 'assistenza', 'ticket', 'guasto', 'riparazione'],
    answer: 'Tutti i prodotti hanno garanzia ufficiale, estendibile fino a 5 anni registrando l’impianto. I ricambi originali partono in 48h. Per aprire un ticket tecnico: pagina Assistenza — rispondiamo entro 24 ore lavorative.',
  },
  {
    keys: ['therma', 'pompa di calore', 'heat pump', 'r290', 'kw'],
    answer: 'La gamma THERMA copre da 8 kW monofase (R290, A+++) a 16 kW trifase con cascata fino a 4 unità. Specifiche complete e documenti nella pagina Prodotti; per il dimensionamento puoi usare gli strumenti di calcolo in Strumenti.',
  },
  {
    keys: ['aria', 'climatizzatore', 'split', 'r32', 'btu', 'wifi'],
    answer: 'I climatizzatori ARIA sono inverter R32 da 2,5 a 7 kW, con Wi-Fi integrato e classe A++/A+++. Modelli e schede nella pagina Prodotti.',
  },
  {
    keys: ['installatore', 'listino', 'area riservata', 'prezzi', 'rivenditore', 'partner'],
    answer: 'L’Area Riservata per installatori (listino, ordini, formazione) è in attivazione. Registrati dal login o scrivici dalla pagina Contatti con la tua email aziendale: ti avviseremo appena attiva.',
  },
  {
    keys: ['strumenti', 'calcolo', 'psychro', 'refrigerant', 'tool', 'dimensionamento'],
    answer: 'Nella pagina Strumenti trovi 9 strumenti gratuiti: proprietà refrigeranti, ciclo P-h, psicrometria, idraulica, canali, stima energetica, convertitore, simulazione e quiz. Sono in inglese tecnico; la versione italiana è in lavorazione.',
  },
  {
    keys: ['preventivo', 'sopralluogo', 'consulenza', 'contatto', 'telefono', 'email'],
    answer: 'Sopralluogo e preventivo sono sempre gratuiti: pagina Consulenza, oppure telefono ed email in fondo a ogni pagina. Rispondiamo entro 24 ore lavorative.',
  },
];

const FALLBACK_REPLY = 'Ho girato la tua domanda al team tecnico: ti risponderemo al più presto. Se preferisci parlare subito con una persona, trovi telefono ed email nella pagina Contatti — sopralluogo e preventivo sono gratuiti.';

function heartbeat() { setSetting('agent_last_active', new Date().toISOString()); }

function matchFaq(text) {
  const t = String(text || '').toLowerCase();
  let best = null;
  let bestHits = 0;
  for (const f of FAQS) {
    const hits = f.keys.filter(k => t.includes(k.toLowerCase())).length;
    if (hits > bestHits) { best = f; bestHits = hits; }
  }
  return bestHits > 0 ? best.answer : null;
}

// 悬浮助手应答（按页面语言回复；默认意语）
async function assistantReply(message, locale) {
  heartbeat();
  const msg = String(message || '').trim();
  const loc = locale === 'en' ? 'en' : 'it';
  const langInstr = loc === 'en' ? 'Rispondi in inglese.' : 'Rispondi in italiano.';
  if (QUICK_ANSWERS[msg]) return { reply: QUICK_ANSWERS[msg], via: 'faq' };

  if (llm.enabled()) {
    try {
      const reply = await llm.chat([
        { role: 'system', content: `Sei l'assistente clienti AI di Convation (vendita, installazione e assistenza pompe di calore e climatizzatori in Italia). ${SITE_KNOWLEDGE}\n${langInstr} Risposte brevi (massimo 120 parole), tono professionale e cortese. Per preventivi vincolanti, reclami o garanzie: indirizza sempre a un operatore umano.` },
        { role: 'user', content: msg },
      ], { maxTokens: 300, timeoutMs: 12000 });
      return { reply, via: 'llm' };
    } catch (e) {
      console.warn('[agent] 助手 LLM 失败，回退 FAQ：', e.message);
    }
  }
  const faq = matchFaq(msg);
  const fb = loc === 'en'
    ? "I've passed your question to our technical team — we'll reply soon. For immediate human help, see phone and email on the Contact page; site survey and quote are free."
    : FALLBACK_REPLY;
  return { reply: faq || fb, via: faq ? 'faq' : 'fallback' };
}

// 评论自动回复：常见问题即时回复并标注；审核制开启时进草稿队列不直接发布，其余转人工。
const setCommentStatus = (id, status) => db.prepare('UPDATE comments SET agent_status=? WHERE id=?').run(status, id);

async function commentAutoReply(postId, commentId, commentBody, actor = 'system:即时') {
  if (getSetting('agent_autoreply', '1') !== '1') return null; // 保持 pending，开启后由 Worker 补处理
  let replyText = null;
  let via = 'faq';

  if (llm.enabled()) {
    try {
      const text = await llm.chat([
        { role: 'system', content: `Sei l'assistente commenti di Convation. ${SITE_KNOWLEDGE}\nGiudica se questo commento è una domanda comune (su prodotti/assistenza/incentivi/strumenti) a cui puoi rispondere. Rispondi SOLO in JSON: {"can_answer":true/false,"reply":"se sì, risposta in italiano, massimo 110 parole, tono professionale a nome Convation"}. Opinioni o domande che richiedono giudizio umano: can_answer=false.` },
        { role: 'user', content: `Commento del lettore: ${commentBody}` },
      ], { maxTokens: 300, timeoutMs: 10000, json: true });
      const j = llm.parseJson(text);
      if (j.can_answer && j.reply) { replyText = String(j.reply).trim(); via = 'llm'; }
    } catch (e) {
      console.warn('[agent] 评论 LLM 失败，回退 FAQ：', e.message);
      replyText = matchFaq(commentBody);
    }
  } else {
    replyText = matchFaq(commentBody);
  }

  // 审核制开启：能答也先进草稿队列，不直接发布
  if (replyText && getSetting('agent_content_review', '1') === '1') {
    db.prepare(`INSERT INTO ai_drafts(source,type,payload_json,status) VALUES ('agent','reply',?, 'pending')`)
      .run(JSON.stringify({ post_id: postId, comment_id: commentId, reply: replyText, via }));
    setCommentStatus(commentId, 'skipped');
    logActivity(actor, 'comment_review', `comment#${commentId}`, `${via} 草稿待审 · ${replyText.slice(0, 60)}`, true);
    return null;
  }

  if (!replyText) {
    setCommentStatus(commentId, 'skipped');
    logActivity(actor, 'comment_skip', `comment#${commentId}`, '非常见问题，转人工', true);
    return null;
  }
  heartbeat();
  const r = db.prepare(`INSERT INTO comments(post_id,user_id,author_name,body,parent_id,is_agent,agent_label,agent_status)
    VALUES (?,NULL,'Convation',?,?,1,'AI 自动回复 · via Convation Agent','replied')`).run(postId, replyText, commentId);
  setCommentStatus(commentId, 'replied');
  logActivity(actor, 'comment_reply', `comment#${commentId}`, `${via} · ${replyText.slice(0, 60)}`, true);
  return db.prepare('SELECT * FROM comments WHERE id=?').get(r.lastInsertRowid);
}

function agentStatus() {
  const modes = agentModes();
  return {
    autoreply: modes.autoreply,
    contentReview: modes.contentReview,
    scanIntervalMin: modes.scanIntervalMin,
    lastActive: getSetting('agent_last_active', null),
    mode: llm.enabled() ? `已连接 LLM（${llm.modelName()}）` : '内置 FAQ 模式',
    llm: llm.enabled(),
  };
}

module.exports = { assistantReply, commentAutoReply, agentStatus, matchFaq, SITE_KNOWLEDGE };
