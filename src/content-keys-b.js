// REGISTRY B：产品 / 文档 / 案例 / 工具 / 补贴（def = { it, en }）
const T = 'text'; const TA = 'textarea';
module.exports = [
  // —— 产品 ——
  { key: 'prodotti.hero_title', group: '产品', label: 'Hero 标题', type: T, def: { it: 'Prodotti selezionati per il clima italiano', en: 'Products selected for the Italian climate' } },
  { key: 'prodotti.hero_body', group: '产品', label: 'Hero 介绍', type: TA, def: { it: 'Pompe di calore aria-acqua e climatizzatori inverter R32. Ogni modello è scelto per affidabilità, efficienza e disponibilità di ricambi in Italia.', en: 'Air-to-water heat pumps and R32 inverter air conditioners. Every model is chosen for reliability, efficiency and spare-parts availability in Italy.' } },
  { key: 'prodotti.hp_title', group: '产品', label: '热泵区·标题', type: T, def: { it: 'Pompe di calore aria-acqua', en: 'Air-to-water heat pumps' } },
  { key: 'prodotti.hp_body', group: '产品', label: '热泵区·说明', type: TA, def: { it: 'Da 4 a 16 kW, monofase e trifase. Per radiatori, pavimento radiante e produzione ACS.', en: 'From 4 to 16 kW, single and three phase. For radiators, underfloor heating and DHW.' } },
  { key: 'prodotti.ac_title', group: '产品', label: '空调区·标题', type: T, def: { it: 'Climatizzatori inverter', en: 'Inverter air conditioners' } },
  { key: 'prodotti.ac_body', group: '产品', label: '空调区·说明', type: TA, def: { it: 'Mono e multi-split da 2,5 a 7 kW. Wi-Fi integrato, classe A++ e oltre.', en: 'Mono and multi-split from 2.5 to 7 kW. Built-in Wi-Fi, class A++ and above.' } },
  { key: 'prodotti.note', group: '产品', label: '安装工提示', type: TA, def: { it: 'Sei un installatore? Accedi all’Area Riservata per listino, schede tecniche complete e condizioni dedicate.', en: 'Are you an installer? Sign in to the Reserved Area for pricing, full datasheets and dedicated terms.' } },

  // —— 技术文档 ——
  { key: 'docs.hero_title', group: '文档', label: 'Hero 标题', type: T, def: { it: 'Documentazione tecnica', en: 'Technical documentation' } },
  { key: 'docs.hero_body', group: '文档', label: 'Hero 介绍', type: TA, def: { it: 'Schede tecniche, manuali di installazione e certificazioni. Cerca per modello o sfoglia per categoria.', en: 'Datasheets, installation manuals and certificates. Search by model or browse by category.' } },
  { key: 'docs.empty_note', group: '文档', label: '空态提示', type: T, def: { it: 'L’archivio documenti è in caricamento. Per un documento specifico scrivi a assistenza@convation.it.', en: 'The document archive is being populated. For a specific document write to assistenza@convation.it.' } },

  // —— 案例 ——
  { key: 'referenze.hero_title', group: '案例', label: 'Hero 标题', type: T, def: { it: 'Impianti realizzati, risultati misurabili', en: 'Completed installations, measurable results' } },
  { key: 'referenze.hero_body', group: '案例', label: 'Hero 介绍', type: TA, def: { it: 'Ville, condomini e attività commerciali in tutta Italia. Ogni referenza indica luogo, tipologia e modello installato.', en: 'Villas, apartment buildings and businesses across Italy. Each reference lists location, building type and installed model.' } },
  { key: 'referenze.empty_note', group: '案例', label: '空态提示', type: T, def: { it: 'Le referenze fotografiche sono in pubblicazione. Torna presto a trovarci.', en: 'Photo references are being published. Come back soon.' } },

  // —— 工具 ——
  { key: 'strumenti.hero_title', group: '工具', label: 'Hero 标题', type: T, def: { it: 'Strumenti di calcolo HVAC', en: 'HVAC calculation tools' } },
  { key: 'strumenti.hero_body', group: '工具', label: 'Hero 介绍', type: TA, def: { it: 'Proprietà refrigeranti, ciclo frigorifero, psicrometria, idraulica, canali e stime energetiche. Strumenti online gratuiti, in inglese tecnico, forniti dal nostro partner hvac.geopro.cc.', en: 'Refrigerant properties, refrigeration cycle, psychrometrics, hydronics, ducts and energy estimates. Free online tools, in technical English, provided by our partner hvac.geopro.cc.' } },
  { key: 'strumenti.lang_note', group: '工具', label: '语言提示', type: T, def: { it: 'Nota: gli strumenti sono attualmente in inglese tecnico. La versione italiana è in lavorazione.', en: 'Note: tools are currently in technical English. An Italian version is in progress.' } },

  // —— 补贴 ——
  { key: 'detrazioni.hero_title', group: '补贴', label: 'Hero 标题', type: T, def: { it: 'Detrazioni e incentivi 2026', en: 'Tax deductions & incentives 2026' } },
  { key: 'detrazioni.hero_body', group: '补贴', label: 'Hero 介绍', type: TA, def: { it: 'Conto Termico 3.0, Ecobonus e detrazioni 50%: una guida chiara per capire a cosa hai diritto e come ottenerlo.', en: 'Conto Termico 3.0, Ecobonus and 50% deductions: a clear guide to what you are entitled to and how to get it.' } },
  { key: 'detrazioni.box1_title', group: '补贴', label: '板块1·标题', type: T, def: { it: 'Conto Termico 3.0', en: 'Conto Termico 3.0' } },
  { key: 'detrazioni.box1_body', group: '补贴', label: '板块1·说明', type: TA, def: { it: 'Incentivo diretto GSE fino al 65% per sostituzione di generatori a combustibile fossile con pompe di calore. Erogato in 2-5 rate annuali.', en: 'Direct GSE incentive up to 65% for replacing fossil-fuel generators with heat pumps. Paid in 2-5 annual instalments.' } },
  { key: 'detrazioni.box2_title', group: '补贴', label: '板块2·标题', type: T, def: { it: 'Detrazione 50% ristrutturazioni', en: '50% renovation deduction' } },
  { key: 'detrazioni.box2_body', group: '补贴', label: '板块2·说明', type: TA, def: { it: 'Recupero del 50% in 10 anni per climatizzatori e pompe di calore in ristrutturazione, con tetto di spesa agevolato.', en: '50% recovery over 10 years for air conditioners and heat pumps in renovations, with a subsidised spending cap.' } },
  { key: 'detrazioni.disclaimer', group: '补贴', label: '免责声明', type: TA, def: { it: 'Le informazioni sono indicative e aggiornate periodicamente: verifica sempre i requisiti ufficiali GSE/Agenzia delle Entrate. Il nostro team ti assiste nella verifica di fattibilità.', en: 'Information is indicative and periodically updated: always verify official GSE/Agenzia delle Entrate requirements. Our team assists you with feasibility checks.' } },
];
