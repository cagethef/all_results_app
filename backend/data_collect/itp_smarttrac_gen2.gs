// ================= CONFIGURAÇÕES (PREFIXO ITP_STU_G2_) =================
const ITP_STU_G2_FOLDER_ID = "1T7tBBQSwqTbkkFQ1JOLJidSyyKyiGC_t";

const ITP_STU_G2_GCP_PROJECT_ID = "tractian-bi";
const ITP_STU_G2_BQ_DATASET = "operations";
const ITP_STU_G2_BQ_TABLE = "operations_itp_smarttrac_ultra_gen2_raw";

// LIMITADOR DE LOTE: Processa apenas X arquivos novos por vez
const ITP_STU_G2_BATCH_SIZE = 500;

// ================= DEFINIÇÃO DO SCHEMA COMPLETO =================
const ITP_STU_G2_SCHEMA_DEFINITION = {
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
  "final_result": "STRING",
  "final_timestamp": "TIMESTAMP",
  "failed_steps_count": "INTEGER",
  "total_steps_count": "INTEGER",
  "passed_steps_count": "INTEGER",
  "failed_steps_list": "STRING",
  
  // Step 1: QR Code
  "step1_status": "STRING",
  "step1_timestamp": "TIMESTAMP",
  
  // Step 2: NFC
  "step2_status": "STRING",
  "step2_timestamp": "TIMESTAMP",
  "step2_external_id_read": "STRING",
  "step2_external_id_expected": "STRING",
  "step2_valid": "BOOLEAN",
  "step2_match": "BOOLEAN",
  
  // Step 3: BLE Connect
  "step3_status": "STRING",
  "step3_timestamp": "TIMESTAMP",
  "step3_device_name": "STRING",
  "step3_device_address": "STRING",
  "step3_sas_available": "BOOLEAN",
  "step3_cli_available": "BOOLEAN",
  "step3_rssi": "INTEGER",
  
  // Step 4: CLI Whoami
  "step4_status": "STRING",
  "step4_timestamp": "TIMESTAMP",
  "step4_components_ok": "INTEGER",
  "step4_components_total": "INTEGER",
  
  // Step 5: CLI Values (Temp/Humidity)
  "step5_status": "STRING",
  "step5_timestamp": "TIMESTAMP",
  "step5_num_readings": "INTEGER",
  "step5_reading_interval": "FLOAT",
  
  // Step 5: Humidity Validation
  "step5_humidity_value": "FLOAT",
  "step5_humidity_passed": "BOOLEAN",
  "step5_humidity_expected": "FLOAT",
  "step5_humidity_tolerance": "STRING",
  
  // Step 5: Temperature (Humidity Sensor) Validation
  "step5_temp_value": "FLOAT",
  "step5_temp_passed": "BOOLEAN",
  "step5_temp_expected": "FLOAT",
  "step5_temp_tolerance": "STRING",
  
  // Step 5: MCU Temperature Validation
  "step5_mcu_temp_value": "FLOAT",
  "step5_mcu_temp_passed": "BOOLEAN",
  "step5_mcu_temp_expected": "FLOAT",
  "step5_mcu_temp_tolerance": "STRING",
  
  "step5_readings_json": "STRING",
  
  // Step 6: SAS Mode
  "step6_status": "STRING",
  "step6_timestamp": "TIMESTAMP",
  "step6_sas_available": "BOOLEAN",
  "step6_cli_active": "BOOLEAN",
  
  // Step 7: Accelerometer Sample (Passive)
  "step7_status": "STRING",
  "step7_timestamp": "TIMESTAMP",
  "step7_fs": "INTEGER",
  "step7_duration": "FLOAT",
  "step7_accel_range": "INTEGER",
  "step7_expected_samples": "INTEGER",
  "step7_samples_collected": "INTEGER",
  
  "step7_rms_x": "FLOAT",
  "step7_rms_y": "FLOAT",
  "step7_rms_z": "FLOAT",
  "step7_dc_x": "FLOAT",
  "step7_dc_y": "FLOAT",
  "step7_dc_z": "FLOAT",
  
  // Step 7: Validation Details
  "step7_val_rms_x_passed": "BOOLEAN",
  "step7_val_rms_x_expected": "FLOAT",
  "step7_val_rms_x_tolerance": "STRING",
  "step7_val_rms_y_passed": "BOOLEAN",
  "step7_val_rms_y_expected": "FLOAT",
  "step7_val_rms_y_tolerance": "STRING",
  "step7_val_rms_z_passed": "BOOLEAN",
  "step7_val_rms_z_expected": "FLOAT",
  "step7_val_rms_z_tolerance": "STRING",
  
  "step7_val_dc_x_passed": "BOOLEAN",
  "step7_val_dc_x_expected": "FLOAT",
  "step7_val_dc_x_tolerance": "STRING",
  "step7_val_dc_y_passed": "BOOLEAN",
  "step7_val_dc_y_expected": "FLOAT",
  "step7_val_dc_y_tolerance": "STRING",
  "step7_val_dc_z_passed": "BOOLEAN",
  "step7_val_dc_z_expected": "FLOAT",
  "step7_val_dc_z_tolerance": "STRING",
  
  "step7_csv_file": "STRING",
  "step7_validation_overall": "STRING",
  
  // Step 8: Magnetometer Sample (Passive)
  "step8_status": "STRING",
  "step8_timestamp": "TIMESTAMP",
  "step8_fs": "INTEGER",
  "step8_duration": "FLOAT",
  "step8_expected_samples": "INTEGER",
  "step8_samples_collected": "INTEGER",
  
  "step8_rms_x": "FLOAT",
  "step8_rms_y": "FLOAT",
  "step8_rms_z": "FLOAT",
  "step8_dc_x": "FLOAT",
  "step8_dc_y": "FLOAT",
  "step8_dc_z": "FLOAT",
  
  // Step 8: Validation Details
  "step8_val_rms_x_passed": "BOOLEAN",
  "step8_val_rms_x_expected": "FLOAT",
  "step8_val_rms_x_tolerance": "STRING",
  "step8_val_rms_y_passed": "BOOLEAN",
  "step8_val_rms_y_expected": "FLOAT",
  "step8_val_rms_y_tolerance": "STRING",
  "step8_val_rms_z_passed": "BOOLEAN",
  "step8_val_rms_z_expected": "FLOAT",
  "step8_val_rms_z_tolerance": "STRING",
  
  "step8_val_dc_x_passed": "BOOLEAN",
  "step8_val_dc_x_expected": "FLOAT",
  "step8_val_dc_x_tolerance": "STRING",
  "step8_val_dc_y_passed": "BOOLEAN",
  "step8_val_dc_y_expected": "FLOAT",
  "step8_val_dc_y_tolerance": "STRING",
  "step8_val_dc_z_passed": "BOOLEAN",
  "step8_val_dc_z_expected": "FLOAT",
  "step8_val_dc_z_tolerance": "STRING",
  
  "step8_csv_file": "STRING",
  "step8_validation_overall": "STRING",
  
  // Step 9: Piezo Sample (Passive)
  "step9_status": "STRING",
  "step9_timestamp": "TIMESTAMP",
  "step9_fs": "INTEGER",
  "step9_duration": "FLOAT",
  "step9_gain": "INTEGER",
  "step9_expected_samples": "INTEGER",
  "step9_samples_collected": "INTEGER",
  
  "step9_rms": "FLOAT",
  "step9_dc": "FLOAT",
  
  // Step 9: Validation Details
  "step9_val_rms_passed": "BOOLEAN",
  "step9_val_rms_expected": "FLOAT",
  "step9_val_rms_tolerance": "STRING",
  "step9_val_dc_passed": "BOOLEAN",
  "step9_val_dc_expected": "FLOAT",
  "step9_val_dc_tolerance": "STRING",
  
  "step9_csv_file": "STRING",
  "step9_validation_overall": "STRING",
  
  // Step 10: Accelerometer Active
  "step10_status": "STRING",
  "step10_timestamp": "TIMESTAMP",
  "step10_fs": "INTEGER",
  "step10_duration": "FLOAT",
  "step10_accel_range": "INTEGER",
  "step10_expected_samples": "INTEGER",
  "step10_samples_collected": "INTEGER",
  "step10_wavegen_frequency": "FLOAT",
  "step10_wavegen_amplitude": "FLOAT",
  
  "step10_rms_x": "FLOAT",
  "step10_rms_y": "FLOAT",
  "step10_rms_z": "FLOAT",
  "step10_dc_x": "FLOAT",
  "step10_dc_y": "FLOAT",
  "step10_dc_z": "FLOAT",
  "step10_frf_score": "FLOAT",
  "step10_reference_rms": "FLOAT",
  
  // Step 10: Validation Details
  "step10_val_rms_x_passed": "BOOLEAN",
  "step10_val_rms_x_expected": "FLOAT",
  "step10_val_rms_x_tolerance": "STRING",
  "step10_val_rms_y_passed": "BOOLEAN",
  "step10_val_rms_y_expected": "FLOAT",
  "step10_val_rms_y_tolerance": "STRING",
  "step10_val_rms_z_passed": "BOOLEAN",
  "step10_val_rms_z_expected": "FLOAT",
  "step10_val_rms_z_tolerance": "STRING",
  
  "step10_val_dc_x_passed": "BOOLEAN",
  "step10_val_dc_x_expected": "FLOAT",
  "step10_val_dc_x_tolerance": "STRING",
  "step10_val_dc_y_passed": "BOOLEAN",
  "step10_val_dc_y_expected": "FLOAT",
  "step10_val_dc_y_tolerance": "STRING",
  "step10_val_dc_z_passed": "BOOLEAN",
  "step10_val_dc_z_expected": "FLOAT",
  "step10_val_dc_z_tolerance": "STRING",
  
  "step10_val_frf_passed": "BOOLEAN",
  "step10_val_frf_expected": "FLOAT",
  "step10_val_frf_tolerance": "STRING",
  
  "step10_val_ref_rms_passed": "BOOLEAN",
  "step10_val_ref_rms_expected": "FLOAT",
  "step10_val_ref_rms_tolerance": "STRING",
  
  "step10_validation_overall": "STRING",
  "step10_error_message": "STRING",
  "step10_csv_file": "STRING",
  "step10_reference_csv_file": "STRING",
  
  // Step 11: Magnetometer Active
  "step11_status": "STRING",
  "step11_timestamp": "TIMESTAMP",
  "step11_fs": "INTEGER",
  "step11_duration": "FLOAT",
  "step11_expected_samples": "INTEGER",
  "step11_samples_collected": "INTEGER",
  "step11_wavegen_frequency": "FLOAT",
  "step11_wavegen_amplitude": "FLOAT",
  
  "step11_rms_x": "FLOAT",
  "step11_rms_y": "FLOAT",
  "step11_rms_z": "FLOAT",
  "step11_dc_x": "FLOAT",
  "step11_dc_y": "FLOAT",
  "step11_dc_z": "FLOAT",
  
  // Step 11: Validation Details
  "step11_val_rms_x_passed": "BOOLEAN",
  "step11_val_rms_x_expected": "FLOAT",
  "step11_val_rms_x_tolerance": "STRING",
  "step11_val_rms_y_passed": "BOOLEAN",
  "step11_val_rms_y_expected": "FLOAT",
  "step11_val_rms_y_tolerance": "STRING",
  "step11_val_rms_z_passed": "BOOLEAN",
  "step11_val_rms_z_expected": "FLOAT",
  "step11_val_rms_z_tolerance": "STRING",
  
  "step11_val_dc_x_passed": "BOOLEAN",
  "step11_val_dc_x_expected": "FLOAT",
  "step11_val_dc_x_tolerance": "STRING",
  "step11_val_dc_y_passed": "BOOLEAN",
  "step11_val_dc_y_expected": "FLOAT",
  "step11_val_dc_y_tolerance": "STRING",
  "step11_val_dc_z_passed": "BOOLEAN",
  "step11_val_dc_z_expected": "FLOAT",
  "step11_val_dc_z_tolerance": "STRING",
  
  "step11_validation_overall": "STRING",
  "step11_csv_file": "STRING",
  
  // Step 12: Piezo Active
  "step12_status": "STRING",
  "step12_timestamp": "TIMESTAMP",
  "step12_fs": "INTEGER",
  "step12_duration": "FLOAT",
  "step12_gain": "INTEGER",
  "step12_expected_samples": "INTEGER",
  "step12_samples_collected": "INTEGER",
  "step12_wavegen_frequency": "FLOAT",
  "step12_wavegen_amplitude": "FLOAT",
  
  "step12_rms": "FLOAT",
  "step12_dc": "FLOAT",
  
  // Step 12: Validation Details
  "step12_val_rms_passed": "BOOLEAN",
  "step12_val_rms_expected": "FLOAT",
  "step12_val_rms_tolerance": "STRING",
  "step12_val_dc_passed": "BOOLEAN",
  "step12_val_dc_expected": "FLOAT",
  "step12_val_dc_tolerance": "STRING",
  
  "step12_validation_overall": "STRING",
  "step12_csv_file": "STRING"
};

// ================= FUNÇÃO PRINCIPAL =================

function runDriveJsonItpStuG2ToBigQuery() {
  ensureItpStuG2TableExists_(ITP_STU_G2_BQ_TABLE, ITP_STU_G2_SCHEMA_DEFINITION);

  const folder = DriveApp.getFolderById(ITP_STU_G2_FOLDER_ID);
  
  // Busca arquivos (JSON)
  const it = folder.searchFiles('title contains ".json" and trashed = false');
  
  const allFilesFound = [];
  let scanned = 0;
  
  Logger.log("[ITP_STU_G2] Iniciando varredura na pasta...");
  
  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;
    
    if (!/\.json$/i.test(name)) continue;
    
    allFilesFound.push({ name: name, file: file });
    
    if (scanned % 1000 === 0) Logger.log("[ITP_STU_G2] Escaneados: %s...", scanned);
  }
  
  Logger.log("[ITP_STU_G2] Total encontrados: %s. Verificando processados...", allFilesFound.length);
  
  processItpStuG2JsonBatch_(allFilesFound);
  
  Logger.log("[ITP_STU_G2] Execução finalizada.");
}

// ================= PROCESSAMENTO =================

function processItpStuG2JsonBatch_(allItems) {
  if (!allItems.length) return;

  // 1. Verifica no BQ quais arquivos já existem
  const ids = allItems.map(x => x.name);
  const existing = fetchExistingItpStuG2FilesFromBigQuery_(ITP_STU_G2_BQ_TABLE, ids);
  
  // 2. Filtra apenas os novos
  const pendingItems = allItems.filter(x => !existing.has(x.name));
  
  Logger.log("[ITP_STU_G2] Status: Total=%s | Já no BQ=%s | Pendentes=%s", 
             allItems.length, existing.size, pendingItems.length);
             
  if (!pendingItems.length) {
    Logger.log("[ITP_STU_G2] Nada novo para processar.");
    return;
  }
  
  // 3. Aplica limite de lote
  const batchToProcess = pendingItems.slice(0, ITP_STU_G2_BATCH_SIZE);
  
  Logger.log("[ITP_STU_G2] Processando lote: %s arquivos...", batchToProcess.length);
  
  const rowsBuffer = [];
  const ingestionTs = new Date().toISOString();
  
  for (let i = 0; i < batchToProcess.length; i++) {
    const item = batchToProcess[i];
    try {
      const blob = item.file.getBlob();
      const jsonContent = blob.getDataAsString("UTF-8");
      
      if (!jsonContent || jsonContent.trim().length === 0) {
        Logger.log("[ITP_STU_G2] AVISO: Arquivo vazio: %s", item.name);
        continue;
      }
      
      const jsonObj = JSON.parse(jsonContent);
      const row = flattenItpStuG2JsonToRow_(jsonObj, item.name, ingestionTs);
      rowsBuffer.push(row);
      
    } catch (e) {
      Logger.log("[ITP_STU_G2] ERRO no arquivo %s: %s", item.name, e.message);
    }
  }
  
  // 4. Envia para o BigQuery
  if (rowsBuffer.length > 0) {
    streamInsertItpStuG2Objects_(ITP_STU_G2_BQ_TABLE, rowsBuffer);
    Logger.log("[ITP_STU_G2] SUCESSO: %s linhas inseridas.", rowsBuffer.length);
  }
}

// ================= FLATTENING (MAPEAMENTO JSON -> TABELA) =================

function flattenItpStuG2JsonToRow_(json, fileName, ingestionTs) {
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
    passed_steps_count: get(json, "final_result.passed_steps"),
    failed_steps_list: json.final_result && json.final_result.failed_steps ? JSON.stringify(json.final_result.failed_steps) : "[]",
    
    // Step 1: QR Code
    step1_status: get(json, "step1_qrcode.status"),
    step1_timestamp: getTs(json, "step1_qrcode.timestamp"),
    
    // Step 2: NFC
    step2_status: get(json, "step2_nfc.status"),
    step2_timestamp: getTs(json, "step2_nfc.timestamp"),
    step2_external_id_read: get(json, "step2_nfc.external_id_read"),
    step2_external_id_expected: get(json, "step2_nfc.external_id_expected"),
    step2_valid: getBool(json, "step2_nfc.validation.valid"),
    step2_match: getBool(json, "step2_nfc.validation.match"),
    
    // Step 3: BLE Connect
    step3_status: get(json, "step3_ble_connect.status"),
    step3_timestamp: getTs(json, "step3_ble_connect.timestamp"),
    step3_device_name: get(json, "step3_ble_connect.device.name"),
    step3_device_address: get(json, "step3_ble_connect.device.address"),
    step3_sas_available: getBool(json, "step3_ble_connect.device.sas_available"),
    step3_cli_available: getBool(json, "step3_ble_connect.device.cli_available"),
    step3_rssi: get(json, "step3_ble_connect.device.rssi"),
    
    // Step 4: CLI Whoami
    step4_status: get(json, "step4_cli_whoami.status"),
    step4_timestamp: getTs(json, "step4_cli_whoami.timestamp"),
    step4_components_ok: get(json, "step4_cli_whoami.summary.ok"),
    step4_components_total: get(json, "step4_cli_whoami.summary.total"),
    
    // Step 5: CLI Values
    step5_status: get(json, "step5_cli_values.status"),
    step5_timestamp: getTs(json, "step5_cli_values.timestamp"),
    step5_num_readings: get(json, "step5_cli_values.num_readings"),
    step5_reading_interval: get(json, "step5_cli_values.reading_interval"),
    
    // Step 5: Humidity Validation
    step5_humidity_value: get(json, "step5_cli_values.latest_values.humidity.value"),
    step5_humidity_passed: getBool(json, "step5_cli_values.metrics_validation.humidity.passed"),
    step5_humidity_expected: get(json, "step5_cli_values.metrics_validation.humidity.expected"),
    step5_humidity_tolerance: get(json, "step5_cli_values.metrics_validation.humidity.tolerance"),
    
    // Step 5: Temperature (Humidity Sensor) Validation
    step5_temp_value: get(json, "step5_cli_values.latest_values.temperature.value"),
    step5_temp_passed: getBool(json, "step5_cli_values.metrics_validation.temperature.humidity_sensor.passed"),
    step5_temp_expected: get(json, "step5_cli_values.metrics_validation.temperature.humidity_sensor.expected"),
    step5_temp_tolerance: get(json, "step5_cli_values.metrics_validation.temperature.humidity_sensor.tolerance"),
    
    // Step 5: MCU Temperature Validation
    step5_mcu_temp_value: get(json, "step5_cli_values.latest_values.mcu_temperature.value"),
    step5_mcu_temp_passed: getBool(json, "step5_cli_values.metrics_validation.temperature.mcu.passed"),
    step5_mcu_temp_expected: get(json, "step5_cli_values.metrics_validation.temperature.mcu.expected"),
    step5_mcu_temp_tolerance: get(json, "step5_cli_values.metrics_validation.temperature.mcu.tolerance"),
    
    step5_readings_json: json.step5_cli_values && json.step5_cli_values.readings ? JSON.stringify(json.step5_cli_values.readings) : null,
    
    // Step 6: SAS Mode
    step6_status: get(json, "step6_sas_mode.status"),
    step6_timestamp: getTs(json, "step6_sas_mode.timestamp"),
    step6_sas_available: getBool(json, "step6_sas_mode.device.sas_available"),
    step6_cli_active: getBool(json, "step6_sas_mode.device.cli_active"),
    
    // Step 7: Accelerometer Sample (Passive)
    step7_status: get(json, "step7_accelerometer_sample.status"),
    step7_timestamp: getTs(json, "step7_accelerometer_sample.timestamp"),
    step7_fs: get(json, "step7_accelerometer_sample.parameters.fs"),
    step7_duration: get(json, "step7_accelerometer_sample.parameters.duration"),
    step7_accel_range: get(json, "step7_accelerometer_sample.parameters.accel_range"),
    step7_expected_samples: get(json, "step7_accelerometer_sample.parameters.expected_samples"),
    step7_samples_collected: get(json, "step7_accelerometer_sample.collection.samples_collected"),
    
    step7_rms_x: get(json, "step7_accelerometer_sample.rms.x"),
    step7_rms_y: get(json, "step7_accelerometer_sample.rms.y"),
    step7_rms_z: get(json, "step7_accelerometer_sample.rms.z"),
    step7_dc_x: get(json, "step7_accelerometer_sample.dc.x"),
    step7_dc_y: get(json, "step7_accelerometer_sample.dc.y"),
    step7_dc_z: get(json, "step7_accelerometer_sample.dc.z"),
    
    // Step 7: Validation Details
    step7_val_rms_x_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.rms.x.passed"),
    step7_val_rms_x_expected: get(json, "step7_accelerometer_sample.metrics_validation.rms.x.expected"),
    step7_val_rms_x_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.rms.x.tolerance"),
    step7_val_rms_y_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.rms.y.passed"),
    step7_val_rms_y_expected: get(json, "step7_accelerometer_sample.metrics_validation.rms.y.expected"),
    step7_val_rms_y_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.rms.y.tolerance"),
    step7_val_rms_z_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.rms.z.passed"),
    step7_val_rms_z_expected: get(json, "step7_accelerometer_sample.metrics_validation.rms.z.expected"),
    step7_val_rms_z_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.rms.z.tolerance"),
    
    step7_val_dc_x_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.dc.x.passed"),
    step7_val_dc_x_expected: get(json, "step7_accelerometer_sample.metrics_validation.dc.x.expected"),
    step7_val_dc_x_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.dc.x.tolerance"),
    step7_val_dc_y_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.dc.y.passed"),
    step7_val_dc_y_expected: get(json, "step7_accelerometer_sample.metrics_validation.dc.y.expected"),
    step7_val_dc_y_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.dc.y.tolerance"),
    step7_val_dc_z_passed: getBool(json, "step7_accelerometer_sample.metrics_validation.dc.z.passed"),
    step7_val_dc_z_expected: get(json, "step7_accelerometer_sample.metrics_validation.dc.z.expected"),
    step7_val_dc_z_tolerance: get(json, "step7_accelerometer_sample.metrics_validation.dc.z.tolerance"),
    
    step7_csv_file: get(json, "step7_accelerometer_sample.csv_file"),
    step7_validation_overall: get(json, "step7_accelerometer_sample.metrics_validation.overall"),
    
    // Step 8: Magnetometer Sample (Passive)
    step8_status: get(json, "step8_magnetometer_sample.status"),
    step8_timestamp: getTs(json, "step8_magnetometer_sample.timestamp"),
    step8_fs: get(json, "step8_magnetometer_sample.parameters.fs"),
    step8_duration: get(json, "step8_magnetometer_sample.parameters.duration"),
    step8_expected_samples: get(json, "step8_magnetometer_sample.parameters.expected_samples"),
    step8_samples_collected: get(json, "step8_magnetometer_sample.collection.samples_collected"),
    
    step8_rms_x: get(json, "step8_magnetometer_sample.rms.x"),
    step8_rms_y: get(json, "step8_magnetometer_sample.rms.y"),
    step8_rms_z: get(json, "step8_magnetometer_sample.rms.z"),
    step8_dc_x: get(json, "step8_magnetometer_sample.dc.x"),
    step8_dc_y: get(json, "step8_magnetometer_sample.dc.y"),
    step8_dc_z: get(json, "step8_magnetometer_sample.dc.z"),
    
    // Step 8: Validation Details
    step8_val_rms_x_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.rms.x.passed"),
    step8_val_rms_x_expected: get(json, "step8_magnetometer_sample.metrics_validation.rms.x.expected"),
    step8_val_rms_x_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.rms.x.tolerance"),
    step8_val_rms_y_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.rms.y.passed"),
    step8_val_rms_y_expected: get(json, "step8_magnetometer_sample.metrics_validation.rms.y.expected"),
    step8_val_rms_y_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.rms.y.tolerance"),
    step8_val_rms_z_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.rms.z.passed"),
    step8_val_rms_z_expected: get(json, "step8_magnetometer_sample.metrics_validation.rms.z.expected"),
    step8_val_rms_z_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.rms.z.tolerance"),
    
    step8_val_dc_x_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.dc.x.passed"),
    step8_val_dc_x_expected: get(json, "step8_magnetometer_sample.metrics_validation.dc.x.expected"),
    step8_val_dc_x_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.dc.x.tolerance"),
    step8_val_dc_y_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.dc.y.passed"),
    step8_val_dc_y_expected: get(json, "step8_magnetometer_sample.metrics_validation.dc.y.expected"),
    step8_val_dc_y_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.dc.y.tolerance"),
    step8_val_dc_z_passed: getBool(json, "step8_magnetometer_sample.metrics_validation.dc.z.passed"),
    step8_val_dc_z_expected: get(json, "step8_magnetometer_sample.metrics_validation.dc.z.expected"),
    step8_val_dc_z_tolerance: get(json, "step8_magnetometer_sample.metrics_validation.dc.z.tolerance"),
    
    step8_csv_file: get(json, "step8_magnetometer_sample.csv_file"),
    step8_validation_overall: get(json, "step8_magnetometer_sample.metrics_validation.overall"),
    
    // Step 9: Piezo Sample (Passive)
    step9_status: get(json, "step9_piezo_sample.status"),
    step9_timestamp: getTs(json, "step9_piezo_sample.timestamp"),
    step9_fs: get(json, "step9_piezo_sample.parameters.fs"),
    step9_duration: get(json, "step9_piezo_sample.parameters.duration"),
    step9_gain: get(json, "step9_piezo_sample.parameters.gain"),
    step9_expected_samples: get(json, "step9_piezo_sample.parameters.expected_samples"),
    step9_samples_collected: get(json, "step9_piezo_sample.collection.samples_collected"),
    
    step9_rms: get(json, "step9_piezo_sample.rms"),
    step9_dc: get(json, "step9_piezo_sample.dc"),
    
    // Step 9: Validation Details
    step9_val_rms_passed: getBool(json, "step9_piezo_sample.metrics_validation.rms.passed"),
    step9_val_rms_expected: get(json, "step9_piezo_sample.metrics_validation.rms.expected"),
    step9_val_rms_tolerance: get(json, "step9_piezo_sample.metrics_validation.rms.tolerance"),
    step9_val_dc_passed: getBool(json, "step9_piezo_sample.metrics_validation.dc.passed"),
    step9_val_dc_expected: get(json, "step9_piezo_sample.metrics_validation.dc.expected"),
    step9_val_dc_tolerance: get(json, "step9_piezo_sample.metrics_validation.dc.tolerance"),
    
    step9_csv_file: get(json, "step9_piezo_sample.csv_file"),
    step9_validation_overall: get(json, "step9_piezo_sample.metrics_validation.overall"),
    
    // Step 10: Accelerometer Active
    step10_status: get(json, "step10_accelerometer_active.status"),
    step10_timestamp: getTs(json, "step10_accelerometer_active.timestamp"),
    step10_fs: get(json, "step10_accelerometer_active.parameters.fs"),
    step10_duration: get(json, "step10_accelerometer_active.parameters.duration"),
    step10_accel_range: get(json, "step10_accelerometer_active.parameters.accel_range"),
    step10_expected_samples: get(json, "step10_accelerometer_active.parameters.expected_samples"),
    step10_samples_collected: get(json, "step10_accelerometer_active.collection.samples_collected"),
    step10_wavegen_frequency: get(json, "step10_accelerometer_active.parameters.frequency"),
    step10_wavegen_amplitude: get(json, "step10_accelerometer_active.parameters.amplitude"),
    
    step10_rms_x: get(json, "step10_accelerometer_active.rms.x"),
    step10_rms_y: get(json, "step10_accelerometer_active.rms.y"),
    step10_rms_z: get(json, "step10_accelerometer_active.rms.z"),
    step10_dc_x: get(json, "step10_accelerometer_active.dc.x"),
    step10_dc_y: get(json, "step10_accelerometer_active.dc.y"),
    step10_dc_z: get(json, "step10_accelerometer_active.dc.z"),
    step10_frf_score: get(json, "step10_accelerometer_active.frf_score"),
    step10_reference_rms: get(json, "step10_accelerometer_active.reference_rms"),
    
    // Step 10: Validation Details
    step10_val_rms_x_passed: getBool(json, "step10_accelerometer_active.metrics_validation.rms.x.passed"),
    step10_val_rms_x_expected: get(json, "step10_accelerometer_active.metrics_validation.rms.x.expected"),
    step10_val_rms_x_tolerance: get(json, "step10_accelerometer_active.metrics_validation.rms.x.tolerance"),
    step10_val_rms_y_passed: getBool(json, "step10_accelerometer_active.metrics_validation.rms.y.passed"),
    step10_val_rms_y_expected: get(json, "step10_accelerometer_active.metrics_validation.rms.y.expected"),
    step10_val_rms_y_tolerance: get(json, "step10_accelerometer_active.metrics_validation.rms.y.tolerance"),
    step10_val_rms_z_passed: getBool(json, "step10_accelerometer_active.metrics_validation.rms.z.passed"),
    step10_val_rms_z_expected: get(json, "step10_accelerometer_active.metrics_validation.rms.z.expected"),
    step10_val_rms_z_tolerance: get(json, "step10_accelerometer_active.metrics_validation.rms.z.tolerance"),
    
    step10_val_dc_x_passed: getBool(json, "step10_accelerometer_active.metrics_validation.dc.x.passed"),
    step10_val_dc_x_expected: get(json, "step10_accelerometer_active.metrics_validation.dc.x.expected"),
    step10_val_dc_x_tolerance: get(json, "step10_accelerometer_active.metrics_validation.dc.x.tolerance"),
    step10_val_dc_y_passed: getBool(json, "step10_accelerometer_active.metrics_validation.dc.y.passed"),
    step10_val_dc_y_expected: get(json, "step10_accelerometer_active.metrics_validation.dc.y.expected"),
    step10_val_dc_y_tolerance: get(json, "step10_accelerometer_active.metrics_validation.dc.y.tolerance"),
    step10_val_dc_z_passed: getBool(json, "step10_accelerometer_active.metrics_validation.dc.z.passed"),
    step10_val_dc_z_expected: get(json, "step10_accelerometer_active.metrics_validation.dc.z.expected"),
    step10_val_dc_z_tolerance: get(json, "step10_accelerometer_active.metrics_validation.dc.z.tolerance"),
    
    step10_val_frf_passed: getBool(json, "step10_accelerometer_active.metrics_validation.frf_score.passed"),
    step10_val_frf_expected: get(json, "step10_accelerometer_active.metrics_validation.frf_score.expected"),
    step10_val_frf_tolerance: get(json, "step10_accelerometer_active.metrics_validation.frf_score.tolerance"),
    
    step10_val_ref_rms_passed: getBool(json, "step10_accelerometer_active.metrics_validation.reference_rms.passed"),
    step10_val_ref_rms_expected: get(json, "step10_accelerometer_active.metrics_validation.reference_rms.expected"),
    step10_val_ref_rms_tolerance: get(json, "step10_accelerometer_active.metrics_validation.reference_rms.tolerance"),
    
    step10_validation_overall: get(json, "step10_accelerometer_active.metrics_validation.overall"),
    step10_error_message: get(json, "step10_accelerometer_active.error"),
    step10_csv_file: get(json, "step10_accelerometer_active.csv_file"),
    step10_reference_csv_file: get(json, "step10_accelerometer_active.reference_csv_file"),
    
    // Step 11: Magnetometer Active
    step11_status: get(json, "step11_magnetometer_active.status"),
    step11_timestamp: getTs(json, "step11_magnetometer_active.timestamp"),
    step11_fs: get(json, "step11_magnetometer_active.parameters.fs"),
    step11_duration: get(json, "step11_magnetometer_active.parameters.duration"),
    step11_expected_samples: get(json, "step11_magnetometer_active.parameters.expected_samples"),
    step11_samples_collected: get(json, "step11_magnetometer_active.collection.samples_collected"),
    step11_wavegen_frequency: get(json, "step11_magnetometer_active.parameters.frequency"),
    step11_wavegen_amplitude: get(json, "step11_magnetometer_active.parameters.amplitude"),
    
    step11_rms_x: get(json, "step11_magnetometer_active.rms.x"),
    step11_rms_y: get(json, "step11_magnetometer_active.rms.y"),
    step11_rms_z: get(json, "step11_magnetometer_active.rms.z"),
    step11_dc_x: get(json, "step11_magnetometer_active.dc.x"),
    step11_dc_y: get(json, "step11_magnetometer_active.dc.y"),
    step11_dc_z: get(json, "step11_magnetometer_active.dc.z"),
    
    // Step 11: Validation Details
    step11_val_rms_x_passed: getBool(json, "step11_magnetometer_active.metrics_validation.rms.x.passed"),
    step11_val_rms_x_expected: get(json, "step11_magnetometer_active.metrics_validation.rms.x.expected"),
    step11_val_rms_x_tolerance: get(json, "step11_magnetometer_active.metrics_validation.rms.x.tolerance"),
    step11_val_rms_y_passed: getBool(json, "step11_magnetometer_active.metrics_validation.rms.y.passed"),
    step11_val_rms_y_expected: get(json, "step11_magnetometer_active.metrics_validation.rms.y.expected"),
    step11_val_rms_y_tolerance: get(json, "step11_magnetometer_active.metrics_validation.rms.y.tolerance"),
    step11_val_rms_z_passed: getBool(json, "step11_magnetometer_active.metrics_validation.rms.z.passed"),
    step11_val_rms_z_expected: get(json, "step11_magnetometer_active.metrics_validation.rms.z.expected"),
    step11_val_rms_z_tolerance: get(json, "step11_magnetometer_active.metrics_validation.rms.z.tolerance"),
    
    step11_val_dc_x_passed: getBool(json, "step11_magnetometer_active.metrics_validation.dc.x.passed"),
    step11_val_dc_x_expected: get(json, "step11_magnetometer_active.metrics_validation.dc.x.expected"),
    step11_val_dc_x_tolerance: get(json, "step11_magnetometer_active.metrics_validation.dc.x.tolerance"),
    step11_val_dc_y_passed: getBool(json, "step11_magnetometer_active.metrics_validation.dc.y.passed"),
    step11_val_dc_y_expected: get(json, "step11_magnetometer_active.metrics_validation.dc.y.expected"),
    step11_val_dc_y_tolerance: get(json, "step11_magnetometer_active.metrics_validation.dc.y.tolerance"),
    step11_val_dc_z_passed: getBool(json, "step11_magnetometer_active.metrics_validation.dc.z.passed"),
    step11_val_dc_z_expected: get(json, "step11_magnetometer_active.metrics_validation.dc.z.expected"),
    step11_val_dc_z_tolerance: get(json, "step11_magnetometer_active.metrics_validation.dc.z.tolerance"),
    
    step11_validation_overall: get(json, "step11_magnetometer_active.metrics_validation.overall"),
    step11_csv_file: get(json, "step11_magnetometer_active.csv_file"),
    
    // Step 12: Piezo Active
    step12_status: get(json, "step12_piezo_active.status"),
    step12_timestamp: getTs(json, "step12_piezo_active.timestamp"),
    step12_fs: get(json, "step12_piezo_active.parameters.fs"),
    step12_duration: get(json, "step12_piezo_active.parameters.duration"),
    step12_gain: get(json, "step12_piezo_active.parameters.gain"),
    step12_expected_samples: get(json, "step12_piezo_active.parameters.expected_samples"),
    step12_samples_collected: get(json, "step12_piezo_active.collection.samples_collected"),
    step12_wavegen_frequency: get(json, "step12_piezo_active.parameters.frequency"),
    step12_wavegen_amplitude: get(json, "step12_piezo_active.parameters.amplitude"),
    
    step12_rms: get(json, "step12_piezo_active.rms"),
    step12_dc: get(json, "step12_piezo_active.dc"),
    
    // Step 12: Validation Details
    step12_val_rms_passed: getBool(json, "step12_piezo_active.metrics_validation.rms.passed"),
    step12_val_rms_expected: get(json, "step12_piezo_active.metrics_validation.rms.expected"),
    step12_val_rms_tolerance: get(json, "step12_piezo_active.metrics_validation.rms.tolerance"),
    step12_val_dc_passed: getBool(json, "step12_piezo_active.metrics_validation.dc.passed"),
    step12_val_dc_expected: get(json, "step12_piezo_active.metrics_validation.dc.expected"),
    step12_val_dc_tolerance: get(json, "step12_piezo_active.metrics_validation.dc.tolerance"),
    
    step12_validation_overall: get(json, "step12_piezo_active.metrics_validation.overall"),
    step12_csv_file: get(json, "step12_piezo_active.csv_file")
  };
}

// ================= BIGQUERY HELPERS =================

function ensureItpStuG2TableExists_(tableId, schemaDef) {
  let table = null;
  try {
    table = withItpStuG2Retry_(() => BigQuery.Tables.get(ITP_STU_G2_GCP_PROJECT_ID, ITP_STU_G2_BQ_DATASET, tableId));
  } catch (e) {
    if (!String(e).includes("Not found")) throw e;
  }

  const fields = Object.keys(schemaDef).map(key => ({
    name: key,
    type: schemaDef[key],
    mode: "NULLABLE"
  }));

  if (!table) {
    Logger.log("[ITP_STU_G2] Criando tabela %s...", tableId);
    const resource = {
      tableReference: { projectId: ITP_STU_G2_GCP_PROJECT_ID, datasetId: ITP_STU_G2_BQ_DATASET, tableId },
      schema: { fields }
    };
    withItpStuG2Retry_(() => BigQuery.Tables.insert(resource, ITP_STU_G2_GCP_PROJECT_ID, ITP_STU_G2_BQ_DATASET));
    Logger.log("[ITP_STU_G2] Tabela criada.");
  } else {
    const existingCols = new Set((table.schema.fields || []).map(f => f.name));
    const newCols = fields.filter(f => !existingCols.has(f.name));
    if (newCols.length > 0) {
      Logger.log("[ITP_STU_G2] Adicionando %s novas colunas...", newCols.length);
      const mergedFields = (table.schema.fields || []).concat(newCols);
      withItpStuG2Retry_(() => BigQuery.Tables.patch({ schema: { fields: mergedFields } }, ITP_STU_G2_GCP_PROJECT_ID, ITP_STU_G2_BQ_DATASET, tableId));
    }
  }
}

function fetchExistingItpStuG2FilesFromBigQuery_(tableId, fileNames) {
  const existing = new Set();
  if (!fileNames.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    const listStr = batch.map(n => `'${n.replace(/'/g, "\\'")}'`).join(",");
    
    const query = `
      SELECT DISTINCT source_file_name 
      FROM \`${ITP_STU_G2_GCP_PROJECT_ID}.${ITP_STU_G2_BQ_DATASET}.${tableId}\`
      WHERE source_file_name IN (${listStr})
    `;
    
    try {
      const res = withItpStuG2Retry_(() => BigQuery.Jobs.query({ query, useLegacySql: false }, ITP_STU_G2_GCP_PROJECT_ID));
      if (res.rows) {
        res.rows.forEach(r => existing.add(r.f[0].v));
      }
    } catch (e) {
      // Ignora erro se tabela vazia
    }
  }
  return existing;
}

function streamInsertItpStuG2Objects_(tableId, objects) {
  if (!objects.length) return;
  const chunkSize = 500;
  
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    const request = {
      rows: chunk.map(o => ({ insertId: Utilities.getUuid(), json: o }))
    };
    
    Logger.log("[ITP_STU_G2] Inserindo %s linhas...", chunk.length);
    
    const resp = withItpStuG2Retry_(() => BigQuery.Tabledata.insertAll(request, ITP_STU_G2_GCP_PROJECT_ID, ITP_STU_G2_BQ_DATASET, tableId));
    
    if (resp.insertErrors && resp.insertErrors.length) {
      Logger.log("[ITP_STU_G2] ERRO DE INSERÇÃO: " + JSON.stringify(resp.insertErrors[0]));
    }
  }
}

function withItpStuG2Retry_(fn) {
  for (let i = 0; i < 5; i++) {
    try {
      return fn();
    } catch (e) {
      if (i === 4) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
}