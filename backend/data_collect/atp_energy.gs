// ===== CONFIG =====

const ENERGY_FOLDER_ID = "1ias-V0VPcwCQBo7LW5f97mtcajyZ-DyY";

const ENERGY_GCP_PROJECT_ID = "tractian-bi";
const ENERGY_BQ_DATASET = "operations";

const ENERGY_TABLE_INPUTS = "operations_atp_energy_inputs_raw";
const ENERGY_TABLE_RESULTS = "operations_atp_energy_results_raw";

const ENERGY_ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/octet-stream"
]);

const ENERGY_KV_SCHEMA_FIELDS = [
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

function ENERGY_runDriveEnergyTracCsvToBigQueryIncremental() {
  ENERGY_ensureKvTableExists_(ENERGY_TABLE_INPUTS);
  ENERGY_ensureKvTableExists_(ENERGY_TABLE_RESULTS);

  const folder = DriveApp.getFolderById(ENERGY_FOLDER_ID);
  const it = folder.getFiles();

  const inputsFiles = [];
  const resultsFiles = [];

  let scanned = 0, ignored = 0, skippedMime = 0;

  Logger.log("ENERGY | Varredura pasta: %s", ENERGY_FOLDER_ID);

  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    const mime = file.getMimeType();
    scanned++;

    if (!ENERGY_ALLOWED_MIME_TYPES.has(mime)) {
      Logger.log("ENERGY | Ignorando (MIME=%s): %s", mime, name);
      skippedMime++;
      ignored++;
      continue;
    }

    const meta = ENERGY_parseFilenameMeta_(name);
    if (!meta) { ignored++; continue; }

    if (meta.file_type === "inputs") inputsFiles.push({ file, meta });
    else if (meta.file_type === "results") resultsFiles.push({ file, meta });
    else ignored++;
  }

  Logger.log(
    "ENERGY | Varredura concluída. total=%s | inputs=%s | results=%s | ignorados=%s (mime_skip=%s)",
    scanned, inputsFiles.length, resultsFiles.length, ignored, skippedMime
  );

  ENERGY_processGroupInputs_(inputsFiles);
  ENERGY_processGroupResults_(resultsFiles);

  Logger.log("ENERGY | Finalizado.");
}

// ===== INPUTS =====

function ENERGY_processGroupInputs_(items) {
  if (!items.length) {
    Logger.log("ENERGY | Inputs: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = ENERGY_fetchExistingIdsFromBigQuery_(ENERGY_TABLE_INPUTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("ENERGY | Inputs: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("ENERGY | [inputs %s/%s] %s", done, newItems.length, file.getName());
    const rows = ENERGY_rowsFromInputsCsvKv_(file, meta);
    ENERGY_streamInsertObjects_(ENERGY_TABLE_INPUTS, rows);
  }
}

function ENERGY_rowsFromInputsCsvKv_(file, meta) {
  const name = file.getName();

  const csvText = ENERGY_readCsvTextRobust_(file);
  const matrix = ENERGY_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("ENERGY | CSV vazio: " + name);

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

  Logger.log("ENERGY | Inputs %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== RESULTS =====

function ENERGY_processGroupResults_(items) {
  if (!items.length) {
    Logger.log("ENERGY | Results: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = ENERGY_fetchExistingIdsFromBigQuery_(ENERGY_TABLE_RESULTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("ENERGY | Results: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("ENERGY | [results %s/%s] %s", done, newItems.length, file.getName());
    const rows = ENERGY_rowsFromResultsCsvKv_(file, meta);
    ENERGY_streamInsertObjects_(ENERGY_TABLE_RESULTS, rows);
  }
}

function ENERGY_rowsFromResultsCsvKv_(file, meta) {
  const name = file.getName();

  const csvText = ENERGY_readCsvTextRobust_(file);
  const matrix = ENERGY_parseCsvSafe_(csvText);

  if (!matrix || matrix.length === 0) throw new Error("ENERGY | CSV vazio: " + name);

  const header = (matrix[0] || []).map(h => String(h ?? "").trim());
  if (!header.length) throw new Error("ENERGY | Header vazio: " + name);

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

  Logger.log("ENERGY | Results %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== BIGQUERY =====

function ENERGY_ensureKvTableExists_(tableId) {
  let table = null;

  try {
    table = ENERGY_withRetry_(
      () => BigQuery.Tables.get(ENERGY_GCP_PROJECT_ID, ENERGY_BQ_DATASET, tableId),
      { opName: "Tables.get " + tableId }
    );
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (!/Not found/i.test(msg)) throw e;
  }

  if (!table) {
    Logger.log("ENERGY | Criando tabela KV: %s.%s.%s", ENERGY_GCP_PROJECT_ID, ENERGY_BQ_DATASET, tableId);

    const fields = ENERGY_KV_SCHEMA_FIELDS.map(name => ({
      name,
      type: "STRING",
      mode: "NULLABLE"
    }));

    const tableResource = {
      tableReference: { projectId: ENERGY_GCP_PROJECT_ID, datasetId: ENERGY_BQ_DATASET, tableId },
      schema: { fields }
    };

    ENERGY_withRetry_(
      () => BigQuery.Tables.insert(tableResource, ENERGY_GCP_PROJECT_ID, ENERGY_BQ_DATASET),
      { opName: "Tables.insert " + tableId }
    );

    Logger.log("ENERGY | Tabela criada: %s", tableId);
    return;
  }

  const existing = new Set((table.schema?.fields || []).map(f => f.name));
  const missing = ENERGY_KV_SCHEMA_FIELDS.filter(name => !existing.has(name));
  if (!missing.length) return;

  Logger.log("ENERGY | Tabela %s: colunas faltantes: %s", tableId, missing.join(", "));

  const mergedFields = (table.schema.fields || []).concat(
    missing.map(name => ({ name, type: "STRING", mode: "NULLABLE" }))
  );

  const patch = { schema: { fields: mergedFields } };

  ENERGY_withRetry_(
    () => BigQuery.Tables.patch(patch, ENERGY_GCP_PROJECT_ID, ENERGY_BQ_DATASET, tableId),
    { opName: "Tables.patch " + tableId }
  );

  Logger.log("ENERGY | Tabela %s: schema atualizado.", tableId);
}

function ENERGY_fetchExistingIdsFromBigQuery_(tableId, ids) {
  const existing = new Set();
  if (!ids.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const inList = batch.map(s => `'${ENERGY_escapeSqlString_(String(s))}'`).join(",");

    const query = `
      SELECT DISTINCT id
      FROM \`${ENERGY_GCP_PROJECT_ID}.${ENERGY_BQ_DATASET}.${tableId}\`
      WHERE id IN (${inList})
    `;

    const res = ENERGY_withRetry_(
      () => BigQuery.Jobs.query({ query, useLegacySql: false }, ENERGY_GCP_PROJECT_ID),
      { opName: "Jobs.query existing ids " + tableId }
    );

    if (res.rows) {
      for (const r of res.rows) existing.add(String(r.f[0].v));
    }
  }

  return existing;
}

function ENERGY_streamInsertObjects_(tableId, objects) {
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

    const resp = ENERGY_withRetry_(
      () => BigQuery.Tabledata.insertAll(request, ENERGY_GCP_PROJECT_ID, ENERGY_BQ_DATASET, tableId),
      { opName: "Tabledata.insertAll " + tableId }
    );

    if (resp.insertErrors && resp.insertErrors.length) {
      throw new Error("ENERGY | Falha no insertAll: " + JSON.stringify(resp.insertErrors).slice(0, 2000));
    }

    sent += chunk.length;
    Logger.log("ENERGY | Tabela %s: enviado %s/%s linhas", tableId, sent, total);
  }
}

// ===== RETRY / BACKOFF =====

function ENERGY_withRetry_(fn, opts) {
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

      if (!ENERGY_isRetryableBigQueryError_(msg)) throw e;
      if (attempt === maxAttempts) break;

      const exp = Math.min(maxSleepMs, baseMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const sleepMs = Math.min(maxSleepMs, exp + jitter);

      Logger.log("ENERGY | [retry %s] falhou (tentativa %s/%s): %s | aguardando %sms",
                 opName, attempt, maxAttempts, msg, sleepMs);

      Utilities.sleep(sleepMs);
    }
  }

  throw lastErr;
}

function ENERGY_isRetryableBigQueryError_(message) {
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

// ===== FILENAME PARSER (ENERGYTRAC) =====

function ENERGY_parseFilenameMeta_(filename) {
  const re = /^energytrac_(inputs|results)_(\d{8})_(\d{6})__+#([a-z0-9_]+?)\.csv$/i;
  const m = filename.match(re);
  if (!m) return null;

  let lote = String(m[4] || "").replace(/_+$/g, "");
  if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null;

  return {
    file_type: m[1].toLowerCase(),
    upload_date: m[2],
    upload_time: m[3],
    lote: lote
  };
}

// ===== CSV READ / PARSE (ROBUST + ÚNICO) =====

function ENERGY_readCsvTextRobust_(file) {
  const blob = file.getBlob();
  const bytes = blob.getBytes();

  Logger.log("ENERGY | Lendo: %s | mime=%s | bytes=%s",
             file.getName(), blob.getContentType(), bytes.length);

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    throw new Error(
      "ENERGY | Arquivo parece XLSX/ZIP (assinatura PK) e não CSV: " + file.getName() +
      " | Exporte como CSV (UTF-8)."
    );
  }

  const encodings = ["UTF-8", "ISO-8859-1", "UTF-16LE", "UTF-16BE"];
  let best = "";

  for (const enc of encodings) {
    try {
      let txt = Utilities.newBlob(bytes).getDataAsString(enc);
      txt = ENERGY_sanitizeCsvText_(txt);

      const hasStructure =
        txt.length > 10 &&
        (txt.includes("\n") || txt.includes(",") || txt.includes(";") || txt.includes("\t") || txt.includes("|"));

      if (hasStructure) {
        Logger.log("ENERGY | Encoding escolhido: %s", enc);
        return txt;
      }

      if (txt.length > best.length) best = txt;
    } catch (e) {}
  }

  best = ENERGY_sanitizeCsvText_(best);
  Logger.log("ENERGY | Encoding fallback. len=%s", best.length);
  return best;
}

function ENERGY_sanitizeCsvText_(raw) {
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
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  return text;
}

function ENERGY_parseCsvSafe_(text) {
  let raw = ENERGY_sanitizeCsvText_(text);

  Logger.log("ENERGY | parseCsvSafe len=%s", raw.length);

  if (!raw || raw.trim() === "") {
    Logger.log("ENERGY | CSV vazio/ilegível.");
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

  const bestDelim = ENERGY_detectDelimiter_(raw);

  try {
    const m2 = ENERGY_parseCsvLenient_(raw, bestDelim);
    if (m2 && m2.length) return m2;
  } catch (e) {}

  const m3 = ENERGY_parseCsvSplitFallback_(raw, bestDelim);
  if (m3 && m3.length) return m3;

  Logger.log("ENERGY | head(300): %s", raw.slice(0, 300));
  Logger.log("ENERGY | tail(300): %s", raw.slice(-300));
  throw new Error("Could not parse text.");
}

function ENERGY_detectDelimiter_(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l !== "").slice(0, 30);
  const sample = lines.join("\n");

  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;

  for (const d of candidates) {
    const score = (sample.split(d).length - 1);
    if (score > bestScore) { bestScore = score; best = d; }
  }

  Logger.log("ENERGY | Delimiter escolhido: %s (score=%s)", best === "\t" ? "\\t" : best, bestScore);
  return best;
}

function ENERGY_parseCsvLenient_(text, delimiter) {
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

function ENERGY_parseCsvSplitFallback_(raw, delimiter) {
  const lines = raw.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    out.push(line.split(delimiter));
  }
  return out;
}

// ===== SQL ESCAPE =====

function ENERGY_escapeSqlString_(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}