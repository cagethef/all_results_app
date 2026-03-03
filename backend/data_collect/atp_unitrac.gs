// ===== CONFIG =====

// <<<<<< TROCAR AQUI: Pasta do Unitrac (Drive folder)
const UNITRAC_FOLDER_ID = "1LoOSehTkiR1H3LAiXAPcoNvfBToSk0jo";

const UNITRAC_GCP_PROJECT_ID = "tractian-bi";
const UNITRAC_BQ_DATASET = "operations";

// Tabelas no BigQuery (conforme sua nomenclatura)
const UNITRAC_TABLE_INPUTS = "operations_atp_unitrac_inputs_raw";
const UNITRAC_TABLE_RESULTS = "operations_atp_unitrac_results_raw";

// KV schema (tudo STRING) - inclui protocol
const UNITRAC_KV_SCHEMA_FIELDS = [
  "id",
  "file_type",
  "upload_date",
  "upload_time",
  "lote",
  "protocol",
  "source_file_name",
  "ingestion_ts",
  "row_index",
  "variable",
  "value"
];

// ===== ENTRYPOINT =====

function UNITRAC_runDriveUnitracCsvToBigQueryIncremental() {
  UNITRAC_ensureKvTableExists_(UNITRAC_TABLE_INPUTS);
  UNITRAC_ensureKvTableExists_(UNITRAC_TABLE_RESULTS);

  const folder = UNITRAC_getFolderByIdOrThrow_(UNITRAC_FOLDER_ID);
  const it = folder.getFiles();

  const inputsFiles = [];
  const resultsFiles = [];

  let scanned = 0, ignored = 0;

  Logger.log("UNITRAC | Varredura pasta: %s", UNITRAC_FOLDER_ID);

  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;

    const meta = UNITRAC_parseFilenameMeta_(name);
    if (!meta) { ignored++; continue; }

    if (meta.file_type === "inputs") inputsFiles.push({ file, meta });
    else if (meta.file_type === "results") resultsFiles.push({ file, meta });
    else ignored++;
  }

  Logger.log(
    "UNITRAC | Varredura concluída. total=%s | inputs=%s | results=%s | ignorados=%s",
    scanned, inputsFiles.length, resultsFiles.length, ignored
  );

  UNITRAC_processGroupInputs_(inputsFiles);
  UNITRAC_processGroupResults_(resultsFiles);

  Logger.log("UNITRAC | Finalizado.");
}

// Alias opcional (se quiser rodar sem prefixo no dropdown)
function runDriveUnitracCsvToBigQueryIncremental() {
  return UNITRAC_runDriveUnitracCsvToBigQueryIncremental();
}

// ===== INPUTS =====

function UNITRAC_processGroupInputs_(items) {
  if (!items.length) {
    Logger.log("UNITRAC | Inputs: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = UNITRAC_fetchExistingIdsFromBigQuery_(UNITRAC_TABLE_INPUTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("UNITRAC | Inputs: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("UNITRAC | [inputs %s/%s] %s", done, newItems.length, file.getName());
    const rows = UNITRAC_rowsFromInputsCsvKv_(file, meta);
    UNITRAC_streamInsertObjects_(UNITRAC_TABLE_INPUTS, rows);
  }
}

function UNITRAC_rowsFromInputsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = UNITRAC_readCsvTextRobust_(file);
  const matrix = UNITRAC_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("UNITRAC | CSV vazio: " + name);

  const ingestionTs = new Date().toISOString();
  const out = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const variable = (row[0] === undefined || row[0] === null) ? "" : String(row[0]);
    const value = (row[1] === undefined || row[1] === null) ? "" : String(row[1]);

    if (!variable && !value) continue;

    out.push({
      id: name,
      file_type: meta.file_type,
      upload_date: meta.upload_date,
      upload_time: meta.upload_time,
      lote: meta.lote,
      protocol: meta.protocol,
      source_file_name: name,
      ingestion_ts: ingestionTs,
      row_index: String(i),
      variable: variable,
      value: value
    });
  }

  Logger.log("UNITRAC | Inputs %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== RESULTS =====

function UNITRAC_processGroupResults_(items) {
  if (!items.length) {
    Logger.log("UNITRAC | Results: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = UNITRAC_fetchExistingIdsFromBigQuery_(UNITRAC_TABLE_RESULTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("UNITRAC | Results: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("UNITRAC | [results %s/%s] %s", done, newItems.length, file.getName());
    const rows = UNITRAC_rowsFromResultsCsvKv_(file, meta);
    UNITRAC_streamInsertObjects_(UNITRAC_TABLE_RESULTS, rows);
  }
}

/**
 * Results (Unitrac) = mesma lógica do EnergyTrac:
 * - Primeira coluna: "Teste"
 * - Restante: métricas
 * KV:
 *   variable = "<Teste>__<coluna>"
 *   value    = célula
 */
function UNITRAC_rowsFromResultsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = UNITRAC_readCsvTextRobust_(file);
  const matrix = UNITRAC_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("UNITRAC | CSV vazio: " + name);

  const header = (matrix[0] || []).map(h => String(h ?? "").trim());
  if (!header.length) throw new Error("UNITRAC | Header vazio: " + name);

  const testColIdx = 0; // "Teste"
  const ingestionTs = new Date().toISOString();
  const out = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const hasAny = row.some(v => String(v ?? "").trim() !== "");
    if (!hasAny) continue;

    const testName = String(row[testColIdx] ?? "").trim();
    if (!testName) continue;

    for (let c = 0; c < header.length; c++) {
      if (c === testColIdx) continue;

      const colName = header[c] || `col_${c}`;
      const cell = (row[c] === undefined || row[c] === null) ? "" : String(row[c]);

      // se quiser reduzir volume, pule vazios:
      // if (String(cell).trim() === "") continue;

      out.push({
        id: name,
        file_type: meta.file_type,
        upload_date: meta.upload_date,
        upload_time: meta.upload_time,
        lote: meta.lote,
        protocol: meta.protocol,
        source_file_name: name,
        ingestion_ts: ingestionTs,
        row_index: String(i),
        variable: `${testName}__${colName}`,
        value: cell
      });
    }
  }

  Logger.log("UNITRAC | Results %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== BIGQUERY =====

function UNITRAC_ensureKvTableExists_(tableId) {
  let table = null;

  try {
    table = UNITRAC_withRetry_(
      () => BigQuery.Tables.get(UNITRAC_GCP_PROJECT_ID, UNITRAC_BQ_DATASET, tableId),
      { opName: "Tables.get " + tableId }
    );
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (!/Not found/i.test(msg)) throw e;
  }

  if (!table) {
    Logger.log("UNITRAC | Criando tabela KV: %s.%s.%s", UNITRAC_GCP_PROJECT_ID, UNITRAC_BQ_DATASET, tableId);

    const fields = UNITRAC_KV_SCHEMA_FIELDS.map(name => ({
      name,
      type: "STRING",
      mode: "NULLABLE"
    }));

    const tableResource = {
      tableReference: { projectId: UNITRAC_GCP_PROJECT_ID, datasetId: UNITRAC_BQ_DATASET, tableId },
      schema: { fields }
    };

    UNITRAC_withRetry_(
      () => BigQuery.Tables.insert(tableResource, UNITRAC_GCP_PROJECT_ID, UNITRAC_BQ_DATASET),
      { opName: "Tables.insert " + tableId }
    );

    Logger.log("UNITRAC | Tabela criada: %s", tableId);
    return;
  }

  const existing = new Set((table.schema?.fields || []).map(f => f.name));
  const missing = UNITRAC_KV_SCHEMA_FIELDS.filter(name => !existing.has(name));
  if (!missing.length) return;

  Logger.log("UNITRAC | Tabela %s: colunas faltantes: %s", tableId, missing.join(", "));

  const mergedFields = (table.schema.fields || []).concat(
    missing.map(name => ({ name, type: "STRING", mode: "NULLABLE" }))
  );

  const patch = { schema: { fields: mergedFields } };

  UNITRAC_withRetry_(
    () => BigQuery.Tables.patch(patch, UNITRAC_GCP_PROJECT_ID, UNITRAC_BQ_DATASET, tableId),
    { opName: "Tables.patch " + tableId }
  );

  Logger.log("UNITRAC | Tabela %s: schema atualizado.", tableId);
}

function UNITRAC_fetchExistingIdsFromBigQuery_(tableId, ids) {
  const existing = new Set();
  if (!ids.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const inList = batch.map(s => `'${UNITRAC_escapeSqlString_(String(s))}'`).join(",");

    const query = `
      SELECT DISTINCT id
      FROM \`${UNITRAC_GCP_PROJECT_ID}.${UNITRAC_BQ_DATASET}.${tableId}\`
      WHERE id IN (${inList})
    `;

    const res = UNITRAC_withRetry_(
      () => BigQuery.Jobs.query({ query, useLegacySql: false }, UNITRAC_GCP_PROJECT_ID),
      { opName: "Jobs.query existing ids " + tableId }
    );

    if (res.rows) {
      for (const r of res.rows) existing.add(String(r.f[0].v));
    }
  }

  return existing;
}

function UNITRAC_streamInsertObjects_(tableId, objects) {
  if (!objects.length) return;

  const chunkSize = 500;
  const total = objects.length;
  let sent = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);

    const request = {
      rows: chunk.map(o => ({
        insertId: Utilities.getUuid(),
        json: o
      }))
    };

    const resp = UNITRAC_withRetry_(
      () => BigQuery.Tabledata.insertAll(request, UNITRAC_GCP_PROJECT_ID, UNITRAC_BQ_DATASET, tableId),
      { opName: "Tabledata.insertAll " + tableId }
    );

    if (resp.insertErrors && resp.insertErrors.length) {
      throw new Error("UNITRAC | Falha no insertAll: " + JSON.stringify(resp.insertErrors).slice(0, 2000));
    }

    sent += chunk.length;
    Logger.log("UNITRAC | Tabela %s: enviado %s/%s linhas", tableId, sent, total);
  }
}

// ===== RETRY / BACKOFF =====

function UNITRAC_withRetry_(fn, opts) {
  opts = opts || {};
  const opName = opts.opName || "operation";
  const maxAttempts = opts.maxAttempts || 7;
  const baseMs = opts.baseMs || 500;
  const maxSleepMs = opts.maxSleepMs || 20000;

  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn();
    } catch (e) {
      lastErr = e;
      const msg = (e && e.message) ? e.message : String(e);

      if (!UNITRAC_isRetryableBigQueryError_(msg)) throw e;
      if (attempt === maxAttempts) break;

      const exp = Math.min(maxSleepMs, baseMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const sleepMs = Math.min(maxSleepMs, exp + jitter);

      Logger.log("UNITRAC | [retry %s] falhou (tentativa %s/%s): %s | aguardando %sms",
                 opName, attempt, maxAttempts, msg, sleepMs);

      Utilities.sleep(sleepMs);
    }
  }

  throw lastErr;
}

function UNITRAC_isRetryableBigQueryError_(message) {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("service is currently unavailable") ||
    m.includes("backend error") ||
    m.includes("internal error") ||
    m.includes("rate limit") ||
    m.includes("quota") ||
    m.includes("503") ||
    m.includes("timeout") ||
    m.includes("socket") ||
    m.includes("connection")
  );
}

// ===== FILENAME PARSER (UNITRAC) =====

function UNITRAC_parseFilenameMeta_(filename) {
  /**
   * Unitrac aceita variações reais:
   *
   * unitrac_inputs_YYYYMMDD_HHMMSS_#<lote>.csv
   * unitrac_inputs_YYYYMMDD_HHMMSS__#<lote>.csv
   * unitrac_inputs_YYYYMMDD_HHMMSS___##<lote>.csv
   *
   * ou seja:
   * - 1+ underscores antes do #
   * - 1+ hashes (# ou ##)
   *
   * lote: YYYYMMDD_HH_MM_<PROTOCOLO>
   * protocolo: I2C, NPN, PNP, RS486, 0-10, 4-20
   */

  const re =
    /^unitrac_(inputs|results)_(\d{8})_(\d{6})_+#+([a-z0-9_\-]+?)(?:\.csv)?$/i;

  const m = filename.match(re);
  if (!m) return null;

  // lote extraído
  let lote = String(m[4] || "").replace(/_+$/g, "");

  // valida padrão base do lote: YYYYMMDD_??_...
  if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null;

  // protocolo é sempre o último bloco do lote
  const protocol = (lote.split("_").pop() || "").toUpperCase();

  return {
    file_type: m[1].toLowerCase(),
    upload_date: m[2],
    upload_time: m[3],
    lote: lote,
    protocol: protocol
  };
}


// ===== DRIVE FOLDER ACCESS (com erro amigável) =====

function UNITRAC_getFolderByIdOrThrow_(folderId) {
  const id = String(folderId || "").trim();

  if (!id || id === "PUT_UNITRAC_FOLDER_ID_HERE") {
    throw new Error("UNITRAC | UNITRAC_FOLDER_ID não configurado. Cole aqui o ID da pasta do Drive.");
  }

  if (id.length < 15) {
    throw new Error("UNITRAC | UNITRAC_FOLDER_ID parece inválido (muito curto): " + id);
  }

  try {
    const folder = DriveApp.getFolderById(id);
    const name = folder.getName(); // força permissão
    Logger.log("UNITRAC | Pasta OK: %s (%s)", name, id);
    return folder;
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    throw new Error(
      "UNITRAC | Falha ao acessar pasta. Possíveis causas:\n" +
      "1) ID errado (você colou ID de arquivo/atalho)\n" +
      "2) Sem permissão com a conta do script (Shared Drive etc.)\n\n" +
      "FolderId=" + id + "\n" +
      "Erro original: " + msg
    );
  }
}

// ===== CSV READ / PARSE (ROBUST) =====

function UNITRAC_readCsvTextRobust_(file) {
  const blob = file.getBlob();
  const bytes = blob.getBytes();

  Logger.log("UNITRAC | Lendo: %s | mime=%s | bytes=%s",
             file.getName(), blob.getContentType(), bytes.length);

  // Detecta XLSX/ZIP disfarçado (começa com "PK")
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    throw new Error(
      "UNITRAC | Arquivo parece XLSX/ZIP (assinatura PK) e não CSV: " + file.getName() +
      " | Exporte como CSV (UTF-8)."
    );
  }

  const encodings = ["UTF-8", "ISO-8859-1", "UTF-16LE", "UTF-16BE"];
  let best = "";

  for (const enc of encodings) {
    try {
      let txt = Utilities.newBlob(bytes).getDataAsString(enc);
      txt = UNITRAC_sanitizeCsvText_(txt);

      const hasStructure =
        txt.length > 10 &&
        (txt.includes("\n") || txt.includes(",") || txt.includes(";") || txt.includes("\t") || txt.includes("|"));

      if (hasStructure) {
        Logger.log("UNITRAC | Encoding escolhido: %s", enc);
        return txt;
      }

      if (txt.length > best.length) best = txt;
    } catch (e) {}
  }

  best = UNITRAC_sanitizeCsvText_(best);
  Logger.log("UNITRAC | Encoding fallback. len=%s", best.length);
  return best;
}

function UNITRAC_sanitizeCsvText_(raw) {
  let text = String(raw ?? "");

  text = text
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u200B/g, "")
    .replace(/\u2028/g, "\n")
    .replace(/\u2029/g, "\n");

  text = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  return text;
}

function UNITRAC_parseCsvSafe_(text) {
  let raw = UNITRAC_sanitizeCsvText_(text);

  if (!raw || raw.trim() === "") {
    Logger.log("UNITRAC | CSV vazio/ilegível.");
    throw new Error("Could not parse text.");
  }

  if (!raw.endsWith("\n")) raw += "\n";

  // 1) Utilities.parseCsv com delimitadores comuns
  const delimiters = [",", ";", "\t", "|"];
  for (const d of delimiters) {
    try {
      const m = (d === ",") ? Utilities.parseCsv(raw) : Utilities.parseCsv(raw, d);
      if (m && m.length) return m;
    } catch (e) {}
  }

  // 2) detecta delimiter
  const bestDelim = UNITRAC_detectDelimiter_(raw);

  // 3) parser leniente
  try {
    const m2 = UNITRAC_parseCsvLenient_(raw, bestDelim);
    if (m2 && m2.length) return m2;
  } catch (e) {}

  // 4) fallback final
  const m3 = UNITRAC_parseCsvSplitFallback_(raw, bestDelim);
  if (m3 && m3.length) return m3;

  Logger.log("UNITRAC | head(300): %s", raw.slice(0, 300));
  Logger.log("UNITRAC | tail(300): %s", raw.slice(-300));
  throw new Error("Could not parse text.");
}

function UNITRAC_detectDelimiter_(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l !== "").slice(0, 30);
  const sample = lines.join("\n");

  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;

  for (const d of candidates) {
    const score = (sample.split(d).length - 1);
    if (score > bestScore) { bestScore = score; best = d; }
  }

  Logger.log("UNITRAC | Delimiter: %s (score=%s)", best === "\t" ? "\\t" : best, bestScore);
  return best;
}

function UNITRAC_parseCsvLenient_(text, delimiter) {
  delimiter = delimiter || ",";
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = (i + 1 < text.length) ? text[i + 1] : "";

    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length && rows[rows.length - 1].every(v => String(v ?? "").trim() === "")) {
    rows.pop();
  }

  return rows;
}

function UNITRAC_parseCsvSplitFallback_(raw, delimiter) {
  const lines = raw.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    out.push(line.split(delimiter));
  }
  return out;
}

// ===== SQL ESCAPE =====

function UNITRAC_escapeSqlString_(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
