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
  { table: 'fct_all_results_atp_energytrac', idColumn: 'sensor_id' },
  { table: 'fct_all_results_atp_omni_receiver', idColumn: 'omni_receiver_id' },
  { table: 'fct_all_results_atp_omnitrac', idColumn: 'omnitrac_id' },
  { table: 'fct_all_results_atp_receiver', idColumn: 'receiver_id' },
  { table: 'fct_all_results_atp_unitrac', idColumn: 'unitrac_id' }
];

const DATASET = 'operations_dbt_dev';

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

// Função para buscar dispositivos por lote
async function getDevicesByBatch(batchPrefix, res) {
  try {
    const allRowsData = [];
    
    // 1. Buscar em todas as tabelas e coletar dados
    for (const { table, idColumn } of TABLES_CONFIG) {
      const query = `
        SELECT * 
        FROM \`tractian-bi.${DATASET}.${table}\`
        WHERE batch LIKE @batchPattern
      `;
      
      const [rows] = await bigquery.query({
        query,
        params: { batchPattern: `${batchPrefix}%` },
        useQueryCache: false
      });
      
      // Adiciona idColumn para cada row
      rows.forEach(row => {
        row._idColumn = idColumn;
        row._deviceId = row[idColumn];
        allRowsData.push(row);
      });
    }
    
    if (allRowsData.length === 0) {
      return res.status(404).json({ 
        error: 'No devices found',
        message: `Nenhum dispositivo encontrado para o lote ${batchPrefix}` 
      });
    }
    
    // 2. Coletar IDs que precisam de chip info
    const deviceIdsNeedingChip = [];
    allRowsData.forEach(row => {
      const deviceName = row.device_name;
      const config = DEVICE_CONFIG[deviceName];
      if (config && config.hasChipInfo) {
        deviceIdsNeedingChip.push(row._deviceId);
      }
    });
    
    // 3. Buscar TODOS os chips de uma vez (1 query)
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
    
    // 4. Montar devices usando o mapa de chips
    const allDevices = [];
    for (const row of allRowsData) {
      const deviceId = row._deviceId;
      const deviceName = row.device_name;
      const config = DEVICE_CONFIG[deviceName];
      
      if (!config) {
        console.warn(`Unknown device type: ${deviceName}`);
        continue;
      }
      
      // Buscar chip info no mapa (O(1) lookup)
      const chipInfo = chipMap.get(deviceId) || null;
      
      // Montar device
      const tests = [transformATP(row, deviceName)];
      const device = {
        id: deviceId,
        deviceType: deviceName,
        overallStatus: calculateStatus(tests),
        tests,
        chipInfo,
        batch: row.batch || undefined
      };
      
      allDevices.push(device);
    }
    
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
    let atpData = null;
    
    // Tenta cada tabela até encontrar o device
    for (const { table, idColumn } of TABLES_CONFIG) {
      const query = `
        SELECT * 
        FROM \`tractian-bi.${DATASET}.${table}\`
        WHERE ${idColumn} = @deviceId
        LIMIT 1
      `;
      
      const [rows] = await bigquery.query({
        query,
        params: { deviceId: deviceId.toUpperCase() },
        useQueryCache: false  // Desabilitado temporariamente pra dev
      });
      
      if (rows.length > 0) {
        atpData = rows[0];
        atpData.device_id = rows[0][idColumn]; // Adiciona device_id normalizado
        break;
      }
    }
    
    if (!atpData) {
      return res.status(404).json({ error: 'Device not found' });
    }
    const deviceName = atpData.device_name;
    const config = DEVICE_CONFIG[deviceName];
    
    if (!config) {
      return res.status(500).json({ 
        error: `Unknown device type: ${deviceName}`,
        availableTypes: Object.keys(DEVICE_CONFIG)
      });
    }
    
    // Busca chip info
    const chipInfo = await fetchChipInfo(atpData.device_id, config);
    
    // Monta resposta final
    const tests = [transformATP(atpData, deviceName)];
    
    // ITP e Leak ainda não implementados
    // if (config.tables.itp) tests.push(transformITP(itpData));
    // if (config.tables.leak) tests.push(transformLeak(leakData));
    
    const device = {
      id: atpData.device_id,
      deviceType: deviceName,
      overallStatus: calculateStatus(tests),
      tests,
      chipInfo,
      batch: atpData.batch || undefined
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
    parameters: params
  };
}

function transformITP(data) {
  return {
    testName: 'ITP',
    testType: 'electrical',
    status: 'approved',
    parameters: []
  };
}

function transformLeak(data) {
  return {
    testName: 'Leak Test',
    testType: 'leak',
    status: 'approved',
    parameters: []
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
