/**
 * HARMONY HUB -> GOOGLE SHEETS (one-way import)
 *
 * Fluxo oficial:
 * Planilha -> Supabase -> App
 *
 * A planilha envia alterações para o Supabase.
 * Alterações feitas no App/Supabase NÃO são copiadas de volta para a planilha.
 *
 * Configure o token em Apps Script > Configurações do projeto > Propriedades do script:
 * HARMONY_TOKEN = token da conexão da planilha.
 */
const CONFIG = {
  API_URL: 'https://cyopbtfcnyetoolgwqyt.supabase.co/functions/v1/spreadsheet-sync',
  TOKEN_PROPERTY: 'HARMONY_TOKEN',
  SHEET_NAME: 'Lançamentos',
  POLL_MINUTES: 1,
};

const HEADERS = ['id','date','description','amount','type','category','pay_method','card_name','responsible','installment_current','installment_total','paid','is_fixed','updated_at','deleted'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Harmony Hub')
    .addItem('Sincronizar agora', 'syncNow')
    .addItem('Configurar sincronização automática', 'installTriggers')
    .addToUi();
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['syncNow','onEditInstalled'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncNow').timeBased().everyMinutes(CONFIG.POLL_MINUTES).create();
  ScriptApp.newTrigger('onEditInstalled').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  syncNow();
}

function onEditInstalled(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME || e.range.getRow() <= 1) return;
  if (PropertiesService.getScriptProperties().getProperty('HARMONY_WRITING') === '1') return;
  pushRow_(sheet, e.range.getRow());
}

/**
 * Sincronização unidirecional:
 * lê a planilha e envia para o Supabase.
 * Nunca consulta eventos APP nem escreve dados vindos do Supabase na planilha.
 */
function syncNow() {
  getToken_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    pushAllRows_(sheet);
    pushPendingDeletes_(sheet);
  } finally {
    lock.releaseLock();
  }
}

function pushAllRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const idx = index_(HEADERS);
  for (let i = 0; i < values.length; i++) {
    const rowNumber = i + 2;
    const row = values[i];
    if (String(row[idx.deleted] || '').toUpperCase() === 'SIM') continue;
    if (!row[idx.date] || Number(row[idx.amount] || 0) <= 0) continue;
    pushRow_(sheet, rowNumber);
  }
}

function pushPendingDeletes_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const idx = index_(HEADERS);
  for (let r = values.length; r >= 2; r--) {
    if (String(values[r-1][idx.deleted] || '').toUpperCase() === 'SIM') {
      const id = String(values[r-1][idx.id] || '');
      if (id) call_('delete', { id: id });
      setWriting_(true);
      try { sheet.deleteRow(r); } finally { setWriting_(false); }
    }
  }
}

function pushRow_(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const idx = index_(HEADERS);

  if (String(values[idx.deleted] || '').toUpperCase() === 'SIM') {
    const id = String(values[idx.id] || '');
    if (id) call_('delete', { id: id });
    setWriting_(true);
    try { sheet.deleteRow(rowNumber); } finally { setWriting_(false); }
    return;
  }

  const row = {};
  HEADERS.forEach((h,i) => row[h] = values[i]);
  if (row.date instanceof Date) row.date = Utilities.formatDate(row.date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  row.paid = !['NÃO','NAO','FALSE'].includes(String(row.paid).toUpperCase());
  row.is_fixed = ['SIM','TRUE'].includes(String(row.is_fixed).toUpperCase());

  const result = call_('upsert', { row: row });
  const transaction = result && Array.isArray(result.transactions) ? result.transactions[0] : null;

  // O Supabase pode gerar o ID quando a linha ainda não possui um.
  // Gravamos o resultado apenas na mesma linha para evitar duplicação.
  if (transaction) {
    setWriting_(true);
    try { writeTransaction_(sheet, rowNumber, transaction); }
    finally { setWriting_(false); }
  }
}

function transactionToArray_(t) {
  return [t.id||'',t.date||'',t.description||'',t.amount||0,t.type||'',t.category||'',t.pay_method||'',t.card_name||'',t.responsible||'',t.installment_current||'',t.installment_total||'',t.paid===false?'NÃO':'SIM',t.is_fixed?'SIM':'NÃO',t.updated_at||'',''];
}
function writeTransaction_(sheet,rowNumber,t) { sheet.getRange(rowNumber,1,1,HEADERS.length).setValues([transactionToArray_(t)]); }
function ensureHeaders_(sheet) { const current=sheet.getRange(1,1,1,HEADERS.length).getValues()[0]; if(!current.every((v,i)=>String(v)===HEADERS[i]))sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]); }
function getSheet_() { const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME); if(!s)throw new Error('Crie uma aba chamada '+CONFIG.SHEET_NAME); return s; }
function index_(headers) { const out={}; HEADERS.forEach(h=>out[h]=headers.indexOf(h)); return out; }
function setWriting_(value) { if(value) PropertiesService.getScriptProperties().setProperty('HARMONY_WRITING','1'); else PropertiesService.getScriptProperties().deleteProperty('HARMONY_WRITING'); }
function getToken_() { const token=PropertiesService.getScriptProperties().getProperty(CONFIG.TOKEN_PROPERTY); if(!token)throw new Error('Configure a propriedade HARMONY_TOKEN com o token da conexão do Harmony Hub.'); return token; }
function call_(action,payload) { const response=UrlFetchApp.fetch(CONFIG.API_URL,{method:'post',contentType:'application/json',payload:JSON.stringify(Object.assign({token:getToken_(),action:action},payload||{})),muteHttpExceptions:true}); const text=response.getContentText(); if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error(text); return JSON.parse(text); }
