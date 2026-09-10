/**
 * HARMONY HUB <-> GOOGLE SHEETS
 * Cole este arquivo em Extensões > Apps Script da planilha.
 * Preencha TOKEN. O token é gerado pelo Harmony Hub.
 */
const CONFIG = {
  API_URL: 'https://cyopbtfcnyetoolgwqyt.supabase.co/functions/v1/spreadsheet-sync',
  TOKEN: 'COLE_AQUI_O_TOKEN_GERADO_PELO_HARMONY_HUB',
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

function syncNow() {
  if (CONFIG.TOKEN.indexOf('COLE_AQUI') === 0) throw new Error('Configure o TOKEN do Harmony Hub em CONFIG.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    const props = PropertiesService.getScriptProperties();
    let cursor = Number(props.getProperty('HARMONY_CURSOR') || 0);

    // Primeira sincronização: traz todo o estado atual do Supabase.
    if (props.getProperty('HARMONY_INITIALIZED') !== '1') {
      const snapshot = call_('snapshot', {});
      setWriting_(true);
      try {
        const rows = snapshot.rows || [];
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
        if (rows.length) sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows.map(t => transactionToArray_(t)));
        cursor = Number(snapshot.cursor || 0);
        props.setProperty('HARMONY_CURSOR', String(cursor));
        props.setProperty('HARMONY_INITIALIZED', '1');
      } finally { setWriting_(false); }
    }

    // Site -> planilha. Só eventos originados no app entram aqui, evitando loop.
    const pull = call_('pull', { cursor: cursor, limit: 500 });
    (pull.events || []).forEach(event => applyEvent_(sheet, event));
    if (Number.isFinite(Number(pull.cursor))) props.setProperty('HARMONY_CURSOR', String(pull.cursor));

    // Captura marcações de exclusão feitas na planilha.
    pushPendingDeletes_(sheet);
  } finally { lock.releaseLock(); }
}

function pushPendingDeletes_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const idx = index_(HEADERS);
  for (let r = values.length; r >= 2; r--) {
    if (String(values[r-1][idx.deleted] || '').toUpperCase() === 'SIM') {
      const id = String(values[r-1][idx.id] || '');
      if (id) call_('delete', { id: id });
      setWriting_(true); try { sheet.deleteRow(r); } finally { setWriting_(false); }
    }
  }
}

function pushRow_(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const idx = index_(HEADERS);
  if (String(values[idx.deleted] || '').toUpperCase() === 'SIM') {
    const id = String(values[idx.id] || '');
    if (id) call_('delete', { id: id });
    setWriting_(true); try { sheet.deleteRow(rowNumber); } finally { setWriting_(false); }
    return;
  }
  const row = {}; HEADERS.forEach((h,i) => row[h] = values[i]);
  if (row.date instanceof Date) row.date = Utilities.formatDate(row.date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  row.paid = !['NÃO','NAO','FALSE'].includes(String(row.paid).toUpperCase());
  row.is_fixed = ['SIM','TRUE'].includes(String(row.is_fixed).toUpperCase());
  const result = call_('upsert', { row: row });
  if (result.transaction) {
    setWriting_(true);
    try { writeTransaction_(sheet, findRowById_(sheet, String(row.id || '')) || rowNumber, result.transaction); }
    finally { setWriting_(false); }
  }
}

function applyEvent_(sheet, event) {
  if (event.source !== 'APP') return;
  const id = String(event.transaction_id || ''); if (!id) return;
  setWriting_(true);
  try {
    if (event.operation === 'DELETE') { const row = findRowById_(sheet,id); if (row) sheet.deleteRow(row); return; }
    if (event.payload) writeTransaction_(sheet, findRowById_(sheet,id) || Math.max(2,sheet.getLastRow()+1), event.payload);
  } finally { setWriting_(false); }
}

function transactionToArray_(t) {
  return [t.id||'',t.date||'',t.description||'',t.amount||0,t.type||'',t.category||'',t.pay_method||'',t.card_name||'',t.responsible||'',t.installment_current||'',t.installment_total||'',t.paid===false?'NÃO':'SIM',t.is_fixed?'SIM':'NÃO',t.updated_at||'',''];
}
function writeTransaction_(sheet,rowNumber,t) { sheet.getRange(rowNumber,1,1,HEADERS.length).setValues([transactionToArray_(t)]); }
function findRowById_(sheet,id) { if(!id||sheet.getLastRow()<2)return null; const ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues(); for(let i=0;i<ids.length;i++)if(String(ids[i][0])===id)return i+2; return null; }
function ensureHeaders_(sheet) { const current=sheet.getRange(1,1,1,HEADERS.length).getValues()[0]; if(!current.every((v,i)=>String(v)===HEADERS[i]))sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]); }
function getSheet_() { const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME); if(!s)throw new Error('Crie uma aba chamada '+CONFIG.SHEET_NAME); return s; }
function index_(headers) { const out={}; HEADERS.forEach(h=>out[h]=headers.indexOf(h)); return out; }
function setWriting_(value) { if(value) PropertiesService.getScriptProperties().setProperty('HARMONY_WRITING','1'); else PropertiesService.getScriptProperties().deleteProperty('HARMONY_WRITING'); }
function call_(action,payload) { const response=UrlFetchApp.fetch(CONFIG.API_URL,{method:'post',contentType:'application/json',payload:JSON.stringify(Object.assign({token:CONFIG.TOKEN,action:action},payload||{})),muteHttpExceptions:true}); const text=response.getContentText(); if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error(text); return JSON.parse(text); }
