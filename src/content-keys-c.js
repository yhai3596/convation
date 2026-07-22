// REGISTRY C：售后 / 咨询 / 新闻 / 联系 / 品牌故事（def = { it, en }）
const T = 'text'; const TA = 'textarea';
module.exports = [
  // —— 售后服务 ——
  { key: 'assistenza.hero_title', group: '售后', label: 'Hero 标题', type: T, def: { it: 'Assistenza che risponde davvero', en: 'Support that actually answers' } },
  { key: 'assistenza.hero_body', group: '售后', label: 'Hero 介绍', type: TA, def: { it: 'Garanzia, ricambi e manutenzione programmata. Un unico canale per privati e installatori, con risposta garantita entro 24 ore lavorative.', en: 'Warranty, spare parts and scheduled maintenance. One channel for homeowners and installers, with guaranteed reply within 24 working hours.' } },
  { key: 'assistenza.s1_title', group: '售后', label: '服务1·标题', type: T, def: { it: 'Garanzia ed estensione', en: 'Warranty & extension' } },
  { key: 'assistenza.s1_body', group: '售后', label: '服务1·说明', type: TA, def: { it: 'Garanzia ufficiale su tutti i prodotti, con possibilità di estensione fino a 5 anni registrando l’impianto.', en: 'Official warranty on all products, extendable up to 5 years by registering your system.' } },
  { key: 'assistenza.s2_title', group: '售后', label: '服务2·标题', type: T, def: { it: 'Ricambi originali', en: 'Original spare parts' } },
  { key: 'assistenza.s2_body', group: '售后', label: '服务2·说明', type: TA, def: { it: 'Magazzino ricambi in Italia con spedizione in 48h per gli installatori registrati.', en: 'Spare-parts warehouse in Italy with 48h shipping for registered installers.' } },
  { key: 'assistenza.s3_title', group: '售后', label: '服务3·标题', type: T, def: { it: 'Apri un ticket', en: 'Open a ticket' } },
  { key: 'assistenza.s3_body', group: '售后', label: '服务3·说明', type: TA, def: { it: 'Descrivi il problema e allega foto: il nostro team tecnico ti ricontatta con una diagnosi preliminare.', en: 'Describe the issue and attach photos: our technical team calls you back with a preliminary diagnosis.' } },

  // —— 咨询 ——
  { key: 'consulenza.hero_title', group: '咨询', label: 'Hero 标题', type: T, def: { it: 'Consulenza gratuita', en: 'Free consultation' } },
  { key: 'consulenza.hero_body', group: '咨询', label: 'Hero 介绍', type: TA, def: { it: 'Prima di scegliere, parliamone. Assistente AI per le risposte immediate, tecnici umani per le decisioni importanti.', en: 'Before you choose, let’s talk. AI assistant for instant answers, human technicians for the important decisions.' } },
  { key: 'consulenza.ai_title', group: '咨询', label: 'AI·标题', type: T, def: { it: 'Assistente AI Convation', en: 'Convation AI assistant' } },
  { key: 'consulenza.ai_body', group: '咨询', label: 'AI·说明', type: TA, def: { it: 'Domande su prodotti, incentivi, compatibilità e tempi: l’assistente risponde subito, 24/7. Per preventivi vincolanti e reclami ti passa sempre a un operatore umano.', en: 'Questions about products, incentives, compatibility and timing: the assistant answers instantly, 24/7. For binding quotes and complaints it always hands over to a human operator.' } },
  { key: 'consulenza.human_title', group: '咨询', label: '人工·标题', type: T, def: { it: 'Parla con un tecnico', en: 'Talk to a technician' } },
  { key: 'consulenza.human_body', group: '咨询', label: '人工·说明', type: TA, def: { it: 'Telefono, email o WhatsApp: scegli il canale che preferisci. Sopralluogo e preventivo sono sempre gratuiti.', en: 'Phone, email or WhatsApp: choose the channel you prefer. Site survey and quote are always free.' } },

  // —— 新闻 ——
  { key: 'news.hero_title', group: '新闻', label: 'Hero 标题', type: T, def: { it: 'News e guide dal mondo HVAC', en: 'News and guides from the HVAC world' } },
  { key: 'news.hero_body', group: '新闻', label: 'Hero 介绍', type: TA, def: { it: 'Aggiornamenti su incentivi, normativa F-Gas, guide alla scelta e novità di prodotto.', en: 'Updates on incentives, F-Gas regulation, selection guides and product news.' } },
  { key: 'news.empty_note', group: '新闻', label: '空态提示', type: T, def: { it: 'I primi articoli sono in preparazione. Iscriviti per riceverli appena escono.', en: 'First articles are in preparation. Subscribe to get them as soon as they are out.' } },

  // —— 联系 ——
  { key: 'contatti.hero_title', group: '联系', label: 'Hero 标题', type: T, def: { it: 'Contattaci', en: 'Contact us' } },
  { key: 'contatti.hero_body', group: '联系', label: 'Hero 介绍', type: TA, def: { it: 'Per informazioni commerciali, assistenza tecnica o candidature come installatore partner.', en: 'For commercial enquiries, technical support or applications as a partner installer.' } },
  { key: 'contatti.form_title', group: '联系', label: '表单标题', type: T, def: { it: 'Scrivici un messaggio', en: 'Send us a message' } },
  { key: 'contatti.hours', group: '联系', label: '营业时间', type: T, def: { it: 'Lun–Ven 8:30–18:00', en: 'Mon–Fri 8:30–18:00' } },

  // —— 品牌故事 ——
  { key: 'chisiamo.hero_title', group: '品牌故事', label: 'Hero 标题', type: T, def: { it: 'Il comfort è un mestiere. Il nostro.', en: 'Comfort is a craft. Ours.' } },
  { key: 'chisiamo.hero_body', group: '品牌故事', label: 'Hero 介绍', type: TA, def: { it: 'Convation nasce in Italia da tecnici del clima: vendiamo, installiamo e manteniamo pompe di calore e climatizzatori con la stessa cura che metteremmo a casa nostra.', en: 'Convation was born in Italy from climate technicians: we sell, install and service heat pumps and air conditioners with the same care we would use in our own homes.' } },
  { key: 'chisiamo.story_title', group: '品牌故事', label: '故事·标题', type: T, def: { it: 'Da dove veniamo', en: 'Where we come from' } },
  { key: 'chisiamo.story_body', group: '品牌故事', label: '故事·正文', type: TA, def: { it: 'Abbiamo iniziato in cantiere, non in ufficio. Per anni abbiamo installato impianti per conto di altri marchi, vedendo da vicino cosa funziona e cosa no: schede tecniche incomplete, assistenza irraggiungibile, ricambi introvabili.\nConvation è la risposta a quella esperienza: un catalogo essenziale e affidabile, documentazione vera, e un team tecnico che risponde. Oggi serviamo privati in tutta Italia e una rete crescente di installatori partner.', en: 'We started on construction sites, not in an office. For years we installed systems for other brands, seeing up close what works and what does not: incomplete datasheets, unreachable support, unavailable spare parts.\nConvation is the answer to that experience: an essential, reliable catalogue, real documentation, and a technical team that answers. Today we serve homeowners across Italy and a growing network of partner installers.' } },
  { key: 'chisiamo.val1_title', group: '品牌故事', label: '价值1·标题', type: T, def: { it: 'Tecnici, non venditori', en: 'Technicians, not salespeople' } },
  { key: 'chisiamo.val1_body', group: '品牌故事', label: '价值1·说明', type: TA, def: { it: 'Chi ti consiglia ha montato impianti per anni. I consigli partono dal cantiere, non dal listino.', en: 'Whoever advises you has installed systems for years. Advice starts from the site, not the price list.' } },
  { key: 'chisiamo.val2_title', group: '品牌故事', label: '价值2·标题', type: T, def: { it: 'Pochi prodotti, scelti bene', en: 'Few products, well chosen' } },
  { key: 'chisiamo.val2_body', group: '品牌故事', label: '价值2·说明', type: TA, def: { it: 'Catalogo essenziale: ogni modello resta a listino solo se affidabile e con ricambi disponibili in Italia.', en: 'An essential catalogue: a model stays listed only if reliable and with spare parts available in Italy.' } },
  { key: 'chisiamo.val3_title', group: '品牌故事', label: '价值3·标题', type: T, def: { it: 'Dalla parte degli installatori', en: 'On the installers’ side' } },
  { key: 'chisiamo.val3_body', group: '品牌故事', label: '价值3·说明', type: TA, def: { it: 'Documentazione completa, strumenti di calcolo, listino chiaro e assistenza dedicata: chi installa deve poter lavorare bene.', en: 'Complete documentation, calculation tools, clear pricing and dedicated support: installers must be able to work well.' } },
];
