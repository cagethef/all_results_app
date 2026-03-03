function runReceiverIngest() {
  ReceiverIngest.run();
}

const ReceiverIngest = (() => {
  // ===== CONFIG =====

  // Pasta do Receiver (Drive folder)
  const RECEIVER_FOLDER_ID = "1Og6AbeAxmAq0ASWIuhFnowtLuEBR6X1_";

  const GCP_PROJECT_ID = "tractian-bi";
  const BQ_DATASET = "operations";

  // Tabelas KV (tudo STRING)
  const TABLE_INPUTS = "operations_atp_receiver_inputs_raw";
  const TABLE_RESULTS = "operations_atp_receiver_results_raw";

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

  // ===== ENTRYPOINT =====

  function run() {
    ensureKvTableExists_(TABLE_INPUTS);
    ensureKvTableExists_(TABLE_RESULTS);

    const folder = DriveApp.getFolderById(RECEIVER_FOLDER_ID);
    const it = folder.getFiles();

    const inputsFiles = [];
    const resultsFiles = [];

    let scanned = 0, ignored = 0;

    Logger.log("Receiver | Início");
    Logger.log("Receiver | Folder ID: %s", RECEIVER_FOLDER_ID);
    Logger.log("Receiver | Folder Name: %s", folder.getName());

    // amostra de nomes (para debug)
    const sampleNames = [];

    while (it.hasNext()) {
      const file = it.next();
      const name = file.getName();
      scanned++;

      if (sampleNames.length < 10) sampleNames.push(name);

      // ✅ Guard-rail: Receiver só processa arquivos receiver_*
      if (!String(name).toLowerCase().startsWith("receiver_")) {
        ignored++;
        continue;
      }

      const meta = parseReceiverFilenameMeta_(name);
      if (!meta) { ignored++; continue; }

      if (meta.file_type === "inputs") inputsFiles.push({ file, meta });
      else if (meta.file_type === "results") resultsFiles.push({ file, meta });
      else ignored++;
    }

    Logger.log("Receiver | Amostra arquivos (até 10): %s", JSON.stringify(sampleNames));
    Logger.log(
      "Receiver | Varredura concluída. total=%s | inputs=%s | results=%s | ignorados=%s",
      scanned, inputsFiles.length, resultsFiles.length, ignored
    );

    processGroupInputs_(inputsFiles);
    processGroupResults_(resultsFiles);

    Logger.log("Receiver | Finalizado.");
  }

  // ===== INPUTS =====

  function processGroupInputs_(items) {
    if (!items.length) {
      Logger.log("Receiver | Inputs: nada para processar");
      return;
    }

    const ids = items.map(x => x.file.getName());
    const existing = fetchExistingIdsFromBigQuery_(TABLE_INPUTS, ids);
    const newItems = items.filter(x => !existing.has(x.file.getName()));

    Logger.log("Receiver | Inputs: existentes=%s | novos=%s", existing.size, newItems.length);
    if (!newItems.length) return;

    let done = 0;
    for (const { file, meta } of newItems) {
      done++;
      Logger.log("Receiver | [inputs %s/%s] %s", done, newItems.length, file.getName());
      const rows = rowsFromInputsCsvKv_(file, meta);
      streamInsertObjects_(TABLE_INPUTS, rows);
    }
  }

  function rowsFromInputsCsvKv_(file, meta) {
    const name = file.getName();

    const csvText = readCsvTextRobust_(file);
    const matrix = parseCsvSafe_(csvText);

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
        row_index: String(i),
        variable: variable,
        value: value
      });
    }

    Logger.log("Receiver | Inputs %s: linhas KV=%s", name, out.length);
    return out;
  }

  // ===== RESULTS =====

  function processGroupResults_(items) {
    if (!items.length) {
      Logger.log("Receiver | Results: nada para processar");
      return;
    }

    const ids = items.map(x => x.file.getName());
    const existing = fetchExistingIdsFromBigQuery_(TABLE_RESULTS, ids);
    const newItems = items.filter(x => !existing.has(x.file.getName()));

    Logger.log("Receiver | Results: existentes=%s | novos=%s", existing.size, newItems.length);
    if (!newItems.length) return;

    let done = 0;
    for (const { file, meta } of newItems) {
      done++;
      Logger.log("Receiver | [results %s/%s] %s", done, newItems.length, file.getName());
      const rows = rowsFromResultsCsvKv_(file, meta);
      streamInsertObjects_(TABLE_RESULTS, rows);
    }
  }

  function rowsFromResultsCsvKv_(file, meta) {
    const name = file.getName();

    const csvText = readCsvTextRobust_(file);
    const matrix = parseCsvSafe_(csvText);

    if (!matrix || matrix.length === 0) throw new Error("CSV vazio: " + name);

    const header = matrix[0].map(h => String(h ?? ""));
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

    Logger.log("Receiver | Results %s: linhas KV=%s", name, out.length);
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
      Logger.log("Receiver | Criando tabela KV: %s.%s.%s", GCP_PROJECT_ID, BQ_DATASET, tableId);

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

      Logger.log("Receiver | Tabela criada: %s", tableId);
      return;
    }

    const existing = new Set((table.schema?.fields || []).map(f => f.name));
    const missing = KV_SCHEMA_FIELDS.filter(name => !existing.has(name));
    if (!missing.length) return;

    Logger.log("Receiver | Tabela %s: colunas faltantes: %s", tableId, missing.join(", "));

    const mergedFields = (table.schema.fields || []).concat(
      missing.map(name => ({ name, type: "STRING", mode: "NULLABLE" }))
    );

    const patch = { schema: { fields: mergedFields } };

    withRetry_(
      () => BigQuery.Tables.patch(patch, GCP_PROJECT_ID, BQ_DATASET, tableId),
      { opName: "Tables.patch " + tableId }
    );

    Logger.log("Receiver | Tabela %s: schema atualizado.", tableId);
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
        throw new Error("Receiver | Falha no insertAll: " + JSON.stringify(resp.insertErrors).slice(0, 2000));
      }

      sent += chunk.length;
      Logger.log("Receiver | Tabela %s: enviado %s/%s linhas", tableId, sent, total);
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

  // ===== FILENAME PARSER (RECEIVER) =====

  function parseReceiverFilenameMeta_(filename) {
    const re = /^receiver_(inputs|results)_(\d{8})_(\d{6})__+#([a-z0-9_]+?)(?:\.csv)?$/i;
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

  // ===== CSV READ (ROBUST) =====

  function readCsvTextRobust_(file) {
    const blob = file.getBlob();
    const bytes = blob.getBytes();

    Logger.log("Receiver | Lendo arquivo: %s | mime=%s | size_bytes=%s",
               file.getName(), blob.getContentType(), bytes.length);

    // Detecta XLSX/ZIP disfarçado (começa com PK)
    if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
      throw new Error(
        "Receiver | Arquivo parece XLSX/ZIP (assinatura PK) e não CSV: " + file.getName() +
        " | Exporte como CSV (UTF-8) e tente de novo."
      );
    }

    const encodings = ["UTF-8", "ISO-8859-1", "UTF-16LE", "UTF-16BE"];
    let best = "";

    for (const enc of encodings) {
      try {
        let txt = Utilities.newBlob(bytes).getDataAsString(enc);
        txt = sanitizeCsvText_(txt);

        const hasStructure =
          txt.length > 10 &&
          (txt.includes("\n") || txt.includes(",") || txt.includes(";") || txt.includes("\t") || txt.includes("|"));

        if (hasStructure) {
          Logger.log("Receiver | Encoding escolhido: %s", enc);
          return txt;
        }

        if (txt.length > best.length) best = txt;
      } catch (e) {}
    }

    best = sanitizeCsvText_(best);
    Logger.log("Receiver | Encoding fallback (len=%s)", best.length);
    return best;
  }

  function sanitizeCsvText_(raw) {
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

  // ===== CSV PARSER (ROBUST) =====

  function parseCsvSafe_(text) {
    let raw = sanitizeCsvText_(text);

    Logger.log("Receiver | parseCsvSafe len=%s", raw.length);

    if (!raw || raw.trim() === "") {
      Logger.log("Receiver | CSV vazio/ilegível.");
      throw new Error("Could not parse text.");
    }

    if (!raw.endsWith("\n")) raw += "\n";

    // tenta Utilities.parseCsv com vários delimitadores
    const delimiters = [",", ";", "\t", "|"];
    for (const d of delimiters) {
      try {
        const m = (d === ",") ? Utilities.parseCsv(raw) : Utilities.parseCsv(raw, d);
        if (m && m.length) return m;
      } catch (e) {}
    }

    const bestDelim = detectDelimiter_(raw);

    try {
      const m2 = parseCsvLenient_(raw, bestDelim);
      if (m2 && m2.length) return m2;
    } catch (e) {}

    const m3 = parseCsvSplitFallback_(raw, bestDelim);
    if (m3 && m3.length) return m3;

    Logger.log("Receiver | CSV head(300): %s", raw.slice(0, 300));
    Logger.log("Receiver | CSV tail(300): %s", raw.slice(-300));
    throw new Error("Could not parse text.");
  }

  function detectDelimiter_(raw) {
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l !== "").slice(0, 30);
    const sample = lines.join("\n");

    const candidates = [",", ";", "\t", "|"];
    let best = ",";
    let bestScore = -1;

    for (const d of candidates) {
      const score = (sample.split(d).length - 1);
      if (score > bestScore) { bestScore = score; best = d; }
    }

    Logger.log("Receiver | Delimiter escolhido: %s (score=%s)", best === "\t" ? "\\t" : best, bestScore);
    return best;
  }

  function parseCsvLenient_(text, delimiter) {
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

  function parseCsvSplitFallback_(raw, delimiter) {
    const lines = raw.split("\n");
    const out = [];
    for (const line of lines) {
      if (line.trim() === "") continue;
      out.push(line.split(delimiter));
    }
    return out;
  }

  // ===== SQL ESCAPE =====

  function escapeSqlString_(s) {
    return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  // ===== PUBLIC API =====
  return { run };
})();
