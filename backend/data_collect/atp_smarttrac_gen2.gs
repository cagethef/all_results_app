// ================= CONFIGURAÇÕES (PREFIXO ATP_STU_G2_) =================
const ATP_STU_G2_FOLDER_ID = "1R0RssSU4KNCbAmM_udA-ruMS6gWAuTHP";

const ATP_STU_G2_GCP_PROJECT_ID = "tractian-bi";
const ATP_STU_G2_BQ_DATASET = "operations";
const ATP_STU_G2_BQ_TABLE = "operations_atp_smarttrac_ultra_gen2_raw";

// LIMITADOR DE LOTE: Processa apenas X arquivos novos por vez
const ATP_STU_G2_BATCH_SIZE = 500;

// Definição do Schema (retrocompatível + novo payload)
const ATP_STU_G2_SCHEMA_DEFINITION = {
  "source_file_name": "STRING",
  "ingestion_ts": "TIMESTAMP",

  // Metadados
  "sensor_id": "STRING",
  "results_calculated_at": "TIMESTAMP",
  "test_start_time": "TIMESTAMP",
  "test_end_time": "TIMESTAMP",
  "params_tested_json": "STRING",

  // Estruturas brutas (novo)
  "references_json": "STRING",               // Array
  "reference_values_json": "STRING",         // Object
  "dut_values_json": "STRING",               // Object
  "param_thresholds_json": "STRING",         // Object
  "param_diffs_json": "STRING",              // Object
  "param_checks_passed_json": "STRING",      // Object
  "dut_errors_found_json": "STRING",         // Array

  // Campos legados (mantidos)
  "reference_temp": "FLOAT",
  "reference_signal": "FLOAT",
  "reference_status_count": "FLOAT",

  "dut_temp": "FLOAT",
  "dut_signal": "FLOAT",
  "dut_status_count": "INTEGER",

  "temperature_threshold_celsius": "FLOAT",
  "signal_threshold_db": "FLOAT",
  "status_count_threshold_percentage": "FLOAT",

  "temp_diff_celsius": "FLOAT",
  "signal_diff_db": "FLOAT",
  "status_count_diff_percentage": "FLOAT",

  // Checks legados
  "error_check_passed": "BOOLEAN",
  "zero_signal_check_passed": "BOOLEAN",
  "temperature_check_passed": "BOOLEAN",
  "signal_check_passed": "BOOLEAN",
  "status_count_check_passed": "BOOLEAN",

  // Resultado final
  "overall_result": "STRING",

  // Novos parâmetros detalhados (reference_values)
  "reference_base_temperature_c": "FLOAT",
  "reference_humidity_sensor_temperature_c": "FLOAT",
  "reference_humidity_sensor_humidity_percentage": "FLOAT",
  "reference_mcu_temperature_c": "FLOAT",
  "reference_main_accel_temperature_c": "FLOAT",
  "reference_aux_accel_temperature_c": "FLOAT",
  "reference_magnetometer_temperature_c": "FLOAT",
  "reference_chosen_receiver_rx_power_dbm": "FLOAT",

  // Novos parâmetros detalhados (dut_values)
  "dut_base_temperature_c": "FLOAT",
  "dut_humidity_sensor_temperature_c": "FLOAT",
  "dut_humidity_sensor_humidity_percentage": "FLOAT",
  "dut_mcu_temperature_c": "FLOAT",
  "dut_main_accel_temperature_c": "FLOAT",
  "dut_aux_accel_temperature_c": "FLOAT",
  "dut_magnetometer_temperature_c": "FLOAT",
  "dut_chosen_receiver_rx_power_dbm": "FLOAT",

  // Novos parâmetros detalhados (param_thresholds)
  "threshold_base_temperature_c": "FLOAT",
  "threshold_humidity_sensor_temperature_c": "FLOAT",
  "threshold_humidity_sensor_humidity_percentage": "FLOAT",
  "threshold_mcu_temperature_c": "FLOAT",
  "threshold_main_accel_temperature_c": "FLOAT",
  "threshold_aux_accel_temperature_c": "FLOAT",
  "threshold_magnetometer_temperature_c": "FLOAT",
  "threshold_chosen_receiver_rx_power_dbm": "FLOAT",

  // Novos parâmetros detalhados (param_diffs)
  "diff_base_temperature_c": "FLOAT",
  "diff_humidity_sensor_temperature_c": "FLOAT",
  "diff_humidity_sensor_humidity_percentage": "FLOAT",
  "diff_mcu_temperature_c": "FLOAT",
  "diff_main_accel_temperature_c": "FLOAT",
  "diff_aux_accel_temperature_c": "FLOAT",
  "diff_magnetometer_temperature_c": "FLOAT",
  "diff_chosen_receiver_rx_power_dbm": "FLOAT",

  // Novos checks detalhados (param_checks_passed)
  "check_base_temperature_c_passed": "BOOLEAN",
  "check_humidity_sensor_temperature_c_passed": "BOOLEAN",
  "check_humidity_sensor_humidity_percentage_passed": "BOOLEAN",
  "check_mcu_temperature_c_passed": "BOOLEAN",
  "check_main_accel_temperature_c_passed": "BOOLEAN",
  "check_aux_accel_temperature_c_passed": "BOOLEAN",
  "check_magnetometer_temperature_c_passed": "BOOLEAN",
  "check_chosen_receiver_rx_power_dbm_passed": "BOOLEAN"
};

// ================= FUNÇÃO PRINCIPAL =================

function runDriveJsonAtpStuG2ToBigQuery() {
  ensureAtpStuG2TableExists_(ATP_STU_G2_BQ_TABLE, ATP_STU_G2_SCHEMA_DEFINITION);

  const folder = DriveApp.getFolderById(ATP_STU_G2_FOLDER_ID);

  // Busca arquivos (JSON)
  const it = folder.searchFiles('title contains ".json" and trashed = false');

  const allFilesFound = [];
  let scanned = 0;

  Logger.log("[ATP_STU_G2] Iniciando varredura na pasta...");

  while (it.hasNext()) {
    const file = it.next();
    const name = file.getName();
    scanned++;

    if (!/\.json$/i.test(name)) continue;

    allFilesFound.push({ name: name, file: file });

    if (scanned % 1000 === 0) Logger.log("[ATP_STU_G2] Escaneados: %s...", scanned);
  }

  Logger.log("[ATP_STU_G2] Total encontrados: %s. Verificando processados...", allFilesFound.length);

  processAtpStuG2JsonBatch_(allFilesFound);

  Logger.log("[ATP_STU_G2] Execução finalizada.");
}

// ================= PROCESSAMENTO =================

function processAtpStuG2JsonBatch_(allItems) {
  if (!allItems.length) return;

  // 1. Verifica no BQ quais arquivos já existem
  const ids = allItems.map(x => x.name);
  const existing = fetchExistingAtpStuG2FilesFromBigQuery_(ATP_STU_G2_BQ_TABLE, ids);

  // 2. Filtra apenas os novos
  const pendingItems = allItems.filter(x => !existing.has(x.name));

  Logger.log(
    "[ATP_STU_G2] Status: Total=%s | Já no BQ=%s | Pendentes=%s",
    allItems.length,
    existing.size,
    pendingItems.length
  );

  if (!pendingItems.length) {
    Logger.log("[ATP_STU_G2] Nada novo para processar.");
    return;
  }

  // 3. Aplica limite de lote
  const batchToProcess = pendingItems.slice(0, ATP_STU_G2_BATCH_SIZE);

  Logger.log("[ATP_STU_G2] Processando lote: %s arquivos...", batchToProcess.length);

  const rowsBuffer = [];
  const ingestionTs = new Date().toISOString();

  for (let i = 0; i < batchToProcess.length; i++) {
    const item = batchToProcess[i];
    try {
      const blob = item.file.getBlob();
      let jsonContent = blob.getDataAsString("UTF-8");

      if (!jsonContent || jsonContent.trim().length === 0) {
        Logger.log("[ATP_STU_G2] AVISO: Arquivo vazio: %s", item.name);
        continue;
      }

      // CORREÇÃO PARA NaN: Substitui NaN por null antes de parsear
      // Procura NaN não-entre-aspas em valor (ex.: "x": NaN)
      jsonContent = jsonContent.replace(/:\s*NaN\b/g, ": null");

      const parsed = JSON.parse(jsonContent);

      // SUPORTE PARA ARRAY OU OBJETO ÚNICO
      const jsonObjects = Array.isArray(parsed) ? parsed : [parsed];

      for (const jsonObj of jsonObjects) {
        const row = flattenAtpStuG2JsonToRow_(jsonObj, item.name, ingestionTs);
        rowsBuffer.push(row);
      }
    } catch (e) {
      Logger.log("[ATP_STU_G2] ERRO no arquivo %s: %s", item.name, e.message);
    }
  }

  // 4. Envia para o BigQuery
  if (rowsBuffer.length > 0) {
    Logger.log("[ATP_STU_G2] DEBUG - Exemplo de linha gerada: " + JSON.stringify(rowsBuffer[0]));
    streamInsertAtpStuG2Objects_(ATP_STU_G2_BQ_TABLE, rowsBuffer);
    Logger.log("[ATP_STU_G2] SUCESSO: %s linhas inseridas.", rowsBuffer.length);
  }
}

function flattenAtpStuG2JsonToRow_(json, fileName, ingestionTs) {
  const get = (obj, path, def = null) => {
    if (!obj || !path) return def;
    const keys = path.split('.');
    let current = obj;
    for (const k of keys) {
      if (current == null) return def;
      current = current[k];
    }
    return current !== undefined ? current : def;
  };

  // Busca chave literal dentro de um objeto (incluindo chave com ponto)
  const getObjValue = (obj, rootKey, literalKey, def = null) => {
    const root = obj && obj[rootKey];
    if (!root || typeof root !== "object") return def;
    return Object.prototype.hasOwnProperty.call(root, literalKey) ? root[literalKey] : def;
  };

  const asBool = (v) => (v === null || v === undefined ? null : Boolean(v));
  const asJson = (v, fallback) => {
    if (v === null || v === undefined) return fallback;
    try {
      return JSON.stringify(v);
    } catch (_) {
      return fallback;
    }
  };

  const paramChecks = get(json, "param_checks_passed", null);

  // Deriva checks legados quando vier somente o formato novo
  const temperatureCheckDerived =
    paramChecks && typeof paramChecks === "object"
      ? [
          "baseTemperatureC",
          "humiditySensorTemperatureC",
          "humiditySensorHumidityPercentage",
          "mcuTemperatureC",
          "mainAccelTemperatureC",
          "auxAccelTemperatureC",
          "magnetometerTemperatureC"
        ].every((k) => paramChecks[k] === true)
      : null;

  const signalCheckDerived =
    paramChecks && typeof paramChecks === "object"
      ? asBool(paramChecks["chosenReceiver.rxPowerDbm"])
      : null;

  return {
    source_file_name: fileName,
    ingestion_ts: ingestionTs,

    // Metadados
    sensor_id: get(json, "sensorId"),
    results_calculated_at: get(json, "results_calculated_at"),
    test_start_time: get(json, "test_start_time"),
    test_end_time: get(json, "test_end_time"),
    params_tested_json: asJson(get(json, "params_tested"), "[]"),

    // Estruturas brutas
    references_json: asJson(get(json, "references"), "[]"),
    reference_values_json: asJson(get(json, "reference_values"), "{}"),
    dut_values_json: asJson(get(json, "dut_values"), "{}"),
    param_thresholds_json: asJson(get(json, "param_thresholds"), "{}"),
    param_diffs_json: asJson(get(json, "param_diffs"), "{}"),
    param_checks_passed_json: asJson(get(json, "param_checks_passed"), "{}"),
    dut_errors_found_json: asJson(get(json, "dut_errors_found"), "[]"),

    // ===== Campos legados (mantidos) =====
    reference_temp: get(json, "reference_temp", getObjValue(json, "reference_values", "baseTemperatureC")),
    reference_signal: get(json, "reference_signal", getObjValue(json, "reference_values", "chosenReceiver.rxPowerDbm")),
    reference_status_count: get(json, "reference_status_count"),

    dut_temp: get(json, "dut_temp", getObjValue(json, "dut_values", "baseTemperatureC")),
    dut_signal: get(json, "dut_signal", getObjValue(json, "dut_values", "chosenReceiver.rxPowerDbm")),
    dut_status_count: get(json, "dut_status_count"),

    temperature_threshold_celsius: get(json, "temperature_threshold_celsius", getObjValue(json, "param_thresholds", "baseTemperatureC")),
    signal_threshold_db: get(json, "signal_threshold_db", getObjValue(json, "param_thresholds", "chosenReceiver.rxPowerDbm")),
    status_count_threshold_percentage: get(json, "status_count_threshold_percentage"),

    temp_diff_celsius: get(json, "temp_diff_celsius", getObjValue(json, "param_diffs", "baseTemperatureC")),
    signal_diff_db: get(json, "signal_diff_db", getObjValue(json, "param_diffs", "chosenReceiver.rxPowerDbm")),
    status_count_diff_percentage: get(json, "status_count_diff_percentage"),

    error_check_passed: asBool(get(json, "error_check_passed")),
    zero_signal_check_passed: asBool(get(json, "zero_signal_check_passed")), // pode ficar null no novo
    temperature_check_passed: asBool(get(json, "temperature_check_passed", temperatureCheckDerived)),
    signal_check_passed: asBool(get(json, "signal_check_passed", signalCheckDerived)),
    status_count_check_passed: asBool(get(json, "status_count_check_passed")),

    overall_result: get(json, "overall_result"),

    // ===== Novos campos detalhados =====
    // reference_values
    reference_base_temperature_c: getObjValue(json, "reference_values", "baseTemperatureC"),
    reference_humidity_sensor_temperature_c: getObjValue(json, "reference_values", "humiditySensorTemperatureC"),
    reference_humidity_sensor_humidity_percentage: getObjValue(json, "reference_values", "humiditySensorHumidityPercentage"),
    reference_mcu_temperature_c: getObjValue(json, "reference_values", "mcuTemperatureC"),
    reference_main_accel_temperature_c: getObjValue(json, "reference_values", "mainAccelTemperatureC"),
    reference_aux_accel_temperature_c: getObjValue(json, "reference_values", "auxAccelTemperatureC"),
    reference_magnetometer_temperature_c: getObjValue(json, "reference_values", "magnetometerTemperatureC"),
    reference_chosen_receiver_rx_power_dbm: getObjValue(json, "reference_values", "chosenReceiver.rxPowerDbm"),

    // dut_values
    dut_base_temperature_c: getObjValue(json, "dut_values", "baseTemperatureC"),
    dut_humidity_sensor_temperature_c: getObjValue(json, "dut_values", "humiditySensorTemperatureC"),
    dut_humidity_sensor_humidity_percentage: getObjValue(json, "dut_values", "humiditySensorHumidityPercentage"),
    dut_mcu_temperature_c: getObjValue(json, "dut_values", "mcuTemperatureC"),
    dut_main_accel_temperature_c: getObjValue(json, "dut_values", "mainAccelTemperatureC"),
    dut_aux_accel_temperature_c: getObjValue(json, "dut_values", "auxAccelTemperatureC"),
    dut_magnetometer_temperature_c: getObjValue(json, "dut_values", "magnetometerTemperatureC"),
    dut_chosen_receiver_rx_power_dbm: getObjValue(json, "dut_values", "chosenReceiver.rxPowerDbm"),

    // param_thresholds
    threshold_base_temperature_c: getObjValue(json, "param_thresholds", "baseTemperatureC"),
    threshold_humidity_sensor_temperature_c: getObjValue(json, "param_thresholds", "humiditySensorTemperatureC"),
    threshold_humidity_sensor_humidity_percentage: getObjValue(json, "param_thresholds", "humiditySensorHumidityPercentage"),
    threshold_mcu_temperature_c: getObjValue(json, "param_thresholds", "mcuTemperatureC"),
    threshold_main_accel_temperature_c: getObjValue(json, "param_thresholds", "mainAccelTemperatureC"),
    threshold_aux_accel_temperature_c: getObjValue(json, "param_thresholds", "auxAccelTemperatureC"),
    threshold_magnetometer_temperature_c: getObjValue(json, "param_thresholds", "magnetometerTemperatureC"),
    threshold_chosen_receiver_rx_power_dbm: getObjValue(json, "param_thresholds", "chosenReceiver.rxPowerDbm"),

    // param_diffs
    diff_base_temperature_c: getObjValue(json, "param_diffs", "baseTemperatureC"),
    diff_humidity_sensor_temperature_c: getObjValue(json, "param_diffs", "humiditySensorTemperatureC"),
    diff_humidity_sensor_humidity_percentage: getObjValue(json, "param_diffs", "humiditySensorHumidityPercentage"),
    diff_mcu_temperature_c: getObjValue(json, "param_diffs", "mcuTemperatureC"),
    diff_main_accel_temperature_c: getObjValue(json, "param_diffs", "mainAccelTemperatureC"),
    diff_aux_accel_temperature_c: getObjValue(json, "param_diffs", "auxAccelTemperatureC"),
    diff_magnetometer_temperature_c: getObjValue(json, "param_diffs", "magnetometerTemperatureC"),
    diff_chosen_receiver_rx_power_dbm: getObjValue(json, "param_diffs", "chosenReceiver.rxPowerDbm"),

    // param_checks_passed
    check_base_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "baseTemperatureC")),
    check_humidity_sensor_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "humiditySensorTemperatureC")),
    check_humidity_sensor_humidity_percentage_passed: asBool(getObjValue(json, "param_checks_passed", "humiditySensorHumidityPercentage")),
    check_mcu_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "mcuTemperatureC")),
    check_main_accel_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "mainAccelTemperatureC")),
    check_aux_accel_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "auxAccelTemperatureC")),
    check_magnetometer_temperature_c_passed: asBool(getObjValue(json, "param_checks_passed", "magnetometerTemperatureC")),
    check_chosen_receiver_rx_power_dbm_passed: asBool(getObjValue(json, "param_checks_passed", "chosenReceiver.rxPowerDbm"))
  };
}

// ================= BIGQUERY HELPERS =================

function ensureAtpStuG2TableExists_(tableId, schemaDef) {
  let table = null;
  try {
    table = withAtpStuG2Retry_(() =>
      BigQuery.Tables.get(
        ATP_STU_G2_GCP_PROJECT_ID,
        ATP_STU_G2_BQ_DATASET,
        tableId
      )
    );
  } catch (e) {
    if (!String(e).includes("Not found")) throw e;
  }

  const fields = Object.keys(schemaDef).map((key) => ({
    name: key,
    type: schemaDef[key],
    mode: "NULLABLE"
  }));

  if (!table) {
    Logger.log("[ATP_STU_G2] Criando tabela %s...", tableId);
    const resource = {
      tableReference: {
        projectId: ATP_STU_G2_GCP_PROJECT_ID,
        datasetId: ATP_STU_G2_BQ_DATASET,
        tableId: tableId
      },
      schema: { fields: fields }
    };
    withAtpStuG2Retry_(() =>
      BigQuery.Tables.insert(
        resource,
        ATP_STU_G2_GCP_PROJECT_ID,
        ATP_STU_G2_BQ_DATASET
      )
    );
    Logger.log("[ATP_STU_G2] Tabela criada.");
  } else {
    const existingCols = new Set((table.schema.fields || []).map((f) => f.name));
    const newCols = fields.filter((f) => !existingCols.has(f.name));

    if (newCols.length > 0) {
      Logger.log("[ATP_STU_G2] Adicionando %s novas colunas...", newCols.length);
      const mergedFields = (table.schema.fields || []).concat(newCols);
      withAtpStuG2Retry_(() =>
        BigQuery.Tables.patch(
          { schema: { fields: mergedFields } },
          ATP_STU_G2_GCP_PROJECT_ID,
          ATP_STU_G2_BQ_DATASET,
          tableId
        )
      );
    }
  }
}

function fetchExistingAtpStuG2FilesFromBigQuery_(tableId, fileNames) {
  const existing = new Set();
  if (!fileNames.length) return existing;

  const batchSize = 500;
  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    const listStr = batch.map((n) => `'${n.replace(/'/g, "\\'")}'`).join(",");

    const query = `
      SELECT DISTINCT source_file_name
      FROM \`${ATP_STU_G2_GCP_PROJECT_ID}.${ATP_STU_G2_BQ_DATASET}.${tableId}\`
      WHERE source_file_name IN (${listStr})
    `;

    try {
      const res = withAtpStuG2Retry_(() =>
        BigQuery.Jobs.query(
          { query: query, useLegacySql: false },
          ATP_STU_G2_GCP_PROJECT_ID
        )
      );
      if (res.rows) {
        res.rows.forEach((r) => existing.add(r.f[0].v));
      }
    } catch (e) {
      // Ignora erro se tabela ainda não existir/estar vazia nesse momento
    }
  }

  return existing;
}

function streamInsertAtpStuG2Objects_(tableId, objects) {
  if (!objects.length) return;

  const chunkSize = 500;
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    const request = {
      rows: chunk.map((o) => ({
        insertId: Utilities.getUuid(),
        json: o
      }))
    };

    Logger.log("[ATP_STU_G2] Inserindo %s linhas...", chunk.length);

    const resp = withAtpStuG2Retry_(() =>
      BigQuery.Tabledata.insertAll(
        request,
        ATP_STU_G2_GCP_PROJECT_ID,
        ATP_STU_G2_BQ_DATASET,
        tableId
      )
    );

    if (resp.insertErrors && resp.insertErrors.length) {
      Logger.log("[ATP_STU_G2] ERRO DE INSERÇÃO: " + JSON.stringify(resp.insertErrors[0]));
    }
  }
}

function withAtpStuG2Retry_(fn) {
  for (let i = 0; i < 5; i++) {
    try {
      return fn();
    } catch (e) {
      if (i === 4) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
}