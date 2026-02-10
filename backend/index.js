const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'tractian-bi' });

const DEVICE_CONFIG = {
  'EnergyTrac': {
    tables: { atp: 'energytrac' },
    hasChipInfo: true
  },
  'OmniTrac': {
    tables: { atp: 'omnitrac', itp: 'omnitrac' },
    hasChipInfo: false
  },
  'Smart Trac Ultra': {
    tables: { atp: 'smarttrac', leak: 'smarttrac' },
    hasChipInfo: false
  },
  'Smart Trac Ultra Gen 2': {
    tables: { atp: 'smarttrac', itp: 'smarttrac_ultra_gen2', leak: 'smarttrac' },
    hasChipInfo: false
  },
  'Omni Receiver': {
    tables: { atp: 'omni_receiver' },
    hasChipInfo: true
  },
  'Smart Receiver Ultra': {
    tables: { atp: 'receiver', leak: 'receiver' },
    hasChipInfo: true
  },
  'Unitrac': {
    tables: { atp: 'unitrac' },
    hasChipInfo: false
  }
};

const TABLES_CONFIG = [
  // ATP tables
  { table: 'fct_all_results_atp_energytrac', idColumn: 'sensor_id', testType: 'atp' },
  { table: 'fct_all_results_atp_omni_receiver', idColumn: 'omni_receiver_id', testType: 'atp' },
  { table: 'fct_all_results_atp_omnitrac', idColumn: 'omnitrac_id', testType: 'atp' },
  { table: 'fct_all_results_atp_receiver', idColumn: 'receiver_id', testType: 'atp' },
  { table: 'fct_all_results_atp_smarttrac', idColumn: 'sensor_id', testType: 'atp' },
  { table: 'fct_all_results_atp_unitrac', idColumn: 'unitrac_id', testType: 'atp' },

  // ITP tables
  { table: 'fct_all_results_itp_omnitrac', idColumn: 'device_id', testType: 'itp' },
  { table: 'fct_all_results_itp_smarttrac_ultra_gen2', idColumn: 'sensor_id', testType: 'itp' },

  // Leak test
  { table: 'fct_all_results_leak_test', idColumn: 'device_id', testType: 'leak' }
];

const DATASET = 'operations_dbt';

// Função auxiliar para converter test_date do BigQuery para ISO string
function parseTestDate(testDate) {
  if (!testDate) return undefined;

  try {
    // BigQuery retorna DATE/TIMESTAMP como objeto com value
    // ou como string no formato "YYYY-MM-DD HH:mm:ss UTC"
    let dateValue = testDate;

    if (typeof testDate === 'object' && testDate.value) {
      dateValue = testDate.value;
    }

    // Converter para string se necessário
    const dateStr = String(dateValue);

    // Remover " UTC" do final se existir e criar Date
    const cleanDateStr = dateStr.replace(' UTC', '').trim();
    const date = new Date(cleanDateStr);

    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.warn(`Invalid test_date value: ${testDate}`);
      return undefined;
    }

    return date.toISOString();
  } catch (error) {
    console.error('Error parsing test_date:', error, testDate);
    return undefined;
  }
}

// Função auxiliar para inferir tipo do dispositivo a partir do info_device do Leak Test
function inferDeviceTypeFromLeak(info_device) {
  if (!info_device) return null;

  const lower = info_device.toLowerCase();

  // Smart Trac (todas as variações)
  if (lower.includes('smart trac') || lower.includes('stu')) {
    return 'Smart Trac Ultra';
  }

  // Smart Receiver
  if (lower.includes('smart receiver')) {
    return 'Smart Receiver Ultra';
  }

  return null;
}

// Função auxiliar para inferir tipo do dispositivo a partir do ITP
function inferDeviceTypeFromITP(data, tableName) {
  // Se for da tabela omnitrac, sempre é OmniTrac
  if (tableName === 'fct_all_results_itp_omnitrac') {
    return 'OmniTrac';
  }

  // Se for da tabela smarttrac_ultra_gen2, usar batch_device_type
  if (tableName === 'fct_all_results_itp_smarttrac_ultra_gen2') {
    return data.batch_device_type || null;
  }

  return null;
}

// Função auxiliar para buscar chip info
async function fetchChipInfo(deviceId, config) {
  if (!config.hasChipInfo) return null;

  try {
    const chipQuery = `
      SELECT *
      FROM \`tractian-bi.${DATASET}.int_devices_chip_check\`
      WHERE id = @deviceId
      LIMIT 1
    `;
    const [chipRows] = await bigquery.query({
      query: chipQuery,
      params: { deviceId: deviceId.toUpperCase() },
      useQueryCache: false
    });

    return chipRows[0] ? transformChipInfo(chipRows[0]) : null;
  } catch (error) {
    console.error('Error fetching chip info:', error);
    return null;
  }
}

// Função auxiliar para buscar em TODAS as tabelas (ATP, ITP, Leak) em paralelo
async function searchAllTables(deviceId) {
  const promises = TABLES_CONFIG.map(async ({ table, idColumn, testType }) => {
    const query = `
      SELECT *
      FROM \`tractian-bi.${DATASET}.${table}\`
      WHERE ${idColumn} = @deviceId
      ORDER BY test_date DESC
      LIMIT 1
    `;

    try {
      const [rows] = await bigquery.query({
        query,
        params: { deviceId: deviceId.toUpperCase() },
        useQueryCache: false
      });

      if (rows.length > 0) {
        rows[0].device_id = rows[0][idColumn]; // Normaliza device_id
        rows[0]._testType = testType; // Adiciona tipo do teste
        rows[0]._tableName = table; // Adiciona nome da tabela
        return rows[0];
      }
      return null;
    } catch (error) {
      console.error(`Error searching table ${table}:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(result => result !== null);
}

// Função para buscar dispositivos por lote
async function getDevicesByBatch(batchPrefix, res) {
  try {
    // 1. Buscar em TODAS as tabelas (ATP, ITP, Leak) em paralelo
    const promises = TABLES_CONFIG.map(async ({ table, idColumn, testType }) => {
      const query = `
        SELECT * EXCEPT(row_num)
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY ${idColumn} ORDER BY test_date DESC) as row_num
          FROM \`tractian-bi.${DATASET}.${table}\`
          WHERE batch LIKE @batchPattern
        )
        WHERE row_num = 1
      `;

      try {
        const [rows] = await bigquery.query({
          query,
          params: { batchPattern: `${batchPrefix}%` },
          useQueryCache: false
        });

        // Adiciona metadados para cada row
        rows.forEach(row => {
          row.device_id = row[idColumn]; // Normaliza device_id
          row._testType = testType;
          row._tableName = table;
        });

        return rows;
      } catch (error) {
        console.error(`Error searching batch in ${table}:`, error);
        return [];
      }
    });

    // Aguardar todas as queries em paralelo
    const allResults = await Promise.all(promises);
    const allRows = allResults.flat();

    if (allRows.length === 0) {
      return res.status(404).json({
        error: 'No devices found',
        message: `Nenhum dispositivo encontrado para o lote ${batchPrefix}`
      });
    }

    // 2. Agregar dispositivos por device_id
    const deviceMap = new Map(); // device_id -> { atpData, itpData, leakData, deviceName, batch }

    allRows.forEach(row => {
      const deviceId = row.device_id;
      const testType = row._testType;

      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          atpData: null,
          itpData: null,
          leakData: null,
          deviceName: null,
          batch: row.batch
        });
      }

      const device = deviceMap.get(deviceId);

      // Adicionar teste ao dispositivo
      if (testType === 'atp') {
        device.atpData = row;
        device.deviceName = row.device_name; // ATP tem prioridade no device name
      } else if (testType === 'itp') {
        device.itpData = row;
        // Se ainda não tem device name (não tem ATP), inferir do ITP
        if (!device.deviceName) {
          device.deviceName = inferDeviceTypeFromITP(row, row._tableName);
        }
      } else if (testType === 'leak') {
        device.leakData = row;
        // Se ainda não tem device name (não tem ATP nem ITP), inferir do Leak
        if (!device.deviceName) {
          device.deviceName = inferDeviceTypeFromLeak(row.info_device);
        }
      }
    });

    // 3. Coletar device IDs que precisam de chip info
    const deviceIdsNeedingChip = [];

    deviceMap.forEach((data, deviceId) => {
      if (!data.deviceName) {
        console.warn(`Could not determine device type for ${deviceId}`);
        return;
      }

      const config = DEVICE_CONFIG[data.deviceName];
      if (config && config.hasChipInfo) {
        deviceIdsNeedingChip.push(deviceId);
      }
    });

    // 4. Buscar TODOS os chips de uma vez (1 query)
    let chipMap = new Map();
    if (deviceIdsNeedingChip.length > 0) {
      try {
        const chipQuery = `
          SELECT *
          FROM \`tractian-bi.${DATASET}.int_devices_chip_check\`
          WHERE id IN UNNEST(@deviceIds)
        `;

        const [chipRows] = await bigquery.query({
          query: chipQuery,
          params: { deviceIds: deviceIdsNeedingChip },
          useQueryCache: false
        });

        // Criar mapa: deviceId -> chipInfo
        chipRows.forEach(chipRow => {
          chipMap.set(chipRow.id, transformChipInfo(chipRow));
        });
      } catch (error) {
        console.error('Error fetching chip info batch:', error);
        // Continua sem chip info em caso de erro
      }
    }

    // 5. Montar devices usando os mapas
    const allDevices = [];
    deviceMap.forEach((data, deviceId) => {
      const { atpData, itpData, leakData, deviceName, batch } = data;

      if (!deviceName) {
        console.warn(`Skipping device ${deviceId}: could not determine device type`);
        return;
      }

      const config = DEVICE_CONFIG[deviceName];

      if (!config) {
        console.warn(`Unknown device type: ${deviceName} for device ${deviceId}`);
        return;
      }

      // Buscar chip info no mapa (O(1) lookup)
      const chipInfo = chipMap.get(deviceId) || null;

      // Montar testes baseado no DEVICE_CONFIG
      const tests = [];

      // ATP - todos os dispositivos devem ter
      if (atpData) {
        tests.push(transformATP(atpData, deviceName));
      } else if (config.tables.atp) {
        // Dispositivo deve ter ATP mas não foi encontrado
        tests.push({
          testName: 'ATP',
          testType: 'electrical',
          status: 'pending',
          parameters: []
        });
      }

      // ITP - verificar se o dispositivo deve ter
      if (config.tables.itp) {
        if (itpData) {
          tests.push(transformITP(itpData));
        } else {
          // Dispositivo deve ter ITP mas não foi encontrado
          tests.push({
            testName: 'ITP',
            testType: 'electrical',
            status: 'pending',
            parameters: []
          });
        }
      }

      // Leak Test - verificar se o dispositivo deve ter
      if (config.tables.leak) {
        if (leakData) {
          tests.push(transformLeak(leakData));
        } else {
          // Dispositivo deve ter Leak mas não foi encontrado
          tests.push({
            testName: 'Leak Test',
            testType: 'leak',
            status: 'pending',
            parameters: []
          });
        }
      }

      const device = {
        id: deviceId,
        deviceType: deviceName,
        overallStatus: calculateStatus(tests),
        tests,
        chipInfo,
        batch: batch || undefined
      };

      allDevices.push(device);
    });

    return res.json({
      batch: batchPrefix,
      count: allDevices.length,
      devices: allDevices
    });

  } catch (error) {
    console.error('Error in getDevicesByBatch:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

exports.getDevice = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const input = req.query.deviceId;

  if (!input) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  // Detectar se é um lote (formato: #?YYYYMMDD_XX)
  const batchPattern = /^#?(\d{8}_\d{2})$/;
  const batchMatch = input.match(batchPattern);

  if (batchMatch) {
    // É um lote! Buscar todos os devices do lote
    const batchPrefix = batchMatch[1];
    return await getDevicesByBatch(batchPrefix, res);
  }

  // Validar formato de ID único
  if (!/^[A-Z0-9]{5,10}$/i.test(input)) {
    return res.status(400).json({ error: 'Invalid deviceId format' });
  }

  const deviceId = input;

  try {
    // 1. Buscar em TODAS as tabelas (ATP, ITP, Leak) em paralelo
    const allResults = await searchAllTables(deviceId);

    // 2. Se não encontrou nada, retorna 404
    if (allResults.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // 3. Separar resultados por tipo de teste
    const atpData = allResults.find(r => r._testType === 'atp');
    const leakData = allResults.find(r => r._testType === 'leak');
    const itpData = allResults.find(r => r._testType === 'itp');

    // 4. Determinar tipo do dispositivo (prioridade: ATP > ITP > Leak)
    let deviceName = null;
    let deviceIdNormalized = null;
    let batch = null;

    if (atpData) {
      // Prioridade 1: usar device_name do ATP
      deviceName = atpData.device_name;
      deviceIdNormalized = atpData.device_id;
      batch = atpData.batch;
    } else if (itpData) {
      // Prioridade 2: inferir device type do ITP
      deviceName = inferDeviceTypeFromITP(itpData, itpData._tableName);
      deviceIdNormalized = itpData.device_id;
      batch = itpData.batch;

      if (!deviceName) {
        return res.status(500).json({
          error: 'Could not determine device type',
          message: `Found ITP but could not infer device type from table: ${itpData._tableName}`
        });
      }
    } else if (leakData) {
      // Prioridade 3: inferir device type do Leak Test
      deviceName = inferDeviceTypeFromLeak(leakData.info_device);
      deviceIdNormalized = leakData.device_id;
      batch = leakData.batch;

      if (!deviceName) {
        return res.status(500).json({
          error: 'Could not determine device type',
          message: `Found Leak Test but could not infer device type from info_device: ${leakData.info_device}`
        });
      }
    }

    const config = DEVICE_CONFIG[deviceName];

    if (!config) {
      return res.status(500).json({
        error: `Unknown device type: ${deviceName}`,
        availableTypes: Object.keys(DEVICE_CONFIG)
      });
    }

    // 5. Buscar chip info
    const chipInfo = await fetchChipInfo(deviceIdNormalized, config);

    // 6. Montar array de testes baseado no DEVICE_CONFIG
    const tests = [];

    // ATP - todos os dispositivos devem ter
    if (atpData) {
      tests.push(transformATP(atpData, deviceName));
    } else if (config.tables.atp) {
      // Dispositivo deve ter ATP mas não foi encontrado
      tests.push({
        testName: 'ATP',
        testType: 'electrical',
        status: 'pending',
        parameters: []
      });
    }

    // ITP - verificar se o dispositivo deve ter
    if (config.tables.itp) {
      if (itpData) {
        tests.push(transformITP(itpData));
      } else {
        // Dispositivo deve ter ITP mas não foi encontrado
        tests.push({
          testName: 'ITP',
          testType: 'electrical',
          status: 'pending',
          parameters: []
        });
      }
    }

    // Leak Test - verificar se o dispositivo deve ter
    if (config.tables.leak) {
      if (leakData) {
        tests.push(transformLeak(leakData));
      } else {
        // Dispositivo deve ter Leak mas não foi encontrado
        tests.push({
          testName: 'Leak Test',
          testType: 'leak',
          status: 'pending',
          parameters: []
        });
      }
    }

    // 7. Montar resposta final
    const device = {
      id: deviceIdNormalized,
      deviceType: deviceName,
      overallStatus: calculateStatus(tests),
      tests,
      chipInfo,
      batch: batch || undefined
    };

    return res.json(device);

  } catch (error) {
    console.error('BigQuery Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Mapa de campos por tipo de dispositivo
const DEVICE_FIELDS = {
  'EnergyTrac': [
    { prefix: 'signal', name: 'Signal', unit: 'dBm' },
    { prefix: 'rms_ia', name: 'RMS IA', unit: 'A' },
    { prefix: 'rms_ib', name: 'RMS IB', unit: 'A' },
    { prefix: 'rms_ic', name: 'RMS IC', unit: 'A' },
    { prefix: 'rms_va', name: 'RMS VA', unit: 'V' },
    { prefix: 'rms_vb', name: 'RMS VB', unit: 'V' },
    { prefix: 'rms_vc', name: 'RMS VC', unit: 'V' },
    { prefix: 'modem_temp', name: 'Modem Temp', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Omni Receiver': [
    { prefix: 'signal', name: 'Signal', unit: 'dBm' },
    { prefix: 'modem_temp', name: 'Modem Temp', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'OmniTrac': [
    { prefix: 'soc_temp', name: 'SoC Temp', unit: '°C' },
    { prefix: 'cpu_usage', name: 'CPU Usage', unit: '%' },
    { prefix: 'memory_usage', name: 'Memory Usage', unit: 'MB' },
    { prefix: 'disk_usage', name: 'Disk Usage', unit: 'MB' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Smart Trac Ultra': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'temperature_thermistor', name: 'Temperature Thermistor', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Smart Receiver Ultra': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'signal', name: 'Signal', unit: 'dBm' },
    { prefix: 'modem_voltage', name: 'Modem Voltage', unit: 'V' },
    { prefix: 'modem_temp', name: 'Modem Temp', unit: '°C' },
    { prefix: 'cpu_temperature', name: 'CPU Temperature', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Unitrac': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'internal_temp_c', name: 'Internal Temp', unit: '°C' },
    { prefix: 'powerline_voltage', name: 'Powerline Voltage', unit: 'V' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ]
};

function transformATP(data, deviceName) {
  const fields = DEVICE_FIELDS[deviceName] || [];
  const params = [];
  
  for (const { prefix, name, unit } of fields) {
    const valueField = `${prefix}_value`;
    const refField = `${prefix}_ref_mean`;
    const statusField = `${prefix}_status`;
    
    if (data[valueField] != null) {
      params.push({
        name,
        measured: unit ? `${data[valueField]} ${unit}` : data[valueField],
        expected: data[refField] != null ? (unit ? `${data[refField]} ${unit}` : `${data[refField]}`) : undefined,
        status: data[statusField] === 'PASS' ? 'approved' : data[statusField] === 'FAIL' ? 'failed' : 'pending'
      });
    }
  }
  
  return {
    testName: 'ATP',
    testType: 'electrical',
    status: data.final_status === 'PASS' ? 'approved' : 'failed',
    date: parseTestDate(data.test_date),
    parameters: params
  };
}

function transformITP(data) {
  return {
    testName: 'ITP',
    testType: 'electrical',
    status: 'approved',
    date: parseTestDate(data.test_date),
    parameters: []
  };
}

function transformLeak(data) {
  // Aba 1: Leak Test (valores medidos)
  const leakTestParams = [
    {
      name: 'Drop',
      measured: `${data.test_drop} Pa/min`,
      status: data.result_drop_pass ? 'approved' : 'failed'
    },
    {
      name: 'Slope',
      measured: `${data.test_slope}`,
      status: data.result_slope_pass ? 'approved' : 'failed'
    },
    {
      name: 'R² (Fit Quality)',
      measured: `${data.test_r2}`,
      status: data.result_r2_pass ? 'approved' : 'failed'
    }
  ];

  // Aba 2: Calibração (dados de referência)
  const calibrationParams = [
    {
      name: 'ID da Jiga',
      measured: data.jig_id || 'N/A',
      status: 'approved'
    },
    {
      name: 'Última Calibração',
      measured: data.calib_last_calib ? new Date(data.calib_last_calib).toLocaleDateString('pt-BR') : 'N/A',
      status: 'approved'
    },
    {
      name: 'Drop de Referência',
      measured: `${data.calib_mean_drop} Pa/min`,
      status: 'approved'
    },
    {
      name: 'Slope de Referência',
      measured: `${data.calib_mean_slope}`,
      status: 'approved'
    },
    {
      name: 'R² de Referência',
      measured: `${data.calib_mean_fit_qual}`,
      status: 'approved'
    }
  ];

  return {
    testName: 'Leak Test',
    testType: 'leak',
    status: data.result_final_pass ? 'approved' : 'failed',
    date: parseTestDate(data.test_date),
    sections: [
      {
        name: 'Leak Test',
        parameters: leakTestParams
      },
      {
        name: 'Calibração',
        parameters: calibrationParams
      }
    ]
  };
}

function calculateStatus(tests) {
  if (tests.some(t => t.status === 'failed')) return 'failed';
  if (tests.some(t => t.status === 'pending')) return 'pending';
  return 'approved';
}

function transformChipInfo(data) {
  if (!data || !data.operadora1) return null;
  
  const isInactive = data.operadora1 === 'Inactive';
  const isDual = data.chip_config === 'Dual Chip' && data.sim_ccid2 && data.operadora2 !== 'Inactive';
  
  return {
    type: isInactive ? 'Não Identificado' : isDual ? 'Dual Chip' : 'Single Chip',
    chip1: {
      carrier: data.operadora1 === 'Inactive' ? 'Inativo' : data.operadora1,
      ccid: data.sim_ccid1 || 'N/A'
    },
    chip2: isDual ? {
      carrier: data.operadora2 === 'Inactive' ? 'Inativo' : data.operadora2,
      ccid: data.sim_ccid2
    } : undefined
  };
}
