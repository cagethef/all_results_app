// ===== CONFIG =====

// Pasta do OmniTrac (Drive folder)
const OMNITRAC_FOLDER_ID = "1qBvaIuuBuQ1B2aoiMGoATgx8ZS4RPC4w";

const OMNITRAC_GCP_PROJECT_ID = "tractian-bi";
const OMNITRAC_BQ_DATASET = "operations";

// Tabelas no BigQuery
const OMNITRAC_TABLE_INPUTS = "operations_atp_omnitrac_inputs_raw";
const OMNITRAC_TABLE_RESULTS = "operations_atp_omnitrac_results_raw";

// KV schema (tudo STRING)
const OMNITRAC_KV_SCHEMA_FIELDS = [
  "id",
  "file_type",
  "upload_date",
  "upload_time",
  "lote",
  "source_file_name",
  "ingestion_ts",
  "row_index",
  "variable",
  "value"
];

// ===== ENTRYPOINT =====

function OMNITRAC_runDriveOmniTracCsvToBigQueryIncremental() {
  OMNITRAC_ensureKvTableExists_(OMNITRAC_TABLE_INPUTS);
  OMNITRAC_ensureKvTableExists_(OMNITRAC_TABLE_RESULTS);

  const folder = OMNITRAC_getFolderByIdOrThrow_(OMNITRAC_FOLDER_ID);

  // MAIS RÁPIDO: evita iterar tudo da pasta quando tem muito arquivo
  // (CSV pode vir como text/plain em alguns casos)
  const it = folder.searchFiles('mimeType = "text/csv" or mimeType = "text/plain" or title contains ".csv"');

  const inputsFiles = [];
  const resultsFiles = [];

  let scanned = 0, ignored = 0;

  Logger.log("OMNITRAC | Varredura pasta (somente CSVs): %s", OMNITRAC_FOLDER_ID);

  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;

    if (!/\.csv$/i.test(name)) { ignored++; continue; }

    // 1) tenta meta pelo padrão omni_trac_* (mantém como era quando bater)
    // 2) se não bater, fallback LEVE (sem parse do CSV na varredura)
    const meta = OMNITRAC_parseFilenameMeta_(name) || OMNITRAC_buildMetaFallbackFromFile_(file);

    if (meta.file_type === "inputs") inputsFiles.push({ file, meta });
    else if (meta.file_type === "results") resultsFiles.push({ file, meta });
    else ignored++;

    if (scanned % 200 === 0) Logger.log("OMNITRAC | Varredura: %s CSVs vistos...", scanned);
  }

  Logger.log(
    "OMNITRAC | Varredura concluída. total_csv=%s | inputs=%s | results=%s | ignorados=%s",
    scanned, inputsFiles.length, resultsFiles.length, ignored
  );

  OMNITRAC_processGroupInputs_(inputsFiles);
  OMNITRAC_processGroupResults_(resultsFiles);

  Logger.log("OMNITRAC | Finalizado.");
}

// Alias opcional (se quiser rodar sem prefixo no dropdown)
function runDriveOmniTracCsvToBigQueryIncremental() {
  return OMNITRAC_runDriveOmniTracCsvToBigQueryIncremental();
}

// ===== INPUTS =====

function OMNITRAC_processGroupInputs_(items) {
  if (!items.length) {
    Logger.log("OMNITRAC | Inputs: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = OMNITRAC_fetchExistingIdsFromBigQuery_(OMNITRAC_TABLE_INPUTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("OMNITRAC | Inputs: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("OMNITRAC | [inputs %s/%s] %s", done, newItems.length, file.getName());
    const rows = OMNITRAC_rowsFromInputsCsvKv_(file, meta);
    OMNITRAC_streamInsertObjects_(OMNITRAC_TABLE_INPUTS, rows);
  }
}

function OMNITRAC_rowsFromInputsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = OMNITRAC_readCsvTextRobust_(file);
  const matrix = OMNITRAC_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("OMNITRAC | CSV vazio: " + name);

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
      source_file_name: name,
      ingestion_ts: ingestionTs,
      row_index: String(i),
      variable: variable,
      value: value
    });
  }

  Logger.log("OMNITRAC | Inputs %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== RESULTS =====

function OMNITRAC_processGroupResults_(items) {
  if (!items.length) {
    Logger.log("OMNITRAC | Results: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = OMNITRAC_fetchExistingIdsFromBigQuery_(OMNITRAC_TABLE_RESULTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("OMNITRAC | Results: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("OMNITRAC | [results %s/%s] %s", done, newItems.length, file.getName());
    const rows = OMNITRAC_rowsFromResultsCsvKv_(file, meta);
    OMNITRAC_streamInsertObjects_(OMNITRAC_TABLE_RESULTS, rows);
  }
}

function OMNITRAC_rowsFromResultsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = OMNITRAC_readCsvTextRobust_(file);
  const matrix = OMNITRAC_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("OMNITRAC | CSV vazio: " + name);

  const header = (matrix[0] || []).map(h => String(h ?? "").trim());
  if (!header.length) throw new Error("OMNITRAC | Header vazio: " + name);

  const testColIdx = 0;
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

      out.push({
        id: name,
        file_type: meta.file_type,
        upload_date: meta.upload_date,
        upload_time: meta.upload_time,
        lote: meta.lote,
        source_file_name: name,
        ingestion_ts: ingestionTs,
        row_index: String(i),
        variable: `${testName}__${colName}`,
        value: cell
      });
    }
  }

  Logger.log("OMNITRAC | Results %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== BIGQUERY =====

function OMNITRAC_ensureKvTableExists_(tableId) {
  let table = null;

  try {
    table = OMNITRAC_withRetry_(
      () => BigQuery.Tables.get(OMNITRAC_GCP_PROJECT_ID, OMNITRAC_BQ_DATASET, tableId),
      { opName: "Tables.get " + tableId }
    );
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (!/Not found/i.test(msg)) throw e;
  }

  if (!table) {
    Logger.log("OMNITRAC | Criando tabela KV: %s.%s.%s", OMNITRAC_GCP_PROJECT_ID, OMNITRAC_BQ_DATASET, tableId);

    const fields = OMNITRAC_KV_SCHEMA_FIELDS.map(name => ({
      name,
      type: "STRING",
      mode: "NULLABLE"
    }));

    const tableResource = {
      tableReference: { projectId: OMNITRAC_GCP_PROJECT_ID, datasetId: OMNITRAC_BQ_DATASET, tableId },
      schema: { fields }
    };

    OMNITRAC_withRetry_(
      () => BigQuery.Tables.insert(tableResource, OMNITRAC_GCP_PROJECT_ID, OMNITRAC_BQ_DATASET),
      { opName: "Tables.insert " + tableId }
    );

    Logger.log("OMNITRAC | Tabela criada: %s", tableId);
    return;
  }

  const existing = new Set((table.schema?.fields || []).map(f => f.name));
  const missing = OMNITRAC_KV_SCHEMA_FIELDS.filter(name => !existing.has(name));
  if (!missing.length) return;

  Logger.log("OMNITRAC | Tabela %s: colunas faltantes: %s", tableId, missing.join(", "));

  const mergedFields = (table.schema.fields || []).concat(
    missing.map(name => ({ name, type: "STRING", mode: "NULLABLE" }))
  );

  const patch = { schema: { fields: mergedFields } };

  OMNITRAC_withRetry_(
    () => BigQuery.Tables.patch(patch, OMNITRAC_GCP_PROJECT_ID, OMNITRAC_BQ_DATASET, tableId),
    { opName: "Tables.patch " + tableId }
  );

  Logger.log("OMNITRAC | Tabela %s: schema atualizado.", tableId);
}

function OMNITRAC_fetchExistingIdsFromBigQuery_(tableId, ids) {
  const existing = new Set();
  if (!ids.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const inList = batch.map(s => `'${OMNITRAC_escapeSqlString_(String(s))}'`).join(",");

    const query = `
      SELECT DISTINCT id
      FROM \`${OMNITRAC_GCP_PROJECT_ID}.${OMNITRAC_BQ_DATASET}.${tableId}\`
      WHERE id IN (${inList})
    `;

    const res = OMNITRAC_withRetry_(
      () => BigQuery.Jobs.query({ query, useLegacySql: false }, OMNITRAC_GCP_PROJECT_ID),
      { opName: "Jobs.query existing ids " + tableId }
    );

    if (res.rows) {
      for (const r of res.rows) existing.add(String(r.f[0].v));
    }
  }

  return existing;
}

function OMNITRAC_streamInsertObjects_(tableId, objects) {
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

    const resp = OMNITRAC_withRetry_(
      () => BigQuery.Tabledata.insertAll(request, OMNITRAC_GCP_PROJECT_ID, OMNITRAC_BQ_DATASET, tableId),
      { opName: "Tabledata.insertAll " + tableId }
    );

    if (resp.insertErrors && resp.insertErrors.length) {
      throw new Error("OMNITRAC | Falha no insertAll: " + JSON.stringify(resp.insertErrors).slice(0, 2000));
    }

    sent += chunk.length;
    Logger.log("OMNITRAC | Tabela %s: enviado %s/%s linhas", tableId, sent, total);
  }
}

// ===== RETRY / BACKOFF =====

function OMNITRAC_withRetry_(fn, opts) {
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

      if (!OMNITRAC_isRetryableBigQueryError_(msg)) throw e;
      if (attempt === maxAttempts) break;

      const exp = Math.min(maxSleepMs, baseMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const sleepMs = Math.min(maxSleepMs, exp + jitter);

      Logger.log("OMNITRAC | [retry %s] falhou (tentativa %s/%s): %s | aguardando %sms",
                 opName, attempt, maxAttempts, msg, sleepMs);

      Utilities.sleep(sleepMs);
    }
  }

  throw lastErr;
}

function OMNITRAC_isRetryableBigQueryError_(message) {
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

// ===== FILENAME PARSER (OMNI_TRAC) =====

function OMNITRAC_parseFilenameMeta_(filename) {

  const re = /^omni_trac_(inputs|results)_(\d{8})_(\d{6})_+#+([a-z0-9_\-]+?)(?:\.csv)?$/i;
  const m = filename.match(re);
  if (!m) return null;

  let lote = String(m[4] || "").replace(/_+$/g, "");

  if (!/^\d{8}_\d{2}_\d{2}.*$/i.test(lote)) return null;

  return {
    file_type: m[1].toLowerCase(),
    upload_date: m[2],
    upload_time: m[3],
    lote: lote
  };
}

// ===== FALLBACK META (LEVE, SEM LER CSV NA VARREDURA) =====

function OMNITRAC_buildMetaFallbackFromFile_(file) {
  const name = file.getName();

  const dt = file.getLastUpdated ? file.getLastUpdated() : new Date();
  const upload_date = Utilities.formatDate(dt, "UTC", "yyyyMMdd");
  const upload_time = Utilities.formatDate(dt, "UTC", "HHmmss");

  // classificação por nome (sem parse do CSV na varredura)
  // default "results" é mais seguro para não perder colunas
  const lower = name.toLowerCase();
  let file_type = "results";
  if (lower.includes("inputs")) file_type = "inputs";
  else if (lower.includes("results")) file_type = "results";

  return {
    file_type,
    upload_date,
    upload_time,
    lote: ""
  };
}

// ===== DRIVE FOLDER ACCESS =====

function OMNITRAC_getFolderByIdOrThrow_(folderId) {
  const id = String(folderId || "").trim();

  if (!id || id === "PUT_OMNITRAC_FOLDER_ID_HERE") {
    throw new Error("OMNITRAC | OMNITRAC_FOLDER_ID não configurado. Cole aqui o ID da pasta do Drive.");
  }
  if (id.length < 15) {
    throw new Error("OMNITRAC | OMNITRAC_FOLDER_ID parece inválido (muito curto): " + id);
  }

  try {
    const folder = DriveApp.getFolderById(id);
    const name = folder.getName();
    Logger.log("OMNITRAC | Pasta OK: %s (%s)", name, id);
    return folder;
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    throw new Error(
      "OMNITRAC | Falha ao acessar pasta. Possíveis causas:\n" +
      "1) ID errado (arquivo/atalho)\n" +
      "2) Sem permissão (Shared Drive, etc.)\n\n" +
      "FolderId=" + id + "\n" +
      "Erro original: " + msg
    );
  }
}

// ===== CSV READ / PARSE (ROBUST) =====

function OMNITRAC_readCsvTextRobust_(file) {
  const blob = file.getBlob();
  const bytes = blob.getBytes();

  Logger.log("OMNITRAC | Lendo: %s | mime=%s | bytes=%s",
             file.getName(), blob.getContentType(), bytes.length);

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    throw new Error(
      "OMNITRAC | Arquivo parece XLSX/ZIP (assinatura PK) e não CSV: " + file.getName() +
      " | Exporte como CSV (UTF-8)."
    );
  }

  const encodings = ["UTF-8", "ISO-8859-1", "UTF-16LE", "UTF-16BE"];
  let best = "";

  for (const enc of encodings) {
    try {
      let txt = Utilities.newBlob(bytes).getDataAsString(enc);
      txt = OMNITRAC_sanitizeCsvText_(txt);

      const hasStructure =
        txt.length > 10 &&
        (txt.includes("\n") || txt.includes(",") || txt.includes(";") || txt.includes("\t") || txt.includes("|"));

      if (hasStructure) {
        Logger.log("OMNITRAC | Encoding escolhido: %s", enc);
        return txt;
      }

      if (txt.length > best.length) best = txt;
    } catch (e) {}
  }

  best = OMNITRAC_sanitizeCsvText_(best);
  Logger.log("OMNITRAC | Encoding fallback. len=%s", best.length);
  return best;
}

function OMNITRAC_sanitizeCsvText_(raw) {
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

function OMNITRAC_parseCsvSafe_(text) {
  let raw = OMNITRAC_sanitizeCsvText_(text);

  if (!raw || raw.trim() === "") {
    Logger.log("OMNITRAC | CSV vazio/ilegível.");
    throw new Error("Could not parse text.");
  }

  if (!raw.endsWith("\n")) raw += "\n";

  const delimiters = [",", ";", "\t", "|"];
  for (const d of delimiters) {
    try {
      const m = (d === ",") ? Utilities.parseCsv(raw) : Utilities.parseCsv(raw, d);
      if (m && m.length) return m;
    } catch (e) {}
  }

  const bestDelim = OMNITRAC_detectDelimiter_(raw);

  try {
    const m2 = OMNITRAC_parseCsvLenient_(raw, bestDelim);
    if (m2 && m2.length) return m2;
  } catch (e) {}

  const m3 = OMNITRAC_parseCsvSplitFallback_(raw, bestDelim);
  if (m3 && m3.length) return m3;

  Logger.log("OMNITRAC | head(300): %s", raw.slice(0, 300));
  Logger.log("OMNITRAC | tail(300): %s", raw.slice(-300));
  throw new Error("Could not parse text.");
}

function OMNITRAC_detectDelimiter_(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l !== "").slice(0, 30);
  const sample = lines.join("\n");

  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;

  for (const d of candidates) {
    const score = (sample.split(d).length - 1);
    if (score > bestScore) { bestScore = score; best = d; }
  }

  Logger.log("OMNITRAC | Delimiter: %s (score=%s)", best === "\t" ? "\\t" : best, bestScore);
  return best;
}

function OMNITRAC_parseCsvLenient_(text, delimiter) {
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

function OMNITRAC_parseCsvSplitFallback_(raw, delimiter) {
  const lines = raw.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    out.push(line.split(delimiter));
  }
  return out;
}

// ===== SQL ESCAPE =====

function OMNITRAC_escapeSqlString_(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
