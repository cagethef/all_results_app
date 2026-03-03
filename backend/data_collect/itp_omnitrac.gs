// ================= CONFIGURAÇÕES (PREFIXO ITP_OMNI_) =================
const ITP_OMNI_FOLDER_ID = "14gavd8M2ej8ec1JWKWDD6ng8vBksrwDk";

const ITP_OMNI_GCP_PROJECT_ID = "tractian-bi";
const ITP_OMNI_BQ_DATASET = "operations";
const ITP_OMNI_BQ_TABLE = "operations_itp_omnitrac_raw";

// LIMITADOR DE LOTE: Processa apenas X arquivos novos por vez
const ITP_OMNI_BATCH_SIZE = 500;

// Definição do Schema (Baseado no JSON de exemplo do STU Gen 2, ajustado para Omni se necessário)
// Assumindo estrutura similar, mas você pode ajustar conforme o JSON real do OmniTrac
const ITP_OMNI_SCHEMA_DEFINITION = {
  "source_file_name": "STRING",
  "ingestion_ts": "TIMESTAMP",
  
  // Identificadores e Metadados
  "sensor_id": "STRING",
  "batch_device_type": "STRING",
  "batch_id": "STRING",
  "batch_test_date": "STRING",
  "test_completed_at": "TIMESTAMP",
  "workflow_version": "STRING",
  
  // Resultado Final
  "final_result": "STRING", // Passed/Reproved
  "final_timestamp": "TIMESTAMP",
  "failed_steps_count": "INTEGER",
  "total_steps_count": "INTEGER",
  "failed_steps_list": "STRING", // JSON Array
  
  // Step 1: QR Code
  "step1_status": "STRING",
  "step1_timestamp": "TIMESTAMP",
  
  // Step 2: NFC
  "step2_status": "STRING",
  "step2_timestamp": "TIMESTAMP",
  "step2_external_id_read": "STRING",
  "step2_valid": "BOOLEAN",
  
  // Step 3: BLE Connect
  "step3_status": "STRING",
  "step3_timestamp": "TIMESTAMP",
  "step3_device_name": "STRING",
  "step3_device_address": "STRING",
  
  // Step 4: CLI Whoami
  "step4_status": "STRING",
  "step4_timestamp": "TIMESTAMP",
  "step4_components_ok": "INTEGER",
  "step4_components_total": "INTEGER",
  
  // Step 5: CLI Values (Temp/Humidity)
  "step5_status": "STRING",
  "step5_timestamp": "TIMESTAMP",
  "step5_humidity_value": "FLOAT",
  "step5_humidity_passed": "BOOLEAN",
  "step5_temp_value": "FLOAT",
  "step5_temp_passed": "BOOLEAN", // Baseado no sensor humidity_sensor
  "step5_mcu_temp_value": "FLOAT",
  "step5_mcu_temp_passed": "BOOLEAN",
  "step5_readings_json": "STRING", // Array completo de leituras
  
  // Step 6: SAS Mode
  "step6_status": "STRING",
  "step6_timestamp": "TIMESTAMP",
  "step6_sas_available": "BOOLEAN",
  
  // Step 7: Accelerometer Sample (Passive)
  "step7_status": "STRING",
  "step7_timestamp": "TIMESTAMP",
  "step7_rms_x": "FLOAT",
  "step7_rms_y": "FLOAT",
  "step7_rms_z": "FLOAT",
  "step7_dc_x": "FLOAT",
  "step7_dc_y": "FLOAT",
  "step7_dc_z": "FLOAT",
  "step7_csv_file": "STRING",
  "step7_validation_overall": "STRING",
  
  // Step 8: Magnetometer Sample (Passive)
  "step8_status": "STRING",
  "step8_timestamp": "TIMESTAMP",
  "step8_rms_x": "FLOAT",
  "step8_rms_y": "FLOAT",
  "step8_rms_z": "FLOAT",
  "step8_dc_x": "FLOAT",
  "step8_dc_y": "FLOAT",
  "step8_dc_z": "FLOAT",
  "step8_csv_file": "STRING",
  "step8_validation_overall": "STRING",
  
  // Step 9: Piezo Sample (Passive)
  "step9_status": "STRING",
  "step9_timestamp": "TIMESTAMP",
  "step9_rms": "FLOAT",
  "step9_dc": "FLOAT",
  "step9_csv_file": "STRING",
  "step9_validation_overall": "STRING",
  
  // Step 10: Accelerometer Active
  "step10_status": "STRING",
  "step10_timestamp": "TIMESTAMP",
  "step10_rms_x": "FLOAT",
  "step10_rms_y": "FLOAT",
  "step10_rms_z": "FLOAT",
  "step10_dc_x": "FLOAT",
  "step10_dc_y": "FLOAT",
  "step10_dc_z": "FLOAT",
  "step10_frf_score": "FLOAT",
  "step10_reference_rms": "FLOAT",
  "step10_validation_overall": "STRING",
  "step10_error_message": "STRING",
  
  // Step 11: Magnetometer Active
  "step11_status": "STRING",
  "step11_timestamp": "TIMESTAMP",
  "step11_rms_x": "FLOAT",
  "step11_rms_y": "FLOAT",
  "step11_rms_z": "FLOAT",
  "step11_dc_x": "FLOAT",
  "step11_dc_y": "FLOAT",
  "step11_dc_z": "FLOAT",
  "step11_validation_overall": "STRING",
  
  // Step 12: Piezo Active
  "step12_status": "STRING",
  "step12_timestamp": "TIMESTAMP",
  "step12_rms": "FLOAT",
  "step12_dc": "FLOAT",
  "step12_validation_overall": "STRING"
};

// ================= FUNÇÃO PRINCIPAL =================

function runDriveJsonItpOmniToBigQuery() {
  ensureItpOmniTableExists_(ITP_OMNI_BQ_TABLE, ITP_OMNI_SCHEMA_DEFINITION);

  const folder = DriveApp.getFolderById(ITP_OMNI_FOLDER_ID);
  
  // Busca arquivos (JSON)
  const it = folder.searchFiles('title contains ".json" and trashed = false');
  
  const allFilesFound = [];
  let scanned = 0;
  
  Logger.log("[ITP_OMNI] Iniciando varredura na pasta...");
  
  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;
    
    if (!/\.json$/i.test(name)) continue;
    
    allFilesFound.push({ name: name, file: file });
    
    if (scanned % 1000 === 0) Logger.log("[ITP_OMNI] Escaneados: %s...", scanned);
  }
  
  Logger.log("[ITP_OMNI] Total encontrados: %s. Verificando processados...", allFilesFound.length);
  
  processItpOmniJsonBatch_(allFilesFound);
  
  Logger.log("[ITP_OMNI] Execução finalizada.");
}

// ================= PROCESSAMENTO =================

function processItpOmniJsonBatch_(allItems) {
  if (!allItems.length) return;

  // 1. Verifica no BQ quais arquivos já existem
  const ids = allItems.map(x => x.name);
  const existing = fetchExistingItpOmniFilesFromBigQuery_(ITP_OMNI_BQ_TABLE, ids);
  
  // 2. Filtra apenas os novos
  const pendingItems = allItems.filter(x => !existing.has(x.name));
  
  Logger.log("[ITP_OMNI] Status: Total=%s | Já no BQ=%s | Pendentes=%s", 
             allItems.length, existing.size, pendingItems.length);
             
  if (!pendingItems.length) {
    Logger.log("[ITP_OMNI] Nada novo para processar.");
    return;
  }
  
  // 3. Aplica limite de lote
  const batchToProcess = pendingItems.slice(0, ITP_OMNI_BATCH_SIZE);
  
  Logger.log("[ITP_OMNI] Processando lote: %s arquivos...", batchToProcess.length);
  
  const rowsBuffer = [];
  const ingestionTs = new Date().toISOString();
  
  for (let i = 0; i < batchToProcess.length; i++) {
    const item = batchToProcess[i];
    try {
      const blob = item.file.getBlob();
      const jsonContent = blob.getDataAsString("UTF-8");
      
      if (!jsonContent || jsonContent.trim().length === 0) {
        Logger.log("[ITP_OMNI] AVISO: Arquivo vazio: %s", item.name);
        continue;
      }
      
      const jsonObj = JSON.parse(jsonContent);
      const row = flattenItpOmniJsonToRow_(jsonObj, item.name, ingestionTs);
      rowsBuffer.push(row);
      
    } catch (e) {
      Logger.log("[ITP_OMNI] ERRO no arquivo %s: %s", item.name, e.message);
    }
  }
  
  // 4. Envia para o BigQuery
  if (rowsBuffer.length > 0) {
    streamInsertItpOmniObjects_(ITP_OMNI_BQ_TABLE, rowsBuffer);
    Logger.log("[ITP_OMNI] SUCESSO: %s linhas inseridas.", rowsBuffer.length);
  }
}

function flattenItpOmniJsonToRow_(json, fileName, ingestionTs) {
  const get = (obj, key, def = null) => {
    if (!obj) return def;
    const keys = key.split('.');
    let current = obj;
    for (const k of keys) {
      if (current === undefined || current === null) return def;
      current = current[k];
    }
    return current !== undefined ? current : def;
  };
  
  const getBool = (obj, key) => {
    const val = get(obj, key);
    return val !== null ? Boolean(val) : null;
  };

  // Helper para formatar timestamp se necessário (embora o BQ aceite ISO direto)
  const getTs = (obj, key) => get(obj, key);

  return {
    source_file_name: fileName,
    ingestion_ts: ingestionTs,
    
    // Identificadores
    sensor_id: get(json, "sensor_id"),
    batch_device_type: get(json, "batch_info.device_type"),
    batch_id: get(json, "batch_info.batch_id"),
    batch_test_date: get(json, "batch_info.test_date"),
    test_completed_at: getTs(json, "test_metadata.completed_at"),
    workflow_version: get(json, "test_metadata.workflow_version"),
    
    // Resultado Final
    final_result: get(json, "final_result.result"),
    final_timestamp: getTs(json, "final_result.timestamp"),
    failed_steps_count: get(json, "final_result.failed_count"),
    total_steps_count: get(json, "final_result.total_steps"),
    failed_steps_list: json.final_result && json.final_result.failed_steps ? JSON.stringify(json.final_result.failed_steps) : "[]",
    
    // Step 1: QR Code
    step1_status: get(json, "step1_qrcode.status"),
    step1_timestamp: getTs(json, "step1_qrcode.timestamp"),
    
    // Step 2: NFC
    step2_status: get(json, "step2_nfc.status"),
    step2_timestamp: getTs(json, "step2_nfc.timestamp"),
    step2_external_id_read: get(json, "step2_nfc.external_id_read"),
    step2_valid: getBool(json, "step2_nfc.validation.valid"),
    
    // Step 3: BLE Connect
    step3_status: get(json, "step3_ble_connect.status"),
    step3_timestamp: getTs(json, "step3_ble_connect.timestamp"),
    step3_device_name: get(json, "step3_ble_connect.device.name"),
    step3_device_address: get(json, "step3_ble_connect.device.address"),
    
    // Step 4: CLI Whoami
    step4_status: get(json, "step4_cli_whoami.status"),
    step4_timestamp: getTs(json, "step4_cli_whoami.timestamp"),
    step4_components_ok: get(json, "step4_cli_whoami.summary.ok"),
    step4_components_total: get(json, "step4_cli_whoami.summary.total"),
    
    // Step 5: CLI Values
    step5_status: get(json, "step5_cli_values.status"),
    step5_timestamp: getTs(json, "step5_cli_values.timestamp"),
    step5_humidity_value: get(json, "step5_cli_values.latest_values.humidity.value"),
    step5_humidity_passed: getBool(json, "step5_cli_values.metrics_validation.humidity.passed"),
    step5_temp_value: get(json, "step5_cli_values.latest_values.temperature.value"),
    step5_temp_passed: getBool(json, "step5_cli_values.metrics_validation.temperature.humidity_sensor.passed"),
    step5_mcu_temp_value: get(json, "step5_cli_values.latest_values.mcu_temperature.value"),
    step5_mcu_temp_passed: getBool(json, "step5_cli_values.metrics_validation.temperature.mcu.passed"),
    step5_readings_json: json.step5_cli_values && json.step5_cli_values.readings ? JSON.stringify(json.step5_cli_values.readings) : null,
    
    // Step 6: SAS Mode
    step6_status: get(json, "step6_sas_mode.status"),
    step6_timestamp: getTs(json, "step6_sas_mode.timestamp"),
    step6_sas_available: getBool(json, "step6_sas_mode.device.sas_available"),
    
    // Step 7: Accelerometer Sample
    step7_status: get(json, "step7_accelerometer_sample.status"),
    step7_timestamp: getTs(json, "step7_accelerometer_sample.timestamp"),
    step7_rms_x: get(json, "step7_accelerometer_sample.rms.x"),
    step7_rms_y: get(json, "step7_accelerometer_sample.rms.y"),
    step7_rms_z: get(json, "step7_accelerometer_sample.rms.z"),
    step7_dc_x: get(json, "step7_accelerometer_sample.dc.x"),
    step7_dc_y: get(json, "step7_accelerometer_sample.dc.y"),
    step7_dc_z: get(json, "step7_accelerometer_sample.dc.z"),
    step7_csv_file: get(json, "step7_accelerometer_sample.csv_file"),
    step7_validation_overall: get(json, "step7_accelerometer_sample.metrics_validation.overall"),
    
    // Step 8: Magnetometer Sample
    step8_status: get(json, "step8_magnetometer_sample.status"),
    step8_timestamp: getTs(json, "step8_magnetometer_sample.timestamp"),
    step8_rms_x: get(json, "step8_magnetometer_sample.rms.x"),
    step8_rms_y: get(json, "step8_magnetometer_sample.rms.y"),
    step8_rms_z: get(json, "step8_magnetometer_sample.rms.z"),
    step8_dc_x: get(json, "step8_magnetometer_sample.dc.x"),
    step8_dc_y: get(json, "step8_magnetometer_sample.dc.y"),
    step8_dc_z: get(json, "step8_magnetometer_sample.dc.z"),
    step8_csv_file: get(json, "step8_magnetometer_sample.csv_file"),
    step8_validation_overall: get(json, "step8_magnetometer_sample.metrics_validation.overall"),
    
    // Step 9: Piezo Sample
    step9_status: get(json, "step9_piezo_sample.status"),
    step9_timestamp: getTs(json, "step9_piezo_sample.timestamp"),
    step9_rms: get(json, "step9_piezo_sample.rms"),
    step9_dc: get(json, "step9_piezo_sample.dc"),
    step9_csv_file: get(json, "step9_piezo_sample.csv_file"),
    step9_validation_overall: get(json, "step9_piezo_sample.metrics_validation.overall"),
    
    // Step 10: Accelerometer Active
    step10_status: get(json, "step10_accelerometer_active.status"),
    step10_timestamp: getTs(json, "step10_accelerometer_active.timestamp"),
    step10_rms_x: get(json, "step10_accelerometer_active.rms.x"),
    step10_rms_y: get(json, "step10_accelerometer_active.rms.y"),
    step10_rms_z: get(json, "step10_accelerometer_active.rms.z"),
    step10_dc_x: get(json, "step10_accelerometer_active.dc.x"),
    step10_dc_y: get(json, "step10_accelerometer_active.dc.y"),
    step10_dc_z: get(json, "step10_accelerometer_active.dc.z"),
    step10_frf_score: get(json, "step10_accelerometer_active.frf_score"),
    step10_reference_rms: get(json, "step10_accelerometer_active.reference_rms"),
    step10_validation_overall: get(json, "step10_accelerometer_active.metrics_validation.overall"),
    step10_error_message: get(json, "step10_accelerometer_active.error"),
    
    // Step 11: Magnetometer Active
    step11_status: get(json, "step11_magnetometer_active.status"),
    step11_timestamp: getTs(json, "step11_magnetometer_active.timestamp"),
    step11_rms_x: get(json, "step11_magnetometer_active.rms.x"),
    step11_rms_y: get(json, "step11_magnetometer_active.rms.y"),
    step11_rms_z: get(json, "step11_magnetometer_active.rms.z"),
    step11_dc_x: get(json, "step11_magnetometer_active.dc.x"),
    step11_dc_y: get(json, "step11_magnetometer_active.dc.y"),
    step11_dc_z: get(json, "step11_magnetometer_active.dc.z"),
    step11_validation_overall: get(json, "step11_magnetometer_active.metrics_validation.overall"),
    
    // Step 12: Piezo Active
    step12_status: get(json, "step12_piezo_active.status"),
    step12_timestamp: getTs(json, "step12_piezo_active.timestamp"),
    step12_rms: get(json, "step12_piezo_active.rms"),
    step12_dc: get(json, "step12_piezo_active.dc"),
    step12_validation_overall: get(json, "step12_piezo_active.metrics_validation.overall")
  };
}

// ================= BIGQUERY HELPERS =================

function ensureItpOmniTableExists_(tableId, schemaDef) {
  let table = null;
  try {
    table = withItpOmniRetry_(() => BigQuery.Tables.get(ITP_OMNI_GCP_PROJECT_ID, ITP_OMNI_BQ_DATASET, tableId));
  } catch (e) {
    if (!String(e).includes("Not found")) throw e;
  }

  const fields = Object.keys(schemaDef).map(key => ({
    name: key,
    type: schemaDef[key],
    mode: "NULLABLE"
  }));

  if (!table) {
    Logger.log("[ITP_OMNI] Criando tabela %s...", tableId);
    const resource = {
      tableReference: { projectId: ITP_OMNI_GCP_PROJECT_ID, datasetId: ITP_OMNI_BQ_DATASET, tableId },
      schema: { fields }
    };
    withItpOmniRetry_(() => BigQuery.Tables.insert(resource, ITP_OMNI_GCP_PROJECT_ID, ITP_OMNI_BQ_DATASET));
    Logger.log("[ITP_OMNI] Tabela criada.");
  } else {
    const existingCols = new Set((table.schema.fields || []).map(f => f.name));
    const newCols = fields.filter(f => !existingCols.has(f.name));
    if (newCols.length > 0) {
      Logger.log("[ITP_OMNI] Adicionando %s novas colunas...", newCols.length);
      const mergedFields = (table.schema.fields || []).concat(newCols);
      withItpOmniRetry_(() => BigQuery.Tables.patch({ schema: { fields: mergedFields } }, ITP_OMNI_GCP_PROJECT_ID, ITP_OMNI_BQ_DATASET, tableId));
    }
  }
}

function fetchExistingItpOmniFilesFromBigQuery_(tableId, fileNames) {
  const existing = new Set();
  if (!fileNames.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    const listStr = batch.map(n => `'${n.replace(/'/g, "\\'")}'`).join(",");
    
    const query = `
      SELECT DISTINCT source_file_name 
      FROM \`${ITP_OMNI_GCP_PROJECT_ID}.${ITP_OMNI_BQ_DATASET}.${tableId}\`
      WHERE source_file_name IN (${listStr})
    `;
    
    try {
      const res = withItpOmniRetry_(() => BigQuery.Jobs.query({ query, useLegacySql: false }, ITP_OMNI_GCP_PROJECT_ID));
      if (res.rows) {
        res.rows.forEach(r => existing.add(r.f[0].v));
      }
    } catch (e) {
      // Ignora erro se tabela vazia
    }
  }
  return existing;
}

function streamInsertItpOmniObjects_(tableId, objects) {
  if (!objects.length) return;
  const chunkSize = 500;
  
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    const request = {
      rows: chunk.map(o => ({ insertId: Utilities.getUuid(), json: o }))
    };
    
    Logger.log("[ITP_OMNI] Inserindo %s linhas...", chunk.length);
    
    const resp = withItpOmniRetry_(() => BigQuery.Tabledata.insertAll(request, ITP_OMNI_GCP_PROJECT_ID, ITP_OMNI_BQ_DATASET, tableId));
    
    if (resp.insertErrors && resp.insertErrors.length) {
      Logger.log("[ITP_OMNI] ERRO DE INSERÇÃO: " + JSON.stringify(resp.insertErrors[0]));
    }
  }
}

function withItpOmniRetry_(fn) {
  for (let i = 0; i < 5; i++) {
    try {
      return fn();
    } catch (e) {
      if (i === 4) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
}