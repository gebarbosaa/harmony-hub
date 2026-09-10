/**
 * HARMONY HUB <-> GOOGLE SHEETS
 *
 * Cole este arquivo em Extensões > Apps Script da planilha.
 * Preencha TOKEN e, se necessário, altere SHEET_NAME.
 * O token é gerado pelo Harmony Hub na tela de integração.
 */

const CONFIG = {
  API_URL: 'https://cyopbtfcnyetoolgwqyt.supabase.co/functions/v1/spreadsheet-sync',
  TOKEN: 'COLE_AQUI_O_TOKEN_GERADO_PELO_HARMONY_HUB',
  SHEET_NAME: 'Lançamentos',
  POLL_MINUTES: 1,
};

const HEADERS = [
  'id','date','description','amount','type','category','pay_method','card_name',
  'responsible','installment_current','installment_total','paid','is_fixed','updated_at','deleted'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Harmony Hub')
    .addItem('Sincronizar agora', 'syncNow')
    .addItem('Configurar sincronização automática', 'installTrigger')
    .addToUi();
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncNow').timeBased().everyMinutes(CONFIG.POLL_MINUTES).create();
  syncNow();
}

function syncNow() {
  if (CONFIG.TOKEN.indexOf('COLE_AQUI') === 0) throw new Error('Configure o TOKEN do Harmony Hub em CONFIG.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    const props = PropertiesService.getScriptProperties();
    const cursor = Number(props.getProperty('HARMONY_CURSOR') || 0);

    // 1) Site -> planilha
    const pull = call_('pull', { cursor: cursor, limit: 500 });
    (pull.events || []).forEach(event => applyEvent_(sheet, event));
    if (Number.isFinite(Number(pull.cursor))) props.setProperty('HARMONY_CURSOR', String(pull.cursor));

    // 2) Planilha -> site: linhas marcadas como alteradas pelo usuário
    // onEdit envia imediatamente; esta etapa também captura alterações pendentes.
    pushPendingRows_(sheet);
  } finally {
    lock.releaseLock();
  }
}

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (PropertiesService.getScriptProperties().getProperty('HARMONY_WRITING') === '1') return;
  const row = e.range.getRow();
  if (row <= 1) return;
  pushRow_(sheet, row);
}

function pushPendingRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const headers = values[0].map(String);
  const idx = index_(headers);
  for (let r = 2; r <= values.length; r++) {
    if (String(values[r-1][idx.deleted] || '').toUpperCase() === 'SIM') {
      const id = String(values[r-1][idx.id] || '');
      if (id) {
        call_('delete', { id: id });
        sheet.deleteRow(r);
        r--;
      }
    }
  }
}

function pushRow_(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const idx = index_(HEADERS);
  if (String(values[idx.deleted] || '').toUpperCase() === 'SIM') {
    const id = String(values[idx.id] || '');
    if (id) call_('delete', { id: id });
    sheet.deleteRow(rowNumber);
    return;
  }
  const row = {};
  HEADERS.forEach((h, i) => row[h] = values[i]);
  if (row.date instanceof Date) row.date = Utilities.formatDate(row.date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  row.paid = String(row.paid).toUpperCase() !== 'NÃO' && String(row.paid).toUpperCase() !== 'FALSE';
  row.is_fixed = String(row.is_fixed).toUpperCase() === 'SIM' || String(row.is_fixed).toUpperCase() === 'TRUE';
  const result = call_('upsert', { row: row });
  if (result.transaction) {
    PropertiesService.getScriptProperties().setProperty('HARMONY_WRITING', '1');
    try { writeTransaction_(sheet, findRowById_(sheet, String(row.id || '')) || rowNumber, result.transaction); }
    finally { PropertiesService.getScriptProperties().deleteProperty('HARMONY_WRITING'); }
  }
}

function applyEvent_(sheet, event) {
  if (event.source !== 'APP') return;
  const id = String(event.transaction_id || '');
  if (!id) return;
  PropertiesService.getScriptProperties().setProperty('HARMONY_WRITING', '1');
  try {
    if (event.operation === 'DELETE') {
      const row = findRowById_(sheet, id);
      if (row) sheet.deleteRow(row);
      return;
    }
    if (event.payload) {
      const row = findRowById_(sheet, id) || Math.max(2, sheet.getLastRow() + 1);
      writeTransaction_(sheet, row, event.payload);
    }
  } finally { PropertiesService.getScriptProperties().deleteProperty('HARMONY_WRITING'); }
}

function writeTransaction_(sheet, rowNumber, t) {
  const out = [
    t.id || '', t.date || '', t.description || '', t.amount || 0, t.type || '', t.category || '',
    t.pay_method || '', t.card_name || '', t.responsible || '', t.installment_current || '',
    t.installment_total || '', t.paid === false ? 'NÃO' : 'SIM', t.is_fixed ? 'SIM' : 'NÃO', t.updated_at || '', ''
  ];
  sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([out]);
}

function findRowById_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return null;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (current.every((v, i) => String(v) === HEADERS[i])) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Crie uma aba chamada ' + CONFIG.SHEET_NAME);
  return sheet;
}

function index_(headers) {
  const out = {};
  HEADERS.forEach(h => out[h] = headers.indexOf(h));
  return out;
}

function call_(action, payload) {
  const body = Object.assign({ token: CONFIG.TOKEN, action: action }, payload || {});
  const response = UrlFetchApp.fetch(CONFIG.API_URL, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true
  });
  const text = response.getContentText();
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error(text);
  return JSON.parse(text);
}
