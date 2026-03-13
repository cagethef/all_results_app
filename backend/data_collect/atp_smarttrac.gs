const FOLDER_ID = "1mRUm_mtt5rSoQDyUWuoh5l8Pm3AfUnGt";

const GCP_PROJECT_ID = "tractian-bi";
const BQ_DATASET = "operations";

const BQ_TABLE_INPUTS = "operations_atp_smarttrac_inputs_raw";
const BQ_TABLE_RESULTS = "operations_atp_smarttrac_results_raw";

const KV_SCHEMA_FIELDS = [
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

function runDriveCsvToBigQueryIncremental() {
  ensureKvTableExists_(BQ_TABLE_INPUTS);
  ensureKvTableExists_(BQ_TABLE_RESULTS);

  const folder = DriveApp.getFolderById(FOLDER_ID);

  // MAIS RÁPIDO: evita iterar tudo da pasta quando tem muito arquivo
  // (Drive pode ter variação de mimeType; por isso pegamos também ".csv" no nome)
  const it = folder.searchFiles('mimeType = "text/csv" or mimeType = "text/plain" or title contains ".csv"');

  const inputsFiles = [];
  const resultsFiles = [];

  let scanned = 0, ignored = 0;

  Logger.log("Varredura pasta (somente CSVs): %s", FOLDER_ID);

  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;

    // Garantia extra caso venham arquivos não-csv pelo searchFiles
    if (!/\.csv$/i.test(name)) { ignored++; continue; }

    // 1) tenta meta pelo padrão antigo
    // 2) se não bater, usa fallback LEVE (sem ler conteúdo do CSV)
    const meta = parseFilenameMeta_(name) || buildMetaFallbackFromFile_(file);

    if (meta.file_type === "inputs") inputsFiles.push({ file, meta });
    else if (meta.file_type === "results") resultsFiles.push({ file, meta });
    else ignored++;

    if (scanned % 200 === 0) Logger.log("Varredura: %s CSVs vistos...", scanned);
  }

  Logger.log("Varredura concluída. total_csv=%s | inputs=%s | results=%s | ignorados=%s",
             scanned, inputsFiles.length, resultsFiles.length, ignored);

  processGroupInputs_(inputsFiles);
  processGroupResults_(resultsFiles);

  Logger.log("Finalizado.");
}

// ===== INPUTS =====

function processGroupInputs_(items) {
  if (!items.length) {
    Logger.log("Inputs: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = fetchExistingIdsFromBigQuery_(BQ_TABLE_INPUTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("Inputs: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("[inputs %s/%s] %s", done, newItems.length, file.getName());
    const rows = rowsFromInputsCsvKv_(file, meta);
    streamInsertObjects_(BQ_TABLE_INPUTS, rows);
  }
}

function rowsFromInputsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = file.getBlob().getDataAsString("UTF-8");
  const matrix = Utilities.parseCsv(csvText);
  if (!matrix || matrix.length === 0) throw new Error("CSV vazio: " + name);

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
      row_index: "",
      variable: variable,
      value: value
    });
  }

  Logger.log("Inputs %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== RESULTS =====

function processGroupResults_(items) {
  if (!items.length) {
    Logger.log("Results: nada para processar");
    return;
  }

  const ids = items.map(x => x.file.getName());
  const existing = fetchExistingIdsFromBigQuery_(BQ_TABLE_RESULTS, ids);
  const newItems = items.filter(x => !existing.has(x.file.getName()));

  Logger.log("Results: existentes=%s | novos=%s", existing.size, newItems.length);
  if (!newItems.length) return;

  let done = 0;
  for (const { file, meta } of newItems) {
    done++;
    Logger.log("[results %s/%s] %s", done, newItems.length, file.getName());
    const rows = rowsFromResultsCsvKv_(file, meta);
    streamInsertObjects_(BQ_TABLE_RESULTS, rows);
  }
}

function rowsFromResultsCsvKv_(file, meta) {
  const name = file.getName();
  const csvText = file.getBlob().getDataAsString("UTF-8");
  const matrix = Utilities.parseCsv(csvText);
  if (!matrix || matrix.length === 0) throw new Error("CSV vazio: " + name);

  const header = matrix[0].map(h => String(h));
  const ingestionTs = new Date().toISOString();

  const out = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const hasAny = row.some(v => String(v ?? "").trim() !== "");
    if (!hasAny) continue;

    for (let c = 0; c < header.length; c++) {
      out.push({
        id: name,
        file_type: meta.file_type,
        upload_date: meta.upload_date,
        upload_time: meta.upload_time,
        lote: meta.lote,
        source_file_name: name,
        ingestion_ts: ingestionTs,
        row_index: String(i),
        variable: header[c],
        value: (row[c] === undefined || row[c] === null) ? "" : String(row[c])
      });
    }
  }

  Logger.log("Results %s: linhas KV=%s", name, out.length);
  return out;
}

// ===== BIGQUERY =====

function ensureKvTableExists_(tableId) {
  let table = null;

  try {
    table = withRetry_(
      () => BigQuery.Tables.get(GCP_PROJECT_ID, BQ_DATASET, tableId),
      { opName: "Tables.get " + tableId }
    );
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (!/Not found/i.test(msg)) throw e;
  }

  if (!table) {
    Logger.log("Criando tabela KV: %s.%s.%s", GCP_PROJECT_ID, BQ_DATASET, tableId);

    const fields = KV_SCHEMA_FIELDS.map(name => ({
      name,
      type: "STRING",
      mode: "NULLABLE"
    }));

    const tableResource = {
      tableReference: { projectId: GCP_PROJECT_ID, datasetId: BQ_DATASET, tableId },
      schema: { fields }
    };

    withRetry_(
      () => BigQuery.Tables.insert(tableResource, GCP_PROJECT_ID, BQ_DATASET),
      { opName: "Tables.insert " + tableId }
    );

    Logger.log("Tabela criada: %s", tableId);
    return;
  }

  const existing = new Set((table.schema && table.schema.fields ? table.schema.fields : []).map(f => f.name));
  const missing = KV_SCHEMA_FIELDS.filter(name => !existing.has(name));
  if (!missing.length) return;

  Logger.log("Tabela %s: colunas faltantes detectadas: %s", tableId, missing.join(", "));

  const mergedFields = (table.schema.fields || []).concat(
    missing.map(name => ({ name, type: "STRING", mode: "NULLABLE" }))
  );

  const patch = { schema: { fields: mergedFields } };

  withRetry_(
    () => BigQuery.Tables.patch(patch, GCP_PROJECT_ID, BQ_DATASET, tableId),
    { opName: "Tables.patch " + tableId }
  );

  Logger.log("Tabela %s: schema atualizado com sucesso.", tableId);
}

function fetchExistingIdsFromBigQuery_(tableId, ids) {
  const existing = new Set();
  if (!ids.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const inList = batch.map(s => `'${escapeSqlString_(String(s))}'`).join(",");

    const query = `
      SELECT DISTINCT id
      FROM \`${GCP_PROJECT_ID}.${BQ_DATASET}.${tableId}\`
      WHERE id IN (${inList})
    `;

    const res = withRetry_(
      () => BigQuery.Jobs.query({ query, useLegacySql: false }, GCP_PROJECT_ID),
      { opName: "Jobs.query existing ids " + tableId }
    );

    if (res.rows) {
      for (const r of res.rows) existing.add(String(r.f[0].v));
    }
  }

  return existing;
}

function streamInsertObjects_(tableId, objects) {
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

    const resp = withRetry_(
      () => BigQuery.Tabledata.insertAll(request, GCP_PROJECT_ID, BQ_DATASET, tableId),
      { opName: "Tabledata.insertAll " + tableId }
    );

    if (resp.insertErrors && resp.insertErrors.length) {
      throw new Error("Falha no insertAll: " + JSON.stringify(resp.insertErrors).slice(0, 2000));
    }

    sent += chunk.length;
    Logger.log("Tabela %s: enviado %s/%s linhas", tableId, sent, total);
  }
}

// ===== RETRY / BACKOFF =====

function withRetry_(fn, opts) {
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

      if (!isRetryableBigQueryError_(msg)) throw e;
      if (attempt === maxAttempts) break;

      const exp = Math.min(maxSleepMs, baseMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const sleepMs = Math.min(maxSleepMs, exp + jitter);

      Logger.log("[retry %s] %s falhou (tentativa %s/%s): %s | aguardando %sms",
                 opName, opName, attempt, maxAttempts, msg, sleepMs);

      Utilities.sleep(sleepMs);
    }
  }

  throw lastErr;
}

function isRetryableBigQueryError_(message) {
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

// ===== FILENAME PARSER =====

function parseFilenameMeta_(filename) {
  const re = /^smarttrac_(inputs|results)_(\d{8})_(\d{6})__#(\d{8}_\d{2}_(?:\d{2}|RT\d+))\.csv$/i;
  const m = filename.match(re);
  if (!m) return null;

  return {
    file_type: m[1].toLowerCase(),
    upload_date: m[2],
    upload_time: m[3],
    lote: m[4]
  };
}

// ===== FALLBACK META (LEVE, SEM LER CSV) =====

function buildMetaFallbackFromFile_(file) {
  const name = file.getName();

  const dt = file.getLastUpdated ? file.getLastUpdated() : new Date();
  const upload_date = Utilities.formatDate(dt, "UTC", "yyyyMMdd");
  const upload_time = Utilities.formatDate(dt, "UTC", "HHmmss");

  // Classificação LEVE por nome, sem parsear conteúdo do CSV
  const lower = name.toLowerCase();
  let file_type = "results"; // default mais seguro para não perder colunas
  if (lower.includes("inputs")) file_type = "inputs";
  else if (lower.includes("results")) file_type = "results";

  return {
    file_type,
    upload_date,
    upload_time,
    lote: ""
  };
}

function escapeSqlString_(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
