// REGISTRY A：全站 / 共享 UI / 首页（def = { it, en }）
const T = 'text'; const TA = 'textarea';
module.exports = [
  // —— 全站（联系渠道：后台可配，§12 已确认） ——
  { key: 'site.phone', group: '全站', label: '服务电话', type: T, def: { it: '+39 02 0000 0000', en: '+39 02 0000 0000' } },
  { key: 'site.email_info', group: '全站', label: 'info 邮箱', type: T, def: { it: 'info@convation.it', en: 'info@convation.it' } },
  { key: 'site.email_support', group: '全站', label: '售后邮箱', type: T, def: { it: 'assistenza@convation.it', en: 'assistenza@convation.it' } },
  { key: 'site.whatsapp', group: '全站', label: 'WhatsApp（留空不显示）', type: T, def: { it: '', en: '' } },
  { key: 'site.address', group: '全站', label: '公司地址', type: T, def: { it: 'Via delle Industrie 12, 20121 Milano (MI)', en: 'Via delle Industrie 12, 20121 Milan, Italy' } },
  { key: 'site.piva', group: '全站', label: 'P.IVA 税号行', type: T, def: { it: 'Convation S.r.l. · P.IVA 00000000000', en: 'Convation S.r.l. · VAT 00000000000' } },

  // —— 共享 UI 小文案 ——
  { key: 'ui.read_more', group: 'UI', label: '了解更多', type: T, def: { it: 'Scopri di più →', en: 'Learn more →' } },
  { key: 'ui.send', group: 'UI', label: '发送按钮', type: T, def: { it: 'Invia', en: 'Send' } },
  { key: 'ui.form_name', group: 'UI', label: '表单·姓名', type: T, def: { it: 'Nome e cognome', en: 'Full name' } },
  { key: 'ui.form_email', group: 'UI', label: '表单·邮箱', type: T, def: { it: 'La tua email', en: 'Your email' } },
  { key: 'ui.form_msg', group: 'UI', label: '表单·留言', type: T, def: { it: 'Come possiamo aiutarti?', en: 'How can we help?' } },
  { key: 'ui.form_ok', group: 'UI', label: '表单·成功提示', type: T, def: { it: 'Messaggio inviato. Ti risponderemo al più presto.', en: 'Message sent. We will reply soon.' } },
  { key: 'ui.area_riservata', group: 'UI', label: 'Area Riservata 标签', type: T, def: { it: 'Area Riservata', en: 'Reserved Area' } },

  // —— 首页 Hero 双轨 ——
  { key: 'home.kicker', group: '首页', label: 'Hero 眉题', type: T, def: { it: 'Climatizzazione e pompe di calore', en: 'Air conditioning & heat pumps' } },
  { key: 'home.hero_title', group: '首页', label: 'Hero 主标题（换行分行）', type: TA, def: { it: 'Comfort tutto l’anno,\ninstallato da professionisti.', en: 'Year-round comfort,\ninstalled by professionals.' } },
  { key: 'home.hero_body', group: '首页', label: 'Hero 介绍段', type: TA, def: { it: 'Convation vende, installa e mantiene pompe di calore e climatizzatori in tutta Italia. Al fianco degli installatori con prodotti selezionati, documentazione tecnica sempre disponibile e un’assistenza che risponde davvero.', en: 'Convation sells, installs and services heat pumps and air conditioners across Italy. We stand beside installers with selected products, always-available technical docs and support that actually answers.' } },
  { key: 'home.track_p_kicker', group: '首页', label: '消费者轨·眉题', type: T, def: { it: 'Per la tua casa', en: 'For your home' } },
  { key: 'home.track_p_title', group: '首页', label: '消费者轨·标题', type: T, def: { it: 'Sono un privato', en: 'I am a homeowner' } },
  { key: 'home.track_p_body', group: '首页', label: '消费者轨·说明', type: TA, def: { it: 'Vuoi climatizzare o riscaldare casa? Ti aiutiamo a scegliere la soluzione giusta e ti mettiamo in contatto con i nostri installatori.', en: 'Looking to cool or heat your home? We help you choose the right solution and connect you with our installers.' } },
  { key: 'home.track_i_kicker', group: '首页', label: '安装工轨·眉题', type: T, def: { it: 'Per il tuo lavoro', en: 'For your work' } },
  { key: 'home.track_i_title', group: '首页', label: '安装工轨·标题', type: T, def: { it: 'Sono un installatore', en: 'I am an installer' } },
  { key: 'home.track_i_body', group: '首页', label: '安装工轨·说明', type: TA, def: { it: 'Listino prezzi, schede tecniche, strumenti di calcolo e assistenza dedicata. Accedi all’Area Riservata o richiedi l’attivazione.', en: 'Price lists, technical datasheets, calculation tools and dedicated support. Sign in to the Reserved Area or request activation.' } },

  // —— 首页信任条 ——
  { key: 'home.trust1_value', group: '首页', label: '信任1·值', type: T, def: { it: '12+', en: '12+' } },
  { key: 'home.trust1_label', group: '首页', label: '信任1·说明', type: T, def: { it: 'anni di esperienza HVAC', en: 'years of HVAC experience' } },
  { key: 'home.trust2_value', group: '首页', label: '信任2·值', type: T, def: { it: '2.400+', en: '2,400+' } },
  { key: 'home.trust2_label', group: '首页', label: '信任2·说明', type: T, def: { it: 'impianti installati e seguiti', en: 'systems installed and serviced' } },
  { key: 'home.trust3_value', group: '首页', label: '信任3·值', type: T, def: { it: '9', en: '9' } },
  { key: 'home.trust3_label', group: '首页', label: '信任3·说明', type: T, def: { it: 'strumenti di calcolo online', en: 'online calculation tools' } },
  { key: 'home.trust4_value', group: '首页', label: '信任4·值', type: T, def: { it: '24h', en: '24h' } },
  { key: 'home.trust4_label', group: '首页', label: '信任4·说明', type: T, def: { it: 'risposta assistenza garantita', en: 'guaranteed support response' } },

  // —— 首页产品双品类 ——
  { key: 'home.cats_kicker', group: '首页', label: '产品区·眉题', type: T, def: { it: 'I nostri prodotti', en: 'Our products' } },
  { key: 'home.cat_hp_tag', group: '首页', label: '热泵·标签', type: T, def: { it: 'Riscaldamento efficiente', en: 'Efficient heating' } },
  { key: 'home.cat_hp_title', group: '首页', label: '热泵·标题', type: T, def: { it: 'Pompe di calore', en: 'Heat pumps' } },
  { key: 'home.cat_hp_body', group: '首页', label: '热泵·说明', type: TA, def: { it: 'Aria-acqua per riscaldamento, raffrescamento e acqua calda sanitaria. Efficienza fino ad A+++ e compatibili con gli incentivi nazionali.', en: 'Air-to-water units for heating, cooling and domestic hot water. Up to A+++ efficiency, eligible for national incentives.' } },
  { key: 'home.cat_ac_tag', group: '首页', label: '空调·标签', type: T, def: { it: 'Climatizzazione', en: 'Air conditioning' } },
  { key: 'home.cat_ac_title', group: '首页', label: '空调·标题', type: T, def: { it: 'Climatizzatori', en: 'Air conditioners' } },
  { key: 'home.cat_ac_body', group: '首页', label: '空调·说明', type: TA, def: { it: 'Split e multi-split inverter a refrigerante R32: silenziosi, efficienti, pensati per il clima italiano.', en: 'R32 inverter split and multi-split systems: quiet, efficient, designed for the Italian climate.' } },

  // —— 首页安装工服务三入口 ——
  { key: 'home.svc_kicker', group: '首页', label: '服务区·眉题', type: T, def: { it: 'Per gli installatori', en: 'For installers' } },
  { key: 'home.svc1_title', group: '首页', label: '服务1·标题', type: T, def: { it: 'Documentazione tecnica', en: 'Technical documentation' } },
  { key: 'home.svc1_body', group: '首页', label: '服务1·说明', type: TA, def: { it: 'Schede tecniche, manuali e certificazioni sempre aggiornati, pronti da scaricare in cantiere.', en: 'Always-updated datasheets, manuals and certificates, ready to download on site.' } },
  { key: 'home.svc2_title', group: '首页', label: '服务2·标题', type: T, def: { it: 'Listino e disponibilità', en: 'Pricing & availability' } },
  { key: 'home.svc2_body', group: '首页', label: '服务2·说明', type: TA, def: { it: 'Listino riservato aggiornato e stato magazzino nell’Area Riservata.', en: 'Updated reserved price list and stock status in the Reserved Area.' } },
  { key: 'home.svc3_title', group: '首页', label: '服务3·标题', type: T, def: { it: 'Strumenti HVAC', en: 'HVAC tools' } },
  { key: 'home.svc3_body', group: '首页', label: '服务3·说明', type: TA, def: { it: 'Calcolo carichi, proprietà refrigeranti, dimensionamento: gli strumenti che usi ogni giorno, online.', en: 'Load calculation, refrigerant properties, sizing: the tools you use every day, online.' } },

  // —— 首页补贴带 + 咨询 CTA ——
  { key: 'home.detr_kicker', group: '首页', label: '补贴带·眉题', type: T, def: { it: 'Detrazioni e incentivi', en: 'Incentives & tax deductions' } },
  { key: 'home.detr_title', group: '首页', label: '补贴带·标题', type: T, def: { it: 'Conto Termico 3.0: fino al 65% di incentivo', en: 'Conto Termico 3.0: incentives up to 65%' } },
  { key: 'home.detr_body', group: '首页', label: '补贴带·说明', type: TA, def: { it: 'Sostituire la vecchia caldaia con una pompa di calore conviene. Ti guidiamo tra requisiti, pratiche e tempi.', en: 'Replacing an old boiler with a heat pump pays off. We guide you through requirements, paperwork and timelines.' } },
  { key: 'home.cta_title', group: '首页', label: '咨询 CTA·标题', type: T, def: { it: 'Parliamone: sopralluogo e preventivo gratuiti', en: 'Let’s talk: free site survey and quote' } },
  { key: 'home.cta_body', group: '首页', label: '咨询 CTA·说明', type: TA, def: { it: 'Scrivici o chiamaci: rispondiamo entro 24 ore lavorative. Puoi anche provare il nostro assistente AI per le prime domande.', en: 'Write or call us: we reply within 24 working hours. You can also try our AI assistant for first questions.' } },
];
