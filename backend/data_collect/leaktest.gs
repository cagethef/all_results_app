// ================= CONFIGURAÇÕES (PREFIXO LEAK_) =================
const LEAK_FOLDER_ID = "1QYxgY4IpmKQ1eToxFtBvnHAq8IK7-am_"; 

const LEAK_GCP_PROJECT_ID = "tractian-bi";
const LEAK_BQ_DATASET = "operations";
const LEAK_BQ_TABLE = "operations_leak_test_raw";

// LIMITADOR DE LOTE: Processa apenas X arquivos novos por vez para não travar
const LEAK_BATCH_SIZE = 1000; 

// Definição do Schema
const LEAK_SCHEMA_DEFINITION = {
  "source_file_name": "STRING",
  "ingestion_ts": "TIMESTAMP",
  "device_id": "STRING",
  "jig_id": "STRING",
  "calibration_name": "STRING",
  "test_timestamp_raw": "STRING",
  "info_device": "STRING",
  "info_batch": "STRING",
  "info_date": "DATE",
  "info_jig_id": "STRING",
  "config_max_pressure": "FLOAT",
  "config_min_pressure": "FLOAT",
  "config_load_time": "FLOAT",
  "config_peak_time": "FLOAT",
  "config_transfer_time": "FLOAT",
  "config_after_time": "FLOAT",
  "config_reference_tank_1": "BOOLEAN",
  "config_reference_tank_2": "BOOLEAN",
  "config_save_raw_data": "BOOLEAN",
  "config_device_name": "STRING",
  "calib_mean_drop": "FLOAT",
  "calib_error_drop": "FLOAT",
  "calib_mean_slope": "FLOAT",
  "calib_error_slope": "FLOAT",
  "calib_mean_fit_qual": "FLOAT",
  "calib_error_fit_qual": "FLOAT",
  "calib_drop_sigma": "FLOAT",
  "calib_slope_sigma": "FLOAT",
  "calib_drop_mean": "FLOAT",
  "calib_slope_mean": "FLOAT",
  "calib_reference_id": "STRING",
  "calib_max_pressure": "FLOAT",
  "calib_min_pressure": "FLOAT",
  "calib_last_calib": "DATE",
  "calib_test_samples_json": "STRING", 
  "calib_reproved_drop_sigma": "FLOAT",
  "calib_reproved_slope_sigma": "FLOAT",
  "calib_reproved_drop_mean": "FLOAT",
  "calib_reproved_slope_mean": "FLOAT",
  "calib_reproved_reference_id": "STRING",
  "calib_reproved_test_samples_json": "STRING",
  "test_slope": "FLOAT",
  "test_drop": "FLOAT",
  "test_r2": "FLOAT",
  "result_drop_pass": "BOOLEAN",
  "result_slope_pass": "BOOLEAN",
  "result_r2_pass": "BOOLEAN",
  "result_final_pass": "BOOLEAN"
};

// ================= FUNÇÃO PRINCIPAL =================

function runDriveJsonLeakToBigQuery() {
  ensureLeakTableExists_(LEAK_BQ_TABLE, LEAK_SCHEMA_DEFINITION);

  const folder = DriveApp.getFolderById(LEAK_FOLDER_ID);
  
  // Busca arquivos (JSON ou Texto)
  const it = folder.searchFiles('title contains ".json" and trashed = false');

  const allFilesFound = [];
  let scanned = 0;

  Logger.log("[LEAK] Iniciando varredura na pasta...");

  // Varre a pasta para pegar os nomes
  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;

    if (!/\.json$/i.test(name)) continue;

    allFilesFound.push({ name: name, file: file });

    // Log de progresso da varredura
    if (scanned % 2000 === 0) Logger.log("[LEAK] Escaneados: %s...", scanned);
  }

  Logger.log("[LEAK] Total encontrados na pasta: %s. Verificando processados...", allFilesFound.length);

  // Inicia o processamento com limite de lote
  processLeakJsonBatch_(allFilesFound);
  
  Logger.log("[LEAK] Execução finalizada.");
}

// ================= PROCESSAMENTO =================

function processLeakJsonBatch_(allItems) {
  if (!allItems.length) return;

  // 1. Verifica no BQ quais arquivos já existem (para não duplicar)
  const ids = allItems.map(x => x.name);
  const existing = fetchExistingLeakFilesFromBigQuery_(LEAK_BQ_TABLE, ids);
  
  // 2. Filtra apenas os que NÃO estão no BigQuery
  const pendingItems = allItems.filter(x => !existing.has(x.name));

  Logger.log("[LEAK] Status: Total=%s | Já no BQ=%s | Pendentes=%s", 
             allItems.length, existing.size, pendingItems.length);

  if (!pendingItems.length) {
    Logger.log("[LEAK] Nada novo para processar.");
    return;
  }

  // 3. APLICA O LIMITE DE LOTE (BATCH_SIZE)
  // Se tiver 24.000 pendentes, pega apenas os primeiros 1000 desta vez
  const batchToProcess = pendingItems.slice(0, LEAK_BATCH_SIZE);
  
  Logger.log("[LEAK] Processando lote atual: %s arquivos (de %s pendentes)", 
             batchToProcess.length, pendingItems.length);

  const rowsBuffer = [];
  const ingestionTs = new Date().toISOString();

  // 4. Processa o lote
  for (let i = 0; i < batchToProcess.length; i++) {
    const item = batchToProcess[i];
    try {
      const blob = item.file.getBlob();
      const jsonContent = blob.getDataAsString("UTF-8");

      // CORREÇÃO DO ERRO: Verifica se está vazio antes de parsear
      if (!jsonContent || jsonContent.trim().length === 0) {
        Logger.log("[LEAK] AVISO: Arquivo vazio ignorado: %s", item.name);
        continue; 
      }

      const jsonObj = JSON.parse(jsonContent);
      const row = flattenLeakJsonToRow_(jsonObj, item.name, ingestionTs);
      rowsBuffer.push(row);

    } catch (e) {
      // Captura erros de JSON inválido para não parar o lote inteiro
      Logger.log("[LEAK] ERRO FATAL no arquivo %s: %s", item.name, e.message);
    }
  }

  // 5. Envia para o BigQuery
  if (rowsBuffer.length > 0) {
    streamInsertLeakObjects_(LEAK_BQ_TABLE, rowsBuffer);
    Logger.log("[LEAK] SUCESSO: %s linhas inseridas. Faltam aprox. %s para as próximas execuções.", 
               rowsBuffer.length, (pendingItems.length - batchToProcess.length));
  } else {
    Logger.log("[LEAK] Nenhuma linha válida gerada neste lote.");
  }
}

function flattenLeakJsonToRow_(json, fileName, ingestionTs) {
  const get = (obj, key, def = null) => (obj && obj[key] !== undefined) ? obj[key] : def;
  const getBool = (obj, key) => (obj && obj[key] !== undefined) ? Boolean(obj[key]) : null;
  
  return {
    source_file_name: fileName,
    ingestion_ts: ingestionTs,
    device_id: get(json, "deviceID"),
    jig_id: get(json, "jigID"),
    calibration_name: get(json, "calibrationName"),
    test_timestamp_raw: get(json, "timestamp"),
    info_device: get(json.info, "device"),
    info_batch: get(json.info, "batch"),
    info_date: get(json.info, "date"),
    info_jig_id: get(json.info, "jig_id"),
    config_max_pressure: get(json.config, "max_pressure"),
    config_min_pressure: get(json.config, "min_pressure"),
    config_load_time: get(json.config, "load_time"),
    config_peak_time: get(json.config, "peak_time"),
    config_transfer_time: get(json.config, "transfer_time"),
    config_after_time: get(json.config, "after_time"),
    config_reference_tank_1: getBool(json.config, "reference_tank_1"),
    config_reference_tank_2: getBool(json.config, "reference_tank_2"),
    config_save_raw_data: getBool(json.config, "save_raw_data"),
    config_device_name: get(json.config, "device_name"),
    calib_mean_drop: get(json.calibration, "mean_drop"),
    calib_error_drop: get(json.calibration, "error_drop"),
    calib_mean_slope: get(json.calibration, "mean_slope"),
    calib_error_slope: get(json.calibration, "error_slope"),
    calib_mean_fit_qual: get(json.calibration, "mean_fit_qual"),
    calib_error_fit_qual: get(json.calibration, "error_fit_qual"),
    calib_drop_sigma: get(json.calibration, "drop_sigma"),
    calib_slope_sigma: get(json.calibration, "slope_sigma"),
    calib_drop_mean: get(json.calibration, "drop_mean"),
    calib_slope_mean: get(json.calibration, "slope_mean"),
    calib_reference_id: get(json.calibration, "reference_id"),
    calib_max_pressure: get(json.calibration, "max_pressure"),
    calib_min_pressure: get(json.calibration, "min_pressure"),
    calib_last_calib: get(json.calibration, "last_calib"),
    calib_test_samples_json: json.calibration && json.calibration.test_samples ? JSON.stringify(json.calibration.test_samples) : null,
    calib_reproved_drop_sigma: get(json.calibration, "reproved_drop_sigma"),
    calib_reproved_slope_sigma: get(json.calibration, "reproved_slope_sigma"),
    calib_reproved_drop_mean: get(json.calibration, "reproved_drop_mean"),
    calib_reproved_slope_mean: get(json.calibration, "reproved_slope_mean"),
    calib_reproved_reference_id: get(json.calibration, "reproved_reference_id"),
    calib_reproved_test_samples_json: json.calibration && json.calibration.reproved_test_samples ? JSON.stringify(json.calibration.reproved_test_samples) : null,
    test_slope: get(json.test, "slope"),
    test_drop: get(json.test, "drop"),
    test_r2: get(json.test, "r2"),
    result_drop_pass: getBool(json.results, "drop"),
    result_slope_pass: getBool(json.results, "slope"),
    result_r2_pass: getBool(json.results, "r2"),
    result_final_pass: getBool(json.results, "result")
  };
}

// ================= BIGQUERY HELPERS =================

function ensureLeakTableExists_(tableId, schemaDef) {
  let table = null;
  try {
    table = withLeakRetry_(() => BigQuery.Tables.get(LEAK_GCP_PROJECT_ID, LEAK_BQ_DATASET, tableId));
  } catch (e) {
    if (!String(e).includes("Not found")) throw e;
  }

  const fields = Object.keys(schemaDef).map(key => ({
    name: key,
    type: schemaDef[key],
    mode: "NULLABLE"
  }));

  if (!table) {
    Logger.log("[LEAK] Criando tabela %s...", tableId);
    const resource = {
      tableReference: { projectId: LEAK_GCP_PROJECT_ID, datasetId: LEAK_BQ_DATASET, tableId },
      schema: { fields }
    };
    withLeakRetry_(() => BigQuery.Tables.insert(resource, LEAK_GCP_PROJECT_ID, LEAK_BQ_DATASET));
    Logger.log("[LEAK] Tabela criada.");
  } else {
    const existingCols = new Set((table.schema.fields || []).map(f => f.name));
    const newCols = fields.filter(f => !existingCols.has(f.name));
    if (newCols.length > 0) {
      Logger.log("[LEAK] Adicionando %s novas colunas...", newCols.length);
      const mergedFields = (table.schema.fields || []).concat(newCols);
      withLeakRetry_(() => BigQuery.Tables.patch({ schema: { fields: mergedFields } }, LEAK_GCP_PROJECT_ID, LEAK_BQ_DATASET, tableId));
    }
  }
}

function fetchExistingLeakFilesFromBigQuery_(tableId, fileNames) {
  const existing = new Set();
  if (!fileNames.length) return existing;

  // Consulta otimizada em batches para não estourar limite de query
  const batchSize = 500;
  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    const listStr = batch.map(n => `'${n.replace(/'/g, "\\'")}'`).join(",");
    
    const query = `
      SELECT DISTINCT source_file_name 
      FROM \`${LEAK_GCP_PROJECT_ID}.${LEAK_BQ_DATASET}.${tableId}\`
      WHERE source_file_name IN (${listStr})
    `;

    try {
      const res = withLeakRetry_(() => BigQuery.Jobs.query({ query, useLegacySql: false }, LEAK_GCP_PROJECT_ID));
      if (res.rows) {
        res.rows.forEach(r => existing.add(r.f[0].v));
      }
    } catch (e) {
      // Ignora erro se tabela vazia
    }
  }
  return existing;
}

function streamInsertLeakObjects_(tableId, objects) {
  if (!objects.length) return;
  const chunkSize = 500;
  
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    const request = {
      rows: chunk.map(o => ({ insertId: Utilities.getUuid(), json: o }))
    };
    
    Logger.log("[LEAK] Inserindo %s linhas em %s...", chunk.length, tableId);
    
    const resp = withLeakRetry_(() => BigQuery.Tabledata.insertAll(request, LEAK_GCP_PROJECT_ID, LEAK_BQ_DATASET, tableId));
    
    if (resp.insertErrors && resp.insertErrors.length) {
      Logger.log("[LEAK] ERRO DE INSERÇÃO: " + JSON.stringify(resp.insertErrors[0]));
    }
  }
}

function withLeakRetry_(fn) {
  for (let i = 0; i < 5; i++) {
    try {
      return fn();
    } catch (e) {
      if (i === 4) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
}