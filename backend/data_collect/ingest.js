'use strict'

const { BigQuery }  = require('@google-cloud/bigquery')
const { google }    = require('googleapis')
const {
  KV_SCHEMA, KV_SCHEMA_UNITRAC,
  LEAK_SCHEMA, ATP_STU_G2_SCHEMA, ITP_STU_G2_SCHEMA, ITP_OMNI_SCHEMA,
} = require('./schemas')

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PROJECT_ID       = 'tractian-bi'
const DATASET          = 'operations'
const LOOKBACK_MINUTES = 10

function nowBRT() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
}

const bq = new BigQuery({ projectId: PROJECT_ID })

// ─── CONFIGS ──────────────────────────────────────────────────────────────────

const CONFIGS = [

  // ── CSV → Key-Value ─────────────────────────────────────────────────────────

  {
    name:     'atp_smarttrac',
    folderId: '1mRUm_mtt5rSoQDyUWuoh5l8Pm3AfUnGt',
    fileExt:  '.csv',
    filenameRegex: /^smarttrac_(inputs|results)_(\d{8})_(\d{6})__#?(.+)\.csv$/i,
    parseMeta: m => ({ file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote: m[4] }),
    fallbackMeta: true,
    tables:   { inputs: 'operations_atp_smarttrac_inputs_raw', results: 'operations_atp_smarttrac_results_raw' },
    schema:   KV_SCHEMA,
    dedupField: 'id',
  },

  {
    name:     'atp_energy',
    folderId: '1ias-V0VPcwCQBo7LW5f97mtcajyZ-DyY',
    fileExt:  '.csv',
    filenameRegex: /^energytrac_(inputs|results)_(\d{8})_(\d{6})__+#([a-z0-9_]+?)\.csv$/i,
    parseMeta: m => {
      const lote = String(m[4] || '').replace(/_+$/g, '')
      if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null
      return { file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote }
    },
    fallbackMeta: false,
    tables:   { inputs: 'operations_atp_energy_inputs_raw', results: 'operations_atp_energy_results_raw' },
    schema:   KV_SCHEMA,
    dedupField: 'id',
    resultsFormat: 'testName__col',
  },

  {
    name:     'atp_receiver',
    folderId: '1Og6AbeAxmAq0ASWIuhFnowtLuEBR6X1_',
    fileExt:  '.csv',
    filenameRegex: /^receiver_(inputs|results)_(\d{8})_(\d{6})__+#([a-z0-9_]+?)(?:\.csv)?$/i,
    parseMeta: m => {
      const lote = String(m[4] || '').replace(/_+$/g, '')
      if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null
      return { file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote }
    },
    fallbackMeta: false,
    nameGuard: name => name.toLowerCase().startsWith('receiver_'),
    tables:   { inputs: 'operations_atp_receiver_inputs_raw', results: 'operations_atp_receiver_results_raw' },
    schema:   KV_SCHEMA,
    dedupField: 'id',
  },

  {
    name:     'atp_unitrac',
    folderId: '1LoOSehTkiR1H3LAiXAPcoNvfBToSk0jo',
    fileExt:  '.csv',
    filenameRegex: /^unitrac_(inputs|results)_(\d{8})_(\d{6})_+#+([a-z0-9_\-]+?)(?:\.csv)?$/i,
    parseMeta: m => {
      const lote = String(m[4] || '').replace(/_+$/g, '')
      if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null
      const protocol = (lote.split('_').pop() || '').toUpperCase()
      return { file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote, protocol }
    },
    fallbackMeta: false,
    tables:   { inputs: 'operations_atp_unitrac_inputs_raw', results: 'operations_atp_unitrac_results_raw' },
    schema:   KV_SCHEMA_UNITRAC,
    dedupField: 'id',
    resultsFormat: 'testName__col',
  },

  {
    name:     'atp_omni',
    folderId: '1qBvaIuuBuQ1B2aoiMGoATgx8ZS4RPC4w',
    fileExt:  '.csv',
    filenameRegex: /^omni_trac_(inputs|results)_(\d{8})_(\d{6})_+#+([a-z0-9_\-]+?)(?:\.csv)?$/i,
    parseMeta: m => {
      const lote = String(m[4] || '').replace(/_+$/g, '')
      if (!/^\d{8}_\d{2}_\d{2}.*$/i.test(lote)) return null
      return { file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote }
    },
    fallbackMeta: true,
    tables:   { inputs: 'operations_atp_omnitrac_inputs_raw', results: 'operations_atp_omnitrac_results_raw' },
    schema:   KV_SCHEMA,
    dedupField: 'id',
    resultsFormat: 'testName__col',
  },

  {
    name:     'atp_omni_receiver',
    folderId: '15mp1n7KlXcA_9-tnQXTc7le6P_7y65tR',
    fileExt:  '.csv',
    filenameRegex: /^omni_receiver_(inputs|results)_(\d{8})_(\d{6})_+#+([a-z0-9_\-]+?)(?:\.csv)?$/i,
    parseMeta: m => {
      const lote = String(m[4] || '').replace(/_+$/g, '')
      if (!/^\d{8}_\d{2}_.+/i.test(lote)) return null
      return { file_type: m[1].toLowerCase(), upload_date: m[2], upload_time: m[3], lote }
    },
    fallbackMeta: true,
    tables:   { inputs: 'operations_atp_omni_receiver_inputs_raw', results: 'operations_atp_omni_receiver_results_raw' },
    schema:   KV_SCHEMA,
    dedupField: 'id',
  },

  // ── JSON → Flatten ───────────────────────────────────────────────────────────

  {
    name:      'leaktest',
    folderId:  '1QYxgY4IpmKQ1eToxFtBvnHAq8IK7-am_',
    fileExt:   '.json',
    table:     'operations_leak_test_raw',
    schema:    LEAK_SCHEMA,
    dedupField: 'source_file_name',
    batchSize:  1000,
    flatten:    flattenLeak,
    nanToNull:  true,
  },

  {
    name:      'atp_smarttrac_gen2',
    folderId:  '1R0RssSU4KNCbAmM_udA-ruMS6gWAuTHP',
    fileExt:   '.json',
    table:     'operations_atp_smarttrac_ultra_gen2_raw',
    schema:    ATP_STU_G2_SCHEMA,
    dedupField: 'source_file_name',
    batchSize:  500,
    flatten:    flattenAtpStuG2,
    nanToNull:  true,
    multiRow:   true,
  },

  {
    name:      'itp_smarttrac_gen2',
    folderId:  '1T7tBBQSwqTbkkFQ1JOLJidSyyKyiGC_t',
    fileExt:   '.json',
    table:     'operations_itp_smarttrac_ultra_gen2_raw',
    schema:    ITP_STU_G2_SCHEMA,
    dedupField: 'source_file_name',
    batchSize:  500,
    flatten:    flattenItpStuG2,
  },

  {
    name:      'itp_omnitrac',
    folderId:  '14gavd8M2ej8ec1JWKWDD6ng8vBksrwDk',
    fileExt:   '.json',
    table:     'operations_itp_omnitrac_raw',
    schema:    ITP_OMNI_SCHEMA,
    dedupField: 'source_file_name',
    batchSize:  500,
    flatten:    flattenItpOmni,
  },
]

// ─── ENTRY POINTS ─────────────────────────────────────────────────────────────

exports.ingest = async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    await Promise.all(CONFIGS.map(cfg => processConfig(cfg, drive, LOOKBACK_MINUTES)))

    res.status(200).send('OK')
  } catch (err) {
    console.error('[ingest] fatal:', err)
    res.status(500).send(err.message)
  }
}

// Revisão manual de N dias atrás (padrão: 7)
// Uso: POST /backfill  ou  POST /backfill?days=14
exports.backfill = async (req, res) => {
  try {
    const days    = Math.min(parseInt(req.query.days ?? '7', 10) || 7, 30)
    const minutes = days * 24 * 60

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    console.log(`[backfill] janela=${days} dias (${minutes} min)`)
    await Promise.all(CONFIGS.map(cfg => processConfig(cfg, drive, minutes)))

    res.status(200).send(`backfill OK (${days} dias)`)
  } catch (err) {
    console.error('[backfill] fatal:', err)
    res.status(500).send(err.message)
  }
}

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────

async function processConfig(cfg, drive, minutes = LOOKBACK_MINUTES) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()

  let files = await listRecentFiles(drive, cfg.folderId, cutoff)
  files = files.filter(f => f.name.toLowerCase().endsWith(cfg.fileExt))
  if (cfg.nameGuard) files = files.filter(f => cfg.nameGuard(f.name))

  if (!files.length) {
    console.log(`[${cfg.name}] nenhum arquivo novo`)
    return
  }

  if (cfg.fileExt === '.csv') {
    await processCsvConfig(cfg, drive, files)
  } else {
    await processJsonConfig(cfg, drive, files)
  }
}

// ── CSV ──────────────────────────────────────────────────────────────────────

async function processCsvConfig(cfg, drive, files) {
  const inputsItems  = []
  const resultsItems = []

  for (const file of files) {
    const m = cfg.filenameRegex.exec(file.name)
    let meta = m ? cfg.parseMeta(m) : null

    if (!meta) {
      if (!cfg.fallbackMeta) continue
      meta = buildFallbackMeta(file)
    }

    if (meta.file_type === 'inputs')  inputsItems.push({ file, meta })
    else if (meta.file_type === 'results') resultsItems.push({ file, meta })
  }

  await Promise.all([
    processCsvGroup(cfg, drive, inputsItems,  cfg.tables.inputs,  'inputs'),
    processCsvGroup(cfg, drive, resultsItems, cfg.tables.results, 'results'),
  ])
}

async function processCsvGroup(cfg, drive, items, tableId, groupName) {
  if (!items.length) return

  await ensureTableExists(tableId, cfg.schema)

  const existing = await fetchExistingIds(tableId, cfg.dedupField, items.map(x => x.file.name))
  const newItems  = items.filter(x => !existing.has(x.file.name))

  console.log(`[${cfg.name}/${groupName}] novos=${newItems.length}/${items.length}`)
  if (newItems.length > 0) console.log(`[${cfg.name}/${groupName}] arquivos:`, newItems.map(x => x.file.name))

  for (const { file, meta } of newItems) {
    try {
      const text  = await downloadText(drive, file.id)
      const matrix = parseCsv(text)
      if (!matrix || matrix.length < 2) continue

      const extraFields = meta.protocol ? { protocol: meta.protocol } : {}
      const rows = groupName === 'inputs'
        ? buildKvInputRows(matrix, file.name, meta, extraFields)
        : cfg.resultsFormat === 'testName__col'
          ? buildKvResultsTestNameCol(matrix, file.name, meta, extraFields)
          : buildKvResultsColByCol(matrix, file.name, meta, extraFields)

      await bqInsert(tableId, rows)
    } catch (err) {
      console.error(`[${cfg.name}/${groupName}] erro ${file.name}:`, err.message)
    }
  }
}

// ── JSON ─────────────────────────────────────────────────────────────────────

async function processJsonConfig(cfg, drive, files) {
  await ensureTableExists(cfg.table, cfg.schema)

  const existing  = await fetchExistingIds(cfg.table, cfg.dedupField, files.map(f => f.name))
  const newFiles  = files.filter(f => !existing.has(f.name))
  const toProcess = cfg.batchSize ? newFiles.slice(0, cfg.batchSize) : newFiles

  console.log(`[${cfg.name}] novos=${toProcess.length}/${files.length}`)
  if (toProcess.length > 0) console.log(`[${cfg.name}] arquivos:`, toProcess.map(f => f.name))

  const ingestionTs = nowBRT()
  const rows = []

  for (const file of toProcess) {
    try {
      let text = await downloadText(drive, file.id)
      if (cfg.nanToNull) text = text.replace(/:\s*NaN\b/g, ': null')

      const parsed  = JSON.parse(text)
      const objects = cfg.multiRow && Array.isArray(parsed) ? parsed : [parsed]

      for (const obj of objects) {
        rows.push(cfg.flatten(obj, file.name, ingestionTs))
      }
    } catch (err) {
      console.error(`[${cfg.name}] erro ${file.name}:`, err.message)
    }
  }

  await bqInsert(cfg.table, rows)
}

// ─── CSV ROW BUILDERS ─────────────────────────────────────────────────────────

function buildKvInputRows(matrix, name, meta, extra) {
  const ingestionTs = nowBRT()
  const rows = []
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row || !row.length) continue
    const variable = String(row[0] ?? '')
    const value    = String(row[1] ?? '')
    if (!variable && !value) continue
    rows.push({ id: name, file_type: meta.file_type, upload_date: meta.upload_date,
      upload_time: meta.upload_time, lote: meta.lote, ...extra,
      source_file_name: name, ingestion_ts: ingestionTs,
      row_index: String(i), variable, value })
  }
  return rows
}

function buildKvResultsColByCol(matrix, name, meta, extra) {
  const ingestionTs = nowBRT()
  const header = (matrix[0] || []).map(h => String(h ?? ''))
  const rows = []
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row || !row.length) continue
    if (!row.some(v => String(v ?? '').trim())) continue
    for (let c = 0; c < header.length; c++) {
      rows.push({ id: name, file_type: meta.file_type, upload_date: meta.upload_date,
        upload_time: meta.upload_time, lote: meta.lote, ...extra,
        source_file_name: name, ingestion_ts: ingestionTs,
        row_index: String(i), variable: header[c], value: String(row[c] ?? '') })
    }
  }
  return rows
}

function buildKvResultsTestNameCol(matrix, name, meta, extra) {
  const ingestionTs = nowBRT()
  const header = (matrix[0] || []).map(h => String(h ?? '').trim())
  const rows = []
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row || !row.length) continue
    if (!row.some(v => String(v ?? '').trim())) continue
    const testName = String(row[0] ?? '').trim()
    if (!testName) continue
    for (let c = 1; c < header.length; c++) {
      rows.push({ id: name, file_type: meta.file_type, upload_date: meta.upload_date,
        upload_time: meta.upload_time, lote: meta.lote, ...extra,
        source_file_name: name, ingestion_ts: ingestionTs,
        row_index: String(i), variable: `${testName}__${header[c] || 'col_' + c}`,
        value: String(row[c] ?? '') })
    }
  }
  return rows
}

// ─── JSON FLATTEN FUNCTIONS ───────────────────────────────────────────────────

function flattenLeak(json, fileName, ingestionTs) {
  const get     = (obj, key, def = null) => (obj && obj[key] !== undefined) ? obj[key] : def
  const getBool = (obj, key) => (obj && obj[key] !== undefined) ? Boolean(obj[key]) : null

  return {
    source_file_name:                 fileName,
    ingestion_ts:                     ingestionTs,
    device_id:                        get(json, 'deviceID'),
    jig_id:                           get(json, 'jigID'),
    calibration_name:                 get(json, 'calibrationName'),
    test_timestamp_raw:               get(json, 'timestamp'),
    info_device:                      get(json.info, 'device'),
    info_batch:                       get(json.info, 'batch'),
    info_date:                        get(json.info, 'date'),
    info_jig_id:                      get(json.info, 'jig_id'),
    config_max_pressure:              get(json.config, 'max_pressure'),
    config_min_pressure:              get(json.config, 'min_pressure'),
    config_load_time:                 get(json.config, 'load_time'),
    config_peak_time:                 get(json.config, 'peak_time'),
    config_transfer_time:             get(json.config, 'transfer_time'),
    config_after_time:                get(json.config, 'after_time'),
    config_reference_tank_1:          getBool(json.config, 'reference_tank_1'),
    config_reference_tank_2:          getBool(json.config, 'reference_tank_2'),
    config_save_raw_data:             getBool(json.config, 'save_raw_data'),
    config_device_name:               get(json.config, 'device_name'),
    calib_mean_drop:                  get(json.calibration, 'mean_drop'),
    calib_error_drop:                 get(json.calibration, 'error_drop'),
    calib_mean_slope:                 get(json.calibration, 'mean_slope'),
    calib_error_slope:                get(json.calibration, 'error_slope'),
    calib_mean_fit_qual:              get(json.calibration, 'mean_fit_qual'),
    calib_error_fit_qual:             get(json.calibration, 'error_fit_qual'),
    calib_drop_sigma:                 get(json.calibration, 'drop_sigma'),
    calib_slope_sigma:                get(json.calibration, 'slope_sigma'),
    calib_drop_mean:                  get(json.calibration, 'drop_mean'),
    calib_slope_mean:                 get(json.calibration, 'slope_mean'),
    calib_reference_id:               get(json.calibration, 'reference_id'),
    calib_max_pressure:               get(json.calibration, 'max_pressure'),
    calib_min_pressure:               get(json.calibration, 'min_pressure'),
    calib_last_calib:                 get(json.calibration, 'last_calib'),
    calib_test_samples_json:          json.calibration?.test_samples ? JSON.stringify(json.calibration.test_samples) : null,
    calib_reproved_drop_sigma:        get(json.calibration, 'reproved_drop_sigma'),
    calib_reproved_slope_sigma:       get(json.calibration, 'reproved_slope_sigma'),
    calib_reproved_drop_mean:         get(json.calibration, 'reproved_drop_mean'),
    calib_reproved_slope_mean:        get(json.calibration, 'reproved_slope_mean'),
    calib_reproved_reference_id:      get(json.calibration, 'reproved_reference_id'),
    calib_reproved_test_samples_json: json.calibration?.reproved_test_samples ? JSON.stringify(json.calibration.reproved_test_samples) : null,
    test_slope:                       get(json.test, 'slope'),
    test_drop:                        get(json.test, 'drop'),
    test_r2:                          get(json.test, 'r2'),
    result_drop_pass:                 getBool(json.results, 'drop'),
    result_slope_pass:                getBool(json.results, 'slope'),
    result_r2_pass:                   getBool(json.results, 'r2'),
    result_final_pass:                getBool(json.results, 'result'),
  }
}

function flattenAtpStuG2(json, fileName, ingestionTs) {
  const get = (obj, path, def = null) => {
    if (!obj || !path) return def
    let cur = obj
    for (const k of path.split('.')) {
      if (cur == null) return def
      cur = cur[k]
    }
    return cur !== undefined ? cur : def
  }
  const getObjValue = (obj, rootKey, literalKey, def = null) => {
    const root = obj && obj[rootKey]
    if (!root || typeof root !== 'object') return def
    return Object.prototype.hasOwnProperty.call(root, literalKey) ? root[literalKey] : def
  }
  const asBool  = v => (v == null ? null : Boolean(v))
  const asJson  = (v, fallback) => { try { return v != null ? JSON.stringify(v) : fallback } catch { return fallback } }

  const paramChecks = get(json, 'param_checks_passed', null)

  const temperatureCheckDerived = paramChecks && typeof paramChecks === 'object'
    ? ['baseTemperatureC','humiditySensorTemperatureC','humiditySensorHumidityPercentage',
       'mcuTemperatureC','mainAccelTemperatureC','auxAccelTemperatureC','magnetometerTemperatureC']
        .every(k => paramChecks[k] === true)
    : null

  const signalCheckDerived = paramChecks && typeof paramChecks === 'object'
    ? asBool(paramChecks['chosenReceiver.rxPowerDbm'])
    : null

  return {
    source_file_name:                               fileName,
    ingestion_ts:                                   ingestionTs,
    sensor_id:                                      get(json, 'sensorId'),
    results_calculated_at:                          get(json, 'results_calculated_at'),
    test_start_time:                                get(json, 'test_start_time'),
    test_end_time:                                  get(json, 'test_end_time'),
    params_tested_json:                             asJson(get(json, 'params_tested'), '[]'),
    references_json:                                asJson(get(json, 'references'), '[]'),
    reference_values_json:                          asJson(get(json, 'reference_values'), '{}'),
    dut_values_json:                                asJson(get(json, 'dut_values'), '{}'),
    param_thresholds_json:                          asJson(get(json, 'param_thresholds'), '{}'),
    param_diffs_json:                               asJson(get(json, 'param_diffs'), '{}'),
    param_checks_passed_json:                       asJson(get(json, 'param_checks_passed'), '{}'),
    dut_errors_found_json:                          asJson(get(json, 'dut_errors_found'), '[]'),
    reference_temp:                                 get(json, 'reference_temp', getObjValue(json, 'reference_values', 'baseTemperatureC')),
    reference_signal:                               get(json, 'reference_signal', getObjValue(json, 'reference_values', 'chosenReceiver.rxPowerDbm')),
    reference_status_count:                         get(json, 'reference_status_count'),
    dut_temp:                                       get(json, 'dut_temp', getObjValue(json, 'dut_values', 'baseTemperatureC')),
    dut_signal:                                     get(json, 'dut_signal', getObjValue(json, 'dut_values', 'chosenReceiver.rxPowerDbm')),
    dut_status_count:                               get(json, 'dut_status_count'),
    temperature_threshold_celsius:                  get(json, 'temperature_threshold_celsius', getObjValue(json, 'param_thresholds', 'baseTemperatureC')),
    signal_threshold_db:                            get(json, 'signal_threshold_db', getObjValue(json, 'param_thresholds', 'chosenReceiver.rxPowerDbm')),
    status_count_threshold_percentage:              get(json, 'status_count_threshold_percentage'),
    temp_diff_celsius:                              get(json, 'temp_diff_celsius', getObjValue(json, 'param_diffs', 'baseTemperatureC')),
    signal_diff_db:                                 get(json, 'signal_diff_db', getObjValue(json, 'param_diffs', 'chosenReceiver.rxPowerDbm')),
    status_count_diff_percentage:                   get(json, 'status_count_diff_percentage'),
    error_check_passed:                             asBool(get(json, 'error_check_passed')),
    zero_signal_check_passed:                       asBool(get(json, 'zero_signal_check_passed')),
    temperature_check_passed:                       asBool(get(json, 'temperature_check_passed', temperatureCheckDerived)),
    signal_check_passed:                            asBool(get(json, 'signal_check_passed', signalCheckDerived)),
    status_count_check_passed:                      asBool(get(json, 'status_count_check_passed')),
    overall_result:                                 get(json, 'overall_result'),
    reference_base_temperature_c:                   getObjValue(json, 'reference_values', 'baseTemperatureC'),
    reference_humidity_sensor_temperature_c:        getObjValue(json, 'reference_values', 'humiditySensorTemperatureC'),
    reference_humidity_sensor_humidity_percentage:  getObjValue(json, 'reference_values', 'humiditySensorHumidityPercentage'),
    reference_mcu_temperature_c:                    getObjValue(json, 'reference_values', 'mcuTemperatureC'),
    reference_main_accel_temperature_c:             getObjValue(json, 'reference_values', 'mainAccelTemperatureC'),
    reference_aux_accel_temperature_c:              getObjValue(json, 'reference_values', 'auxAccelTemperatureC'),
    reference_magnetometer_temperature_c:           getObjValue(json, 'reference_values', 'magnetometerTemperatureC'),
    reference_chosen_receiver_rx_power_dbm:         getObjValue(json, 'reference_values', 'chosenReceiver.rxPowerDbm'),
    dut_base_temperature_c:                         getObjValue(json, 'dut_values', 'baseTemperatureC'),
    dut_humidity_sensor_temperature_c:              getObjValue(json, 'dut_values', 'humiditySensorTemperatureC'),
    dut_humidity_sensor_humidity_percentage:        getObjValue(json, 'dut_values', 'humiditySensorHumidityPercentage'),
    dut_mcu_temperature_c:                          getObjValue(json, 'dut_values', 'mcuTemperatureC'),
    dut_main_accel_temperature_c:                   getObjValue(json, 'dut_values', 'mainAccelTemperatureC'),
    dut_aux_accel_temperature_c:                    getObjValue(json, 'dut_values', 'auxAccelTemperatureC'),
    dut_magnetometer_temperature_c:                 getObjValue(json, 'dut_values', 'magnetometerTemperatureC'),
    dut_chosen_receiver_rx_power_dbm:               getObjValue(json, 'dut_values', 'chosenReceiver.rxPowerDbm'),
    threshold_base_temperature_c:                   getObjValue(json, 'param_thresholds', 'baseTemperatureC'),
    threshold_humidity_sensor_temperature_c:        getObjValue(json, 'param_thresholds', 'humiditySensorTemperatureC'),
    threshold_humidity_sensor_humidity_percentage:  getObjValue(json, 'param_thresholds', 'humiditySensorHumidityPercentage'),
    threshold_mcu_temperature_c:                    getObjValue(json, 'param_thresholds', 'mcuTemperatureC'),
    threshold_main_accel_temperature_c:             getObjValue(json, 'param_thresholds', 'mainAccelTemperatureC'),
    threshold_aux_accel_temperature_c:              getObjValue(json, 'param_thresholds', 'auxAccelTemperatureC'),
    threshold_magnetometer_temperature_c:           getObjValue(json, 'param_thresholds', 'magnetometerTemperatureC'),
    threshold_chosen_receiver_rx_power_dbm:         getObjValue(json, 'param_thresholds', 'chosenReceiver.rxPowerDbm'),
    diff_base_temperature_c:                        getObjValue(json, 'param_diffs', 'baseTemperatureC'),
    diff_humidity_sensor_temperature_c:             getObjValue(json, 'param_diffs', 'humiditySensorTemperatureC'),
    diff_humidity_sensor_humidity_percentage:       getObjValue(json, 'param_diffs', 'humiditySensorHumidityPercentage'),
    diff_mcu_temperature_c:                         getObjValue(json, 'param_diffs', 'mcuTemperatureC'),
    diff_main_accel_temperature_c:                  getObjValue(json, 'param_diffs', 'mainAccelTemperatureC'),
    diff_aux_accel_temperature_c:                   getObjValue(json, 'param_diffs', 'auxAccelTemperatureC'),
    diff_magnetometer_temperature_c:                getObjValue(json, 'param_diffs', 'magnetometerTemperatureC'),
    diff_chosen_receiver_rx_power_dbm:              getObjValue(json, 'param_diffs', 'chosenReceiver.rxPowerDbm'),
    check_base_temperature_c_passed:                asBool(getObjValue(json, 'param_checks_passed', 'baseTemperatureC')),
    check_humidity_sensor_temperature_c_passed:     asBool(getObjValue(json, 'param_checks_passed', 'humiditySensorTemperatureC')),
    check_humidity_sensor_humidity_percentage_passed: asBool(getObjValue(json, 'param_checks_passed', 'humiditySensorHumidityPercentage')),
    check_mcu_temperature_c_passed:                 asBool(getObjValue(json, 'param_checks_passed', 'mcuTemperatureC')),
    check_main_accel_temperature_c_passed:          asBool(getObjValue(json, 'param_checks_passed', 'mainAccelTemperatureC')),
    check_aux_accel_temperature_c_passed:           asBool(getObjValue(json, 'param_checks_passed', 'auxAccelTemperatureC')),
    check_magnetometer_temperature_c_passed:        asBool(getObjValue(json, 'param_checks_passed', 'magnetometerTemperatureC')),
    check_chosen_receiver_rx_power_dbm_passed:      asBool(getObjValue(json, 'param_checks_passed', 'chosenReceiver.rxPowerDbm')),
  }
}

function flattenItpStuG2(json, fileName, ingestionTs) {
  const get     = (obj, key, def = null) => { if (!obj) return def; let cur = obj; for (const k of key.split('.')) { if (cur == null) return def; cur = cur[k] } return cur !== undefined ? cur : def }
  const getBool = (obj, key) => { const v = get(obj, key); return v !== null ? Boolean(v) : null }
  const getTs   = (obj, key) => get(obj, key)

  return {
    source_file_name:               fileName,
    ingestion_ts:                   ingestionTs,
    sensor_id:                      get(json, 'sensor_id'),
    batch_device_type:              get(json, 'batch_info.device_type'),
    batch_id:                       get(json, 'batch_info.batch_id'),
    batch_test_date:                get(json, 'batch_info.test_date'),
    test_completed_at:              getTs(json, 'test_metadata.completed_at'),
    workflow_version:               get(json, 'test_metadata.workflow_version'),
    final_result:                   get(json, 'final_result.result'),
    final_timestamp:                getTs(json, 'final_result.timestamp'),
    failed_steps_count:             get(json, 'final_result.failed_count'),
    total_steps_count:              get(json, 'final_result.total_steps'),
    passed_steps_count:             get(json, 'final_result.passed_steps'),
    failed_steps_list:              json.final_result?.failed_steps ? JSON.stringify(json.final_result.failed_steps) : '[]',
    step1_status:                   get(json, 'step1_qrcode.status'),
    step1_timestamp:                getTs(json, 'step1_qrcode.timestamp'),
    step2_status:                   get(json, 'step2_nfc.status'),
    step2_timestamp:                getTs(json, 'step2_nfc.timestamp'),
    step2_external_id_read:         get(json, 'step2_nfc.external_id_read'),
    step2_external_id_expected:     get(json, 'step2_nfc.external_id_expected'),
    step2_valid:                    getBool(json, 'step2_nfc.validation.valid'),
    step2_match:                    getBool(json, 'step2_nfc.validation.match'),
    step3_status:                   get(json, 'step3_ble_connect.status'),
    step3_timestamp:                getTs(json, 'step3_ble_connect.timestamp'),
    step3_device_name:              get(json, 'step3_ble_connect.device.name'),
    step3_device_address:           get(json, 'step3_ble_connect.device.address'),
    step3_sas_available:            getBool(json, 'step3_ble_connect.device.sas_available'),
    step3_cli_available:            getBool(json, 'step3_ble_connect.device.cli_available'),
    step3_rssi:                     get(json, 'step3_ble_connect.device.rssi'),
    step4_status:                   get(json, 'step4_cli_whoami.status'),
    step4_timestamp:                getTs(json, 'step4_cli_whoami.timestamp'),
    step4_components_ok:            get(json, 'step4_cli_whoami.summary.ok'),
    step4_components_total:         get(json, 'step4_cli_whoami.summary.total'),
    step5_status:                   get(json, 'step5_cli_values.status'),
    step5_timestamp:                getTs(json, 'step5_cli_values.timestamp'),
    step5_num_readings:             get(json, 'step5_cli_values.num_readings'),
    step5_reading_interval:         get(json, 'step5_cli_values.reading_interval'),
    step5_humidity_value:           get(json, 'step5_cli_values.latest_values.humidity.value'),
    step5_humidity_passed:          getBool(json, 'step5_cli_values.metrics_validation.humidity.passed'),
    step5_humidity_expected:        get(json, 'step5_cli_values.metrics_validation.humidity.expected'),
    step5_humidity_tolerance:       get(json, 'step5_cli_values.metrics_validation.humidity.tolerance'),
    step5_temp_value:               get(json, 'step5_cli_values.latest_values.temperature.value'),
    step5_temp_passed:              getBool(json, 'step5_cli_values.metrics_validation.temperature.humidity_sensor.passed'),
    step5_temp_expected:            get(json, 'step5_cli_values.metrics_validation.temperature.humidity_sensor.expected'),
    step5_temp_tolerance:           get(json, 'step5_cli_values.metrics_validation.temperature.humidity_sensor.tolerance'),
    step5_mcu_temp_value:           get(json, 'step5_cli_values.latest_values.mcu_temperature.value'),
    step5_mcu_temp_passed:          getBool(json, 'step5_cli_values.metrics_validation.temperature.mcu.passed'),
    step5_mcu_temp_expected:        get(json, 'step5_cli_values.metrics_validation.temperature.mcu.expected'),
    step5_mcu_temp_tolerance:       get(json, 'step5_cli_values.metrics_validation.temperature.mcu.tolerance'),
    step5_readings_json:            json.step5_cli_values?.readings ? JSON.stringify(json.step5_cli_values.readings) : null,
    step6_status:                   get(json, 'step6_sas_mode.status'),
    step6_timestamp:                getTs(json, 'step6_sas_mode.timestamp'),
    step6_sas_available:            getBool(json, 'step6_sas_mode.device.sas_available'),
    step6_cli_active:               getBool(json, 'step6_sas_mode.device.cli_active'),
    step7_status:                   get(json, 'step7_accelerometer_sample.status'),
    step7_timestamp:                getTs(json, 'step7_accelerometer_sample.timestamp'),
    step7_fs:                       get(json, 'step7_accelerometer_sample.parameters.fs'),
    step7_duration:                 get(json, 'step7_accelerometer_sample.parameters.duration'),
    step7_accel_range:              get(json, 'step7_accelerometer_sample.parameters.accel_range'),
    step7_expected_samples:         get(json, 'step7_accelerometer_sample.parameters.expected_samples'),
    step7_samples_collected:        get(json, 'step7_accelerometer_sample.collection.samples_collected'),
    step7_rms_x:                    get(json, 'step7_accelerometer_sample.rms.x'),
    step7_rms_y:                    get(json, 'step7_accelerometer_sample.rms.y'),
    step7_rms_z:                    get(json, 'step7_accelerometer_sample.rms.z'),
    step7_dc_x:                     get(json, 'step7_accelerometer_sample.dc.x'),
    step7_dc_y:                     get(json, 'step7_accelerometer_sample.dc.y'),
    step7_dc_z:                     get(json, 'step7_accelerometer_sample.dc.z'),
    step7_val_rms_x_passed:         getBool(json, 'step7_accelerometer_sample.metrics_validation.rms.x.passed'),
    step7_val_rms_x_expected:       get(json, 'step7_accelerometer_sample.metrics_validation.rms.x.expected'),
    step7_val_rms_x_tolerance:      get(json, 'step7_accelerometer_sample.metrics_validation.rms.x.tolerance'),
    step7_val_rms_y_passed:         getBool(json, 'step7_accelerometer_sample.metrics_validation.rms.y.passed'),
    step7_val_rms_y_expected:       get(json, 'step7_accelerometer_sample.metrics_validation.rms.y.expected'),
    step7_val_rms_y_tolerance:      get(json, 'step7_accelerometer_sample.metrics_validation.rms.y.tolerance'),
    step7_val_rms_z_passed:         getBool(json, 'step7_accelerometer_sample.metrics_validation.rms.z.passed'),
    step7_val_rms_z_expected:       get(json, 'step7_accelerometer_sample.metrics_validation.rms.z.expected'),
    step7_val_rms_z_tolerance:      get(json, 'step7_accelerometer_sample.metrics_validation.rms.z.tolerance'),
    step7_val_dc_x_passed:          getBool(json, 'step7_accelerometer_sample.metrics_validation.dc.x.passed'),
    step7_val_dc_x_expected:        get(json, 'step7_accelerometer_sample.metrics_validation.dc.x.expected'),
    step7_val_dc_x_tolerance:       get(json, 'step7_accelerometer_sample.metrics_validation.dc.x.tolerance'),
    step7_val_dc_y_passed:          getBool(json, 'step7_accelerometer_sample.metrics_validation.dc.y.passed'),
    step7_val_dc_y_expected:        get(json, 'step7_accelerometer_sample.metrics_validation.dc.y.expected'),
    step7_val_dc_y_tolerance:       get(json, 'step7_accelerometer_sample.metrics_validation.dc.y.tolerance'),
    step7_val_dc_z_passed:          getBool(json, 'step7_accelerometer_sample.metrics_validation.dc.z.passed'),
    step7_val_dc_z_expected:        get(json, 'step7_accelerometer_sample.metrics_validation.dc.z.expected'),
    step7_val_dc_z_tolerance:       get(json, 'step7_accelerometer_sample.metrics_validation.dc.z.tolerance'),
    step7_csv_file:                 get(json, 'step7_accelerometer_sample.csv_file'),
    step7_validation_overall:       get(json, 'step7_accelerometer_sample.metrics_validation.overall'),
    step8_status:                   get(json, 'step8_magnetometer_sample.status'),
    step8_timestamp:                getTs(json, 'step8_magnetometer_sample.timestamp'),
    step8_fs:                       get(json, 'step8_magnetometer_sample.parameters.fs'),
    step8_duration:                 get(json, 'step8_magnetometer_sample.parameters.duration'),
    step8_expected_samples:         get(json, 'step8_magnetometer_sample.parameters.expected_samples'),
    step8_samples_collected:        get(json, 'step8_magnetometer_sample.collection.samples_collected'),
    step8_rms_x:                    get(json, 'step8_magnetometer_sample.rms.x'),
    step8_rms_y:                    get(json, 'step8_magnetometer_sample.rms.y'),
    step8_rms_z:                    get(json, 'step8_magnetometer_sample.rms.z'),
    step8_dc_x:                     get(json, 'step8_magnetometer_sample.dc.x'),
    step8_dc_y:                     get(json, 'step8_magnetometer_sample.dc.y'),
    step8_dc_z:                     get(json, 'step8_magnetometer_sample.dc.z'),
    step8_val_rms_x_passed:         getBool(json, 'step8_magnetometer_sample.metrics_validation.rms.x.passed'),
    step8_val_rms_x_expected:       get(json, 'step8_magnetometer_sample.metrics_validation.rms.x.expected'),
    step8_val_rms_x_tolerance:      get(json, 'step8_magnetometer_sample.metrics_validation.rms.x.tolerance'),
    step8_val_rms_y_passed:         getBool(json, 'step8_magnetometer_sample.metrics_validation.rms.y.passed'),
    step8_val_rms_y_expected:       get(json, 'step8_magnetometer_sample.metrics_validation.rms.y.expected'),
    step8_val_rms_y_tolerance:      get(json, 'step8_magnetometer_sample.metrics_validation.rms.y.tolerance'),
    step8_val_rms_z_passed:         getBool(json, 'step8_magnetometer_sample.metrics_validation.rms.z.passed'),
    step8_val_rms_z_expected:       get(json, 'step8_magnetometer_sample.metrics_validation.rms.z.expected'),
    step8_val_rms_z_tolerance:      get(json, 'step8_magnetometer_sample.metrics_validation.rms.z.tolerance'),
    step8_val_dc_x_passed:          getBool(json, 'step8_magnetometer_sample.metrics_validation.dc.x.passed'),
    step8_val_dc_x_expected:        get(json, 'step8_magnetometer_sample.metrics_validation.dc.x.expected'),
    step8_val_dc_x_tolerance:       get(json, 'step8_magnetometer_sample.metrics_validation.dc.x.tolerance'),
    step8_val_dc_y_passed:          getBool(json, 'step8_magnetometer_sample.metrics_validation.dc.y.passed'),
    step8_val_dc_y_expected:        get(json, 'step8_magnetometer_sample.metrics_validation.dc.y.expected'),
    step8_val_dc_y_tolerance:       get(json, 'step8_magnetometer_sample.metrics_validation.dc.y.tolerance'),
    step8_val_dc_z_passed:          getBool(json, 'step8_magnetometer_sample.metrics_validation.dc.z.passed'),
    step8_val_dc_z_expected:        get(json, 'step8_magnetometer_sample.metrics_validation.dc.z.expected'),
    step8_val_dc_z_tolerance:       get(json, 'step8_magnetometer_sample.metrics_validation.dc.z.tolerance'),
    step8_csv_file:                 get(json, 'step8_magnetometer_sample.csv_file'),
    step8_validation_overall:       get(json, 'step8_magnetometer_sample.metrics_validation.overall'),
    step9_status:                   get(json, 'step9_piezo_sample.status'),
    step9_timestamp:                getTs(json, 'step9_piezo_sample.timestamp'),
    step9_fs:                       get(json, 'step9_piezo_sample.parameters.fs'),
    step9_duration:                 get(json, 'step9_piezo_sample.parameters.duration'),
    step9_gain:                     get(json, 'step9_piezo_sample.parameters.gain'),
    step9_expected_samples:         get(json, 'step9_piezo_sample.parameters.expected_samples'),
    step9_samples_collected:        get(json, 'step9_piezo_sample.collection.samples_collected'),
    step9_rms:                      get(json, 'step9_piezo_sample.rms'),
    step9_dc:                       get(json, 'step9_piezo_sample.dc'),
    step9_val_rms_passed:           getBool(json, 'step9_piezo_sample.metrics_validation.rms.passed'),
    step9_val_rms_expected:         get(json, 'step9_piezo_sample.metrics_validation.rms.expected'),
    step9_val_rms_tolerance:        get(json, 'step9_piezo_sample.metrics_validation.rms.tolerance'),
    step9_val_dc_passed:            getBool(json, 'step9_piezo_sample.metrics_validation.dc.passed'),
    step9_val_dc_expected:          get(json, 'step9_piezo_sample.metrics_validation.dc.expected'),
    step9_val_dc_tolerance:         get(json, 'step9_piezo_sample.metrics_validation.dc.tolerance'),
    step9_csv_file:                 get(json, 'step9_piezo_sample.csv_file'),
    step9_validation_overall:       get(json, 'step9_piezo_sample.metrics_validation.overall'),
    step10_status:                  get(json, 'step10_accelerometer_active.status'),
    step10_timestamp:               getTs(json, 'step10_accelerometer_active.timestamp'),
    step10_fs:                      get(json, 'step10_accelerometer_active.parameters.fs'),
    step10_duration:                get(json, 'step10_accelerometer_active.parameters.duration'),
    step10_accel_range:             get(json, 'step10_accelerometer_active.parameters.accel_range'),
    step10_expected_samples:        get(json, 'step10_accelerometer_active.parameters.expected_samples'),
    step10_samples_collected:       get(json, 'step10_accelerometer_active.collection.samples_collected'),
    step10_wavegen_frequency:       get(json, 'step10_accelerometer_active.parameters.frequency'),
    step10_wavegen_amplitude:       get(json, 'step10_accelerometer_active.parameters.amplitude'),
    step10_rms_x:                   get(json, 'step10_accelerometer_active.rms.x'),
    step10_rms_y:                   get(json, 'step10_accelerometer_active.rms.y'),
    step10_rms_z:                   get(json, 'step10_accelerometer_active.rms.z'),
    step10_dc_x:                    get(json, 'step10_accelerometer_active.dc.x'),
    step10_dc_y:                    get(json, 'step10_accelerometer_active.dc.y'),
    step10_dc_z:                    get(json, 'step10_accelerometer_active.dc.z'),
    step10_frf_score:               get(json, 'step10_accelerometer_active.frf_score'),
    step10_reference_rms:           get(json, 'step10_accelerometer_active.reference_rms'),
    step10_val_rms_x_passed:        getBool(json, 'step10_accelerometer_active.metrics_validation.rms.x.passed'),
    step10_val_rms_x_expected:      get(json, 'step10_accelerometer_active.metrics_validation.rms.x.expected'),
    step10_val_rms_x_tolerance:     get(json, 'step10_accelerometer_active.metrics_validation.rms.x.tolerance'),
    step10_val_rms_y_passed:        getBool(json, 'step10_accelerometer_active.metrics_validation.rms.y.passed'),
    step10_val_rms_y_expected:      get(json, 'step10_accelerometer_active.metrics_validation.rms.y.expected'),
    step10_val_rms_y_tolerance:     get(json, 'step10_accelerometer_active.metrics_validation.rms.y.tolerance'),
    step10_val_rms_z_passed:        getBool(json, 'step10_accelerometer_active.metrics_validation.rms.z.passed'),
    step10_val_rms_z_expected:      get(json, 'step10_accelerometer_active.metrics_validation.rms.z.expected'),
    step10_val_rms_z_tolerance:     get(json, 'step10_accelerometer_active.metrics_validation.rms.z.tolerance'),
    step10_val_dc_x_passed:         getBool(json, 'step10_accelerometer_active.metrics_validation.dc.x.passed'),
    step10_val_dc_x_expected:       get(json, 'step10_accelerometer_active.metrics_validation.dc.x.expected'),
    step10_val_dc_x_tolerance:      get(json, 'step10_accelerometer_active.metrics_validation.dc.x.tolerance'),
    step10_val_dc_y_passed:         getBool(json, 'step10_accelerometer_active.metrics_validation.dc.y.passed'),
    step10_val_dc_y_expected:       get(json, 'step10_accelerometer_active.metrics_validation.dc.y.expected'),
    step10_val_dc_y_tolerance:      get(json, 'step10_accelerometer_active.metrics_validation.dc.y.tolerance'),
    step10_val_dc_z_passed:         getBool(json, 'step10_accelerometer_active.metrics_validation.dc.z.passed'),
    step10_val_dc_z_expected:       get(json, 'step10_accelerometer_active.metrics_validation.dc.z.expected'),
    step10_val_dc_z_tolerance:      get(json, 'step10_accelerometer_active.metrics_validation.dc.z.tolerance'),
    step10_val_frf_passed:          getBool(json, 'step10_accelerometer_active.metrics_validation.frf_score.passed'),
    step10_val_frf_expected:        get(json, 'step10_accelerometer_active.metrics_validation.frf_score.expected'),
    step10_val_frf_tolerance:       get(json, 'step10_accelerometer_active.metrics_validation.frf_score.tolerance'),
    step10_val_ref_rms_passed:      getBool(json, 'step10_accelerometer_active.metrics_validation.reference_rms.passed'),
    step10_val_ref_rms_expected:    get(json, 'step10_accelerometer_active.metrics_validation.reference_rms.expected'),
    step10_val_ref_rms_tolerance:   get(json, 'step10_accelerometer_active.metrics_validation.reference_rms.tolerance'),
    step10_validation_overall:      get(json, 'step10_accelerometer_active.metrics_validation.overall'),
    step10_error_message:           get(json, 'step10_accelerometer_active.error'),
    step10_csv_file:                get(json, 'step10_accelerometer_active.csv_file'),
    step10_reference_csv_file:      get(json, 'step10_accelerometer_active.reference_csv_file'),
    step11_status:                  get(json, 'step11_magnetometer_active.status'),
    step11_timestamp:               getTs(json, 'step11_magnetometer_active.timestamp'),
    step11_fs:                      get(json, 'step11_magnetometer_active.parameters.fs'),
    step11_duration:                get(json, 'step11_magnetometer_active.parameters.duration'),
    step11_expected_samples:        get(json, 'step11_magnetometer_active.parameters.expected_samples'),
    step11_samples_collected:       get(json, 'step11_magnetometer_active.collection.samples_collected'),
    step11_wavegen_frequency:       get(json, 'step11_magnetometer_active.parameters.frequency'),
    step11_wavegen_amplitude:       get(json, 'step11_magnetometer_active.parameters.amplitude'),
    step11_rms_x:                   get(json, 'step11_magnetometer_active.rms.x'),
    step11_rms_y:                   get(json, 'step11_magnetometer_active.rms.y'),
    step11_rms_z:                   get(json, 'step11_magnetometer_active.rms.z'),
    step11_dc_x:                    get(json, 'step11_magnetometer_active.dc.x'),
    step11_dc_y:                    get(json, 'step11_magnetometer_active.dc.y'),
    step11_dc_z:                    get(json, 'step11_magnetometer_active.dc.z'),
    step11_val_rms_x_passed:        getBool(json, 'step11_magnetometer_active.metrics_validation.rms.x.passed'),
    step11_val_rms_x_expected:      get(json, 'step11_magnetometer_active.metrics_validation.rms.x.expected'),
    step11_val_rms_x_tolerance:     get(json, 'step11_magnetometer_active.metrics_validation.rms.x.tolerance'),
    step11_val_rms_y_passed:        getBool(json, 'step11_magnetometer_active.metrics_validation.rms.y.passed'),
    step11_val_rms_y_expected:      get(json, 'step11_magnetometer_active.metrics_validation.rms.y.expected'),
    step11_val_rms_y_tolerance:     get(json, 'step11_magnetometer_active.metrics_validation.rms.y.tolerance'),
    step11_val_rms_z_passed:        getBool(json, 'step11_magnetometer_active.metrics_validation.rms.z.passed'),
    step11_val_rms_z_expected:      get(json, 'step11_magnetometer_active.metrics_validation.rms.z.expected'),
    step11_val_rms_z_tolerance:     get(json, 'step11_magnetometer_active.metrics_validation.rms.z.tolerance'),
    step11_val_dc_x_passed:         getBool(json, 'step11_magnetometer_active.metrics_validation.dc.x.passed'),
    step11_val_dc_x_expected:       get(json, 'step11_magnetometer_active.metrics_validation.dc.x.expected'),
    step11_val_dc_x_tolerance:      get(json, 'step11_magnetometer_active.metrics_validation.dc.x.tolerance'),
    step11_val_dc_y_passed:         getBool(json, 'step11_magnetometer_active.metrics_validation.dc.y.passed'),
    step11_val_dc_y_expected:       get(json, 'step11_magnetometer_active.metrics_validation.dc.y.expected'),
    step11_val_dc_y_tolerance:      get(json, 'step11_magnetometer_active.metrics_validation.dc.y.tolerance'),
    step11_val_dc_z_passed:         getBool(json, 'step11_magnetometer_active.metrics_validation.dc.z.passed'),
    step11_val_dc_z_expected:       get(json, 'step11_magnetometer_active.metrics_validation.dc.z.expected'),
    step11_val_dc_z_tolerance:      get(json, 'step11_magnetometer_active.metrics_validation.dc.z.tolerance'),
    step11_validation_overall:      get(json, 'step11_magnetometer_active.metrics_validation.overall'),
    step11_csv_file:                get(json, 'step11_magnetometer_active.csv_file'),
    step12_status:                  get(json, 'step12_piezo_active.status'),
    step12_timestamp:               getTs(json, 'step12_piezo_active.timestamp'),
    step12_fs:                      get(json, 'step12_piezo_active.parameters.fs'),
    step12_duration:                get(json, 'step12_piezo_active.parameters.duration'),
    step12_gain:                    get(json, 'step12_piezo_active.parameters.gain'),
    step12_expected_samples:        get(json, 'step12_piezo_active.parameters.expected_samples'),
    step12_samples_collected:       get(json, 'step12_piezo_active.collection.samples_collected'),
    step12_wavegen_frequency:       get(json, 'step12_piezo_active.parameters.frequency'),
    step12_wavegen_amplitude:       get(json, 'step12_piezo_active.parameters.amplitude'),
    step12_rms:                     get(json, 'step12_piezo_active.rms'),
    step12_dc:                      get(json, 'step12_piezo_active.dc'),
    step12_val_rms_passed:          getBool(json, 'step12_piezo_active.metrics_validation.rms.passed'),
    step12_val_rms_expected:        get(json, 'step12_piezo_active.metrics_validation.rms.expected'),
    step12_val_rms_tolerance:       get(json, 'step12_piezo_active.metrics_validation.rms.tolerance'),
    step12_val_dc_passed:           getBool(json, 'step12_piezo_active.metrics_validation.dc.passed'),
    step12_val_dc_expected:         get(json, 'step12_piezo_active.metrics_validation.dc.expected'),
    step12_val_dc_tolerance:        get(json, 'step12_piezo_active.metrics_validation.dc.tolerance'),
    step12_validation_overall:      get(json, 'step12_piezo_active.metrics_validation.overall'),
    step12_csv_file:                get(json, 'step12_piezo_active.csv_file'),
  }
}

function flattenItpOmni(json, fileName, ingestionTs) {
  const get     = (obj, key, def = null) => { if (!obj) return def; let cur = obj; for (const k of key.split('.')) { if (cur == null) return def; cur = cur[k] } return cur !== undefined ? cur : def }
  const getBool = (obj, key) => { const v = get(obj, key); return v !== null ? Boolean(v) : null }
  const getTs   = (obj, key) => get(obj, key)

  return {
    source_file_name:       fileName,
    ingestion_ts:           ingestionTs,
    sensor_id:              get(json, 'sensor_id'),
    batch_device_type:      get(json, 'batch_info.device_type'),
    batch_id:               get(json, 'batch_info.batch_id'),
    batch_test_date:        get(json, 'batch_info.test_date'),
    test_completed_at:      getTs(json, 'test_metadata.completed_at'),
    workflow_version:       get(json, 'test_metadata.workflow_version'),
    final_result:           get(json, 'final_result.result'),
    final_timestamp:        getTs(json, 'final_result.timestamp'),
    failed_steps_count:     get(json, 'final_result.failed_count'),
    total_steps_count:      get(json, 'final_result.total_steps'),
    failed_steps_list:      json.final_result?.failed_steps ? JSON.stringify(json.final_result.failed_steps) : '[]',
    step1_status:           get(json, 'step1_qrcode.status'),
    step1_timestamp:        getTs(json, 'step1_qrcode.timestamp'),
    step2_status:           get(json, 'step2_nfc.status'),
    step2_timestamp:        getTs(json, 'step2_nfc.timestamp'),
    step2_external_id_read: get(json, 'step2_nfc.external_id_read'),
    step2_valid:            getBool(json, 'step2_nfc.validation.valid'),
    step3_status:           get(json, 'step3_ble_connect.status'),
    step3_timestamp:        getTs(json, 'step3_ble_connect.timestamp'),
    step3_device_name:      get(json, 'step3_ble_connect.device.name'),
    step3_device_address:   get(json, 'step3_ble_connect.device.address'),
    step4_status:           get(json, 'step4_cli_whoami.status'),
    step4_timestamp:        getTs(json, 'step4_cli_whoami.timestamp'),
    step4_components_ok:    get(json, 'step4_cli_whoami.summary.ok'),
    step4_components_total: get(json, 'step4_cli_whoami.summary.total'),
    step5_status:           get(json, 'step5_cli_values.status'),
    step5_timestamp:        getTs(json, 'step5_cli_values.timestamp'),
    step5_humidity_value:   get(json, 'step5_cli_values.latest_values.humidity.value'),
    step5_humidity_passed:  getBool(json, 'step5_cli_values.metrics_validation.humidity.passed'),
    step5_temp_value:       get(json, 'step5_cli_values.latest_values.temperature.value'),
    step5_temp_passed:      getBool(json, 'step5_cli_values.metrics_validation.temperature.humidity_sensor.passed'),
    step5_mcu_temp_value:   get(json, 'step5_cli_values.latest_values.mcu_temperature.value'),
    step5_mcu_temp_passed:  getBool(json, 'step5_cli_values.metrics_validation.temperature.mcu.passed'),
    step5_readings_json:    json.step5_cli_values?.readings ? JSON.stringify(json.step5_cli_values.readings) : null,
    step6_status:           get(json, 'step6_sas_mode.status'),
    step6_timestamp:        getTs(json, 'step6_sas_mode.timestamp'),
    step6_sas_available:    getBool(json, 'step6_sas_mode.device.sas_available'),
    step7_status:           get(json, 'step7_accelerometer_sample.status'),
    step7_timestamp:        getTs(json, 'step7_accelerometer_sample.timestamp'),
    step7_rms_x:            get(json, 'step7_accelerometer_sample.rms.x'),
    step7_rms_y:            get(json, 'step7_accelerometer_sample.rms.y'),
    step7_rms_z:            get(json, 'step7_accelerometer_sample.rms.z'),
    step7_dc_x:             get(json, 'step7_accelerometer_sample.dc.x'),
    step7_dc_y:             get(json, 'step7_accelerometer_sample.dc.y'),
    step7_dc_z:             get(json, 'step7_accelerometer_sample.dc.z'),
    step7_csv_file:         get(json, 'step7_accelerometer_sample.csv_file'),
    step7_validation_overall: get(json, 'step7_accelerometer_sample.metrics_validation.overall'),
    step8_status:           get(json, 'step8_magnetometer_sample.status'),
    step8_timestamp:        getTs(json, 'step8_magnetometer_sample.timestamp'),
    step8_rms_x:            get(json, 'step8_magnetometer_sample.rms.x'),
    step8_rms_y:            get(json, 'step8_magnetometer_sample.rms.y'),
    step8_rms_z:            get(json, 'step8_magnetometer_sample.rms.z'),
    step8_dc_x:             get(json, 'step8_magnetometer_sample.dc.x'),
    step8_dc_y:             get(json, 'step8_magnetometer_sample.dc.y'),
    step8_dc_z:             get(json, 'step8_magnetometer_sample.dc.z'),
    step8_csv_file:         get(json, 'step8_magnetometer_sample.csv_file'),
    step8_validation_overall: get(json, 'step8_magnetometer_sample.metrics_validation.overall'),
    step9_status:           get(json, 'step9_piezo_sample.status'),
    step9_timestamp:        getTs(json, 'step9_piezo_sample.timestamp'),
    step9_rms:              get(json, 'step9_piezo_sample.rms'),
    step9_dc:               get(json, 'step9_piezo_sample.dc'),
    step9_csv_file:         get(json, 'step9_piezo_sample.csv_file'),
    step9_validation_overall: get(json, 'step9_piezo_sample.metrics_validation.overall'),
    step10_status:          get(json, 'step10_accelerometer_active.status'),
    step10_timestamp:       getTs(json, 'step10_accelerometer_active.timestamp'),
    step10_rms_x:           get(json, 'step10_accelerometer_active.rms.x'),
    step10_rms_y:           get(json, 'step10_accelerometer_active.rms.y'),
    step10_rms_z:           get(json, 'step10_accelerometer_active.rms.z'),
    step10_dc_x:            get(json, 'step10_accelerometer_active.dc.x'),
    step10_dc_y:            get(json, 'step10_accelerometer_active.dc.y'),
    step10_dc_z:            get(json, 'step10_accelerometer_active.dc.z'),
    step10_frf_score:       get(json, 'step10_accelerometer_active.frf_score'),
    step10_reference_rms:   get(json, 'step10_accelerometer_active.reference_rms'),
    step10_validation_overall: get(json, 'step10_accelerometer_active.metrics_validation.overall'),
    step10_error_message:   get(json, 'step10_accelerometer_active.error'),
    step11_status:          get(json, 'step11_magnetometer_active.status'),
    step11_timestamp:       getTs(json, 'step11_magnetometer_active.timestamp'),
    step11_rms_x:           get(json, 'step11_magnetometer_active.rms.x'),
    step11_rms_y:           get(json, 'step11_magnetometer_active.rms.y'),
    step11_rms_z:           get(json, 'step11_magnetometer_active.rms.z'),
    step11_dc_x:            get(json, 'step11_magnetometer_active.dc.x'),
    step11_dc_y:            get(json, 'step11_magnetometer_active.dc.y'),
    step11_dc_z:            get(json, 'step11_magnetometer_active.dc.z'),
    step11_validation_overall: get(json, 'step11_magnetometer_active.metrics_validation.overall'),
    step12_status:          get(json, 'step12_piezo_active.status'),
    step12_timestamp:       getTs(json, 'step12_piezo_active.timestamp'),
    step12_rms:             get(json, 'step12_piezo_active.rms'),
    step12_dc:              get(json, 'step12_piezo_active.dc'),
    step12_validation_overall: get(json, 'step12_piezo_active.metrics_validation.overall'),
  }
}

// ─── BQ HELPERS ───────────────────────────────────────────────────────────────

async function ensureTableExists(tableId, schemaDef) {
  const fields  = Object.entries(schemaDef).map(([name, type]) => ({ name, type, mode: 'NULLABLE' }))
  const dataset = bq.dataset(DATASET)
  const table   = dataset.table(tableId)

  try {
    const [exists] = await table.exists()

    if (!exists) {
      await withRetry(() => table.create({ schema: { fields } }))
      console.log(`[bq] tabela criada: ${tableId}`)
      return
    }

    const [meta]    = await table.getMetadata()
    const existing  = new Set((meta.schema?.fields || []).map(f => f.name))
    const missing   = fields.filter(f => !existing.has(f.name))

    if (missing.length) {
      const merged = (meta.schema.fields || []).concat(missing)
      await withRetry(() => table.setMetadata({ schema: { fields: merged } }))
      console.log(`[bq] ${tableId}: +${missing.length} colunas`)
    }
  } catch (err) {
    console.error(`[bq] ensureTableExists ${tableId}:`, err.message)
    throw err
  }
}

async function fetchExistingIds(tableId, field, names) {
  const existing = new Set()
  if (!names.length) return existing

  const batchSize = 500
  for (let i = 0; i < names.length; i += batchSize) {
    const batch  = names.slice(i, i + batchSize)
    const inList = batch.map(n => `'${n.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',')
    const query  = `SELECT DISTINCT \`${field}\` FROM \`${PROJECT_ID}.${DATASET}.${tableId}\` WHERE \`${field}\` IN (${inList})`

    try {
      const [rows] = await withRetry(() => bq.query({ query, useLegacySql: false }))
      rows.forEach(r => existing.add(String(r[field])))
    } catch { /* tabela ainda não existe ou está vazia */ }
  }

  return existing
}

async function bqInsert(tableId, rows) {
  if (!rows.length) return
  const table     = bq.dataset(DATASET).table(tableId)
  const chunkSize = 500

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await withRetry(() => table.insert(chunk))
    console.log(`[bq] ${tableId}: +${chunk.length} linhas`)
  }
}

// ─── DRIVE HELPERS ────────────────────────────────────────────────────────────

async function listRecentFiles(drive, folderId, cutoff) {
  const files = []
  let pageToken

  do {
    const res = await withRetry(() => drive.files.list({
      q:          `'${folderId}' in parents and modifiedTime > '${cutoff}' and trashed = false`,
      fields:     'nextPageToken, files(id, name)',
      pageSize:   1000,
      pageToken,
    }))
    ;(res.data.files || []).forEach(f => files.push(f))
    pageToken = res.data.nextPageToken
  } while (pageToken)

  return files
}

async function downloadText(drive, fileId) {
  const res = await withRetry(() =>
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
  )

  const buf = Buffer.from(res.data)

  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4B) {
    throw new Error('Arquivo parece XLSX/ZIP, não CSV/JSON')
  }

  // Tenta UTF-8 primeiro, fallback para latin1
  const text = buf.toString('utf8')
  return sanitizeText(text)
}

// ─── CSV UTILITIES ────────────────────────────────────────────────────────────

function sanitizeText(raw) {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u200B/g, '')
    .replace(/\u2028/g, '\n')
    .replace(/\u2029/g, '\n')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
}

function parseCsv(text) {
  let raw = sanitizeText(text)
  if (!raw || !raw.trim()) return null
  if (!raw.endsWith('\n')) raw += '\n'

  const sample = raw.split('\n').slice(0, 30).join('\n')
  let delim = ','
  let bestScore = -1
  for (const d of [',', ';', '\t', '|']) {
    const score = (sample.split(d).length - 1)
    if (score > bestScore) { bestScore = score; delim = d }
  }

  const rows = []
  let row = [], field = '', inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const ch   = raw[i]
    const next = raw[i + 1] ?? ''

    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++ }
      else { inQuotes = !inQuotes }
      continue
    }

    if (!inQuotes && ch === delim) { row.push(field); field = ''; continue }

    if (!inQuotes && ch === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
      continue
    }

    field += ch
  }

  if (field || row.length) { row.push(field); rows.push(row) }

  // Remove linhas vazias finais
  while (rows.length && rows[rows.length - 1].every(v => !String(v ?? '').trim())) rows.pop()

  return rows.length ? rows : null
}

function buildFallbackMeta(file) {
  const now   = new Date()
  const pad2  = n => String(n).padStart(2, '0')
  const upload_date = `${now.getUTCFullYear()}${pad2(now.getUTCMonth()+1)}${pad2(now.getUTCDate())}`
  const upload_time = `${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}`
  const lower = file.name.toLowerCase()
  const file_type = lower.includes('inputs') ? 'inputs' : 'results'
  return { file_type, upload_date, upload_time, lote: '' }
}

// ─── SHARED UTILITIES ─────────────────────────────────────────────────────────

async function withRetry(fn, maxAttempts = 7, baseMs = 500, maxSleepMs = 20000) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = String(err?.message || err).toLowerCase()
      const retryable = msg.includes('unavailable') || msg.includes('backend error') ||
                        msg.includes('internal error') || msg.includes('rate limit') ||
                        msg.includes('quota') || msg.includes('503') ||
                        msg.includes('timeout') || msg.includes('socket') ||
                        msg.includes('connection')
      if (!retryable || attempt === maxAttempts) throw err
      const exp    = Math.min(maxSleepMs, baseMs * Math.pow(2, attempt - 1))
      const jitter = Math.floor(Math.random() * 250)
      await new Promise(r => setTimeout(r, Math.min(maxSleepMs, exp + jitter)))
    }
  }
  throw lastErr
}
