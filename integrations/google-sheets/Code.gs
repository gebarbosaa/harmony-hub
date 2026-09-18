/**
 * HARMONY HUB -> GOOGLE SHEETS
 *
 * Fluxo oficial:
 * Google Sheets -> Supabase -> Harmony Hub
 *
 * A planilha envia alterações para o Supabase.
 * Alterações feitas no App/Supabase NÃO são copiadas de volta para a planilha.
 *
 * As três abas oficiais são:
 *   Receitas
 *   Despesas
 *   Parcelamentos
 *
 * Configure o token em Apps Script > Configurações do projeto >
 * Propriedades do script:
 * HARMONY_TOKEN = token gerado pelo Harmony Hub.
 */

const CONFIG = {
  API_URL: 'https://cyopbtfcnyetoolgwqyt.supabase.co/functions/v1/spreadsheet-sync',
  TOKEN_PROPERTY: 'HARMONY_TOKEN',
  POLL_MINUTES: 1,
  SHEETS: {
    RECEITAS: 'Receitas',
    DESPESAS: 'Despesas',
    PARCELAMENTOS: 'Parcelamentos',
  },
};

const TRANSACTION_FIELDS = {
  id: ['id', 'ID'],
  date: ['date', 'data', 'Data'],
  description: ['description', 'descricao', 'descrição', 'Descrição'],
  amount: ['amount', 'valor', 'Valor'],
  category: ['category', 'categoria', 'Categoria'],
  pay_method: ['pay_method', 'payment_method', 'forma_pagamento', 'forma de pagamento', 'pagamento', 'Pagamento'],
  card_name: ['card_name', 'cartao', 'cartão', 'cartao_nome', 'Cartão'],
  responsible: ['responsible', 'responsavel', 'responsável', 'Responsável'],
  installment_current: ['installment_current', 'parcela_atual', 'parcela atual', 'Parcela Atual'],
  installment_total: ['installment_total', 'parcelas', 'total_parcelas', 'total parcelas', 'Parcelas'],
  paid: ['paid', 'pago', 'PAGO', 'Pago'],
  is_fixed: ['is_fixed', 'fixo', 'fixa', 'Fixo', 'Fixa'],
  deleted: ['deleted', 'excluido', 'excluído', 'Excluir', 'excluir'],
};

const INSTALLMENT_FIELDS = {
  id: ['id', 'ID'],
  name: ['name', 'nome', 'descrição', 'descricao', 'Descrição', 'Nome'],
  purchase_date: ['purchase_date', 'date', 'data_compra', 'data compra', 'data', 'Data'],
  total_amount: ['total_amount', 'valor_total', 'valor total', 'total', 'Valor Total', 'Valor'],
  installments_count: ['installments_count', 'installments', 'parcelas', 'qtd_parcelas', 'quantidade_parcelas', 'Quantidade de Parcelas'],
  paid_count: ['paid_count', 'parcelas_pagas', 'parcelas pagas', 'pagas', 'Parcelas Pagas'],
  category: ['category', 'categoria', 'Categoria'],
  pay_method: ['pay_method', 'payment_method', 'forma_pagamento', 'forma de pagamento', 'pagamento', 'Pagamento'],
  card_name: ['card_name', 'cartao', 'cartão', 'cartao_nome', 'Cartão'],
  responsible: ['responsible', 'responsavel', 'responsável', 'Responsável'],
  payment_method_name: ['payment_method_name', 'nome_pagamento', 'nome forma pagamento'],
  sync_key: ['sync_key', 'chave_sync', 'chave'],
  deleted: ['deleted', 'excluido', 'excluído', 'Excluir', 'excluir'],
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Harmony Hub')
    .addItem('Sincronizar agora', 'syncNow')
    .addItem('Configurar sincronização automática', 'installTriggers')
    .addToUi();
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['syncNow', 'onEditInstalled'].includes(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncNow')
    .timeBased()
    .everyMinutes(CONFIG.POLL_MINUTES)
    .create();

  ScriptApp.newTrigger('onEditInstalled')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  syncNow();
}

function onEditInstalled(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const name = sheet.getName();

  if (!Object.values(CONFIG.SHEETS).includes(name) || e.range.getRow() <= 1) return;
  if (PropertiesService.getScriptProperties().getProperty('HARMONY_WRITING') === '1') return;

  pushRow_(sheet, e.range.getRow());
}

/**
 * Lê as três abas e envia somente alterações da planilha para o Supabase.
 */
function syncNow() {
  getToken_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    pushSheet_(CONFIG.SHEETS.RECEITAS);
    pushSheet_(CONFIG.SHEETS.DESPESAS);
    pushSheet_(CONFIG.SHEETS.PARCELAMENTOS);
  } finally {
    lock.releaseLock();
  }
}

function pushSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Não encontrei a aba "' + sheetName + '". Crie as três abas: Receitas, Despesas e Parcelamentos.');

  ensureTrackingColumns_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const headers = getHeaders_(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  if (sheetName === CONFIG.SHEETS.PARCELAMENTOS) {
    pushInstallmentBatch_(sheet, headers, values);
    return;
  }

  const type = sheetName === CONFIG.SHEETS.RECEITAS ? 'RECEITA' : 'DESPESA';
  const rows = [];
  const rowNumbers = [];
  const deletedRows = [];

  values.forEach((rowValues, index) => {
    const rowNumber = index + 2;
    const row = mapRow_(headers, rowValues, TRANSACTION_FIELDS);

    if (isYes_(row.deleted)) {
      if (row.id) deletedRows.push({ rowNumber: rowNumber, id: String(row.id) });
      return;
    }

    const date = normalizeDate_(row.date);
    const amount = parseAmount_(row.amount);

    if (!date || amount <= 0 || !String(row.description || '').trim()) return;

    rows.push({
      id: row.id ? String(row.id) : undefined,
      date: date,
      description: String(row.description).trim(),
      amount: amount,
      type: type,
      category: String(row.category || 'OUTROS').trim() || 'OUTROS',
      pay_method: normalizePayMethod_(row.pay_method),
      card_name: row.card_name ? String(row.card_name).trim() : null,
      responsible: String(row.responsible || 'AMBAS').trim() || 'AMBAS',
      installment_current: row.installment_current ? parseInstallmentValue_(row.installment_current, 'current') : null,
      installment_total: row.installment_total ? parseInstallmentValue_(row.installment_total, 'total') : null,
      paid: row.paid === '' || row.paid == null ? true : !isNo_(row.paid),
      is_fixed: isYes_(row.is_fixed),
    });
    rowNumbers.push(rowNumber);
  });

  pushBatch_(rows, rowNumbers, sheet, headers, 'batch_upsert', 'transactions');

  deletedRows.forEach(item => {
    call_('delete', { id: item.id });
  });
}

function pushBatch_(rows, rowNumbers, sheet, headers, action, resultKey) {
  const BATCH_SIZE = 100;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const batchRowNumbers = rowNumbers.slice(start, start + BATCH_SIZE);

    // PostgreSQL não permite que o mesmo ID apareça duas vezes no mesmo
    // INSERT ... ON CONFLICT DO UPDATE. Se a planilha tiver um ID repetido,
    // tratamos a segunda ocorrência como um novo lançamento para que uma
    // linha não sobrescreva outra acidentalmente.
    const seenIds = {};
    const safeBatch = batch.map(function(row) {
      if (!row.id) return row;

      const id = String(row.id);
      if (seenIds[id]) {
        const copy = Object.assign({}, row);
        delete copy.id;
        return copy;
      }

      seenIds[id] = true;
      return row;
    });

    const result = call_(action, { rows: safeBatch });
    const returned = result && Array.isArray(result[resultKey]) ? result[resultKey] : [];

    safeBatch.forEach(function(row, index) {
      if (!row.id) {
        const returnedRow = returned[index];
        if (returnedRow && returnedRow.id) {
          writeId_(sheet, batchRowNumbers[index], headers, returnedRow.id);
        }
      }
    });
  }
}

function pushInstallmentBatch_(sheet, headers, values) {
  const rows = [];
  const rowNumbers = [];
  const deletedRows = [];

  values.forEach((rowValues, index) => {
    const rowNumber = index + 2;
    const row = mapRow_(headers, rowValues, INSTALLMENT_FIELDS);

    if (isYes_(row.deleted)) {
      if (row.id) deletedRows.push({ rowNumber: rowNumber, id: String(row.id) });
      return;
    }

    const purchaseDate = normalizeDate_(row.purchase_date);
    const totalAmount = parseAmount_(row.total_amount);
    const count = Math.max(1, parseInstallmentValue_(row.installments_count || 1, 'total'));

    if (!purchaseDate || totalAmount <= 0 || !String(row.name || '').trim()) return;

    rows.push({
      id: row.id ? String(row.id) : undefined,
      name: String(row.name).trim(),
      purchase_date: purchaseDate,
      total_amount: totalAmount,
      installments_count: Number.isFinite(count) ? count : 1,
      paid_count: Math.max(0, Number(row.paid_count || 0)),
      category: String(row.category || 'OUTROS').trim() || 'OUTROS',
      pay_method: normalizePayMethod_(row.pay_method),
      card_name: row.card_name ? String(row.card_name).trim() : null,
      responsible: String(row.responsible || 'AMBAS').trim() || 'AMBAS',
      payment_method_name: row.payment_method_name ? String(row.payment_method_name).trim() : null,
      sync_key: row.sync_key ? String(row.sync_key).trim() : null,
    });
    rowNumbers.push(rowNumber);
  });

  const BATCH_SIZE = 100;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const batchRowNumbers = rowNumbers.slice(start, start + BATCH_SIZE);

    const result = call_('batch_upsert_installment', { rows: batch });
    const returned = result && Array.isArray(result.installments) ? result.installments : [];

    const rowsWithoutId = [];
    batch.forEach((row, index) => {
      if (!row.id) rowsWithoutId.push({ rowNumber: batchRowNumbers[index] });
    });

    rowsWithoutId.forEach((item, resultIndex) => {
      const returnedRow = returned[resultIndex];
      if (returnedRow && returnedRow.id) {
        writeId_(sheet, item.rowNumber, headers, returnedRow.id);
      }
    });
  }

  deletedRows.forEach(item => {
    call_('delete_installment', { id: item.id });
  });
}
function pushRow_(sheet, rowNumber) {
  const name = sheet.getName();
  const headers = getHeaders_(sheet);
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  if (name === CONFIG.SHEETS.PARCELAMENTOS) {
    pushInstallmentRow_(sheet, rowNumber, headers, values);
    return;
  }

  pushTransactionRow_(sheet, rowNumber, headers, values, name === CONFIG.SHEETS.RECEITAS ? 'RECEITA' : 'DESPESA');
}
function pushTransactionRow_(sheet, rowNumber, headers, values, type) {
  const row = mapRow_(headers, values, TRANSACTION_FIELDS);

  if (isYes_(row.deleted)) {
    if (row.id) call_('delete', { id: String(row.id) });
    return;
  }

  const date = normalizeDate_(row.date);
  const amount = parseAmount_(row.amount);

  if (!date || amount <= 0 || !String(row.description || '').trim()) return;

  const payload = {
    id: row.id ? String(row.id) : undefined,
    date: date,
    description: String(row.description).trim(),
    amount: amount,
    type: type,
    category: String(row.category || 'OUTROS').trim() || 'OUTROS',
    pay_method: normalizePayMethod_(row.pay_method),
    card_name: row.card_name ? String(row.card_name).trim() : null,
    responsible: String(row.responsible || 'AMBAS').trim() || 'AMBAS',
    installment_current: row.installment_current ? Number(row.installment_current) : null,
    installment_total: row.installment_total ? Number(row.installment_total) : null,
    paid: row.paid === '' || row.paid == null ? true : !isNo_(row.paid),
    is_fixed: isYes_(row.is_fixed),
  };

  const result = call_('upsert', { row: payload });
  const transaction = result && Array.isArray(result.transactions) ? result.transactions[0] : null;

  if (transaction && !row.id) writeId_(sheet, rowNumber, headers, transaction.id);
}

function pushInstallmentRow_(sheet, rowNumber, headers, values) {
  const row = mapRow_(headers, values, INSTALLMENT_FIELDS);

  if (isYes_(row.deleted)) {
    if (row.id) call_('delete_installment', { id: String(row.id) });
    return;
  }

  const purchaseDate = normalizeDate_(row.purchase_date);
  const totalAmount = parseAmount_(row.total_amount);
  const count = Math.max(1, parseInstallmentValue_(row.installments_count || 1, 'total'));

  if (!purchaseDate || totalAmount <= 0 || !String(row.name || '').trim()) return;

  const payload = {
    id: row.id ? String(row.id) : undefined,
    name: String(row.name).trim(),
    purchase_date: purchaseDate,
    total_amount: totalAmount,
    installments_count: Number.isFinite(count) ? count : 1,
    paid_count: Math.max(0, Number(row.paid_count || 0)),
    category: String(row.category || 'OUTROS').trim() || 'OUTROS',
    pay_method: normalizePayMethod_(row.pay_method),
    card_name: row.card_name ? String(row.card_name).trim() : null,
    responsible: String(row.responsible || 'AMBAS').trim() || 'AMBAS',
    payment_method_name: row.payment_method_name ? String(row.payment_method_name).trim() : null,
    sync_key: row.sync_key ? String(row.sync_key).trim() : null,
  };

  const result = call_('upsert_installment', { row: payload });
  const installment = result && Array.isArray(result.installments) ? result.installments[0] : null;

  if (installment && !row.id) writeId_(sheet, rowNumber, headers, installment.id);
}

function getHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(v => String(v || '').trim());
}

/**
 * Não substitui o cabeçalho existente.
 * Apenas adiciona colunas técnicas ID e deleted quando não existirem.
 */
function ensureTrackingColumns_(sheet) {
  let headers = getHeaders_(sheet);

  if (!findHeader_(headers, ['id', 'ID'])) {
    sheet.getRange(1, headers.length + 1).setValue('id');
    headers.push('id');
  }

  if (!findHeader_(headers, ['deleted', 'excluido', 'excluído', 'Excluir', 'excluir'])) {
    sheet.getRange(1, headers.length + 1).setValue('deleted');
  }
}

function mapRow_(headers, values, fields) {
  const out = {};

  Object.keys(fields).forEach(key => {
    const index = findHeaderIndex_(headers, fields[key]);
    out[key] = index >= 0 ? values[index] : '';
  });

  return out;
}

function findHeaderIndex_(headers, aliases) {
  const normalized = headers.map(normalizeHeader_);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader_(alias));
    if (index >= 0) return index;
  }
  return -1;
}

function findHeader_(headers, aliases) {
  return findHeaderIndex_(headers, aliases) >= 0;
}

function normalizeHeader_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function writeId_(sheet, rowNumber, headers, id) {
  const index = findHeaderIndex_(headers, ['id', 'ID']);
  if (index < 0) return;

  setWriting_(true);
  try {
    sheet.getRange(rowNumber, index + 1).setValue(id || '');
  } finally {
    setWriting_(false);
  }
}

function normalizeDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const text = String(value || '').trim();
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (br) {
    return br[3] + '-' + String(br[2]).padStart(2, '0') + '-' + String(br[1]).padStart(2, '0');
  }

  return '';
}

function parseInstallmentValue_(value, part) {
  const text = String(value == null ? '' : value).trim();

  if (!text) return 0;

  // Aceita: 4x, 4 X, 4x de 10, 4/10 e 4.
  const fraction = text.match(/^(\d+)\s*(?:\/|de)\s*(\d+)/i);
  if (fraction) {
    return part === 'current'
      ? Number(fraction[1])
      : Number(fraction[2]);
  }

  const x = text.match(/(\d+)\s*x/i);
  if (x) return Number(x[1]);

  const number = Number(text.replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function parseAmount_(value) {
  if (typeof value === 'number') return Math.abs(value);

  let text = String(value || '').trim().replace(/R\$|\s/g, '');
  if (!text) return 0;

  if (text.includes(',') && text.includes('.')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }

  const number = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function normalizePayMethod_(value) {
  const text = normalizeHeader_(value);

  if (text.includes('credito') || text.includes('cartao')) return 'CREDITO';
  if (text.includes('debito')) return 'DEBITO';
  if (text.includes('alimentacao') || text.includes('refeicao')) return 'ALIMENTACAO';
  if (text.includes('dinheiro')) return 'DINHEIRO';
  if (text.includes('boleto')) return 'BOLETO';
  if (text.includes('transfer')) return 'TRANSFERENCIA';
  return 'PIX';
}

function isYes_(value) {
  return ['SIM', 'S', 'TRUE', '1', 'YES'].includes(String(value || '').trim().toUpperCase());
}

function isNo_(value) {
  return ['NAO', 'NÃO', 'N', 'FALSE', '0', 'NO'].includes(String(value || '').trim().toUpperCase());
}

function setWriting_(value) {
  if (value) {
    PropertiesService.getScriptProperties().setProperty('HARMONY_WRITING', '1');
  } else {
    PropertiesService.getScriptProperties().deleteProperty('HARMONY_WRITING');
  }
}

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty(CONFIG.TOKEN_PROPERTY);
  if (!token) throw new Error('Configure a propriedade HARMONY_TOKEN com o token da conexão do Harmony Hub.');
  return token;
}

function call_(action, payload) {
  const response = UrlFetchApp.fetch(CONFIG.API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(Object.assign({
      token: getToken_(),
      action: action
    }, payload || {})),
    muteHttpExceptions: true
  });

  const text = response.getContentText();

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(text);
  }

  return JSON.parse(text);
}
