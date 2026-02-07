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

exports.getDevice = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  const deviceId = req.query.deviceId;
  
  if (!deviceId || !/^[A-Z0-9]{5,10}$/i.test(deviceId)) {
    return res.status(400).json({ error: 'Invalid deviceId format' });
  }
  
  try {
    // Lista de tabelas pra tentar (cada uma tem nome de ID diferente)
    const tablesToTry = [
      { table: 'fct_all_results_atp_energytrac', idColumn: 'sensor_id' },
      { table: 'fct_all_results_atp_omni_receiver', idColumn: 'omni_receiver_id' },
      { table: 'fct_all_results_atp_omnitrac', idColumn: 'omnitrac_id' },
      { table: 'fct_all_results_atp_receiver', idColumn: 'receiver_id' },
      { table: 'fct_all_results_atp_unitrac', idColumn: 'unitrac_id' }
    ];
    
    const dataset = 'operations_dbt_dev'; // Usando dev por enquanto
    
    let atpData = null;
    
    // Tenta cada tabela até encontrar o device
    for (const { table, idColumn } of tablesToTry) {
      const query = `
        SELECT * 
        FROM \`tractian-bi.${dataset}.${table}\`
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
    
    // Busca outros testes e chip info em paralelo
    const testPromises = [];
    
    if (config.tables.itp) {
      // ITP ainda não existe
      testPromises.push(Promise.resolve({ type: 'itp', data: null }));
    }
    
    if (config.tables.leak) {
      // Leak ainda não existe
      testPromises.push(Promise.resolve({ type: 'leak', data: null }));
    }
    
    // Busca chip info se necessário
    if (config.hasChipInfo) {
      const chipQuery = `
        SELECT *
        FROM \`tractian-bi.${dataset}.int_devices_chip_check\`
        WHERE id = @deviceId
        LIMIT 1
      `;
      testPromises.push(
        bigquery.query({
          query: chipQuery,
          params: { deviceId: deviceId.toUpperCase() }
        }).then(([rows]) => ({ type: 'chip', data: rows[0] || null }))
          .catch(() => ({ type: 'chip', data: null }))
      );
    }
    
    const results = await Promise.all(testPromises);
    
    // Monta resposta final
    const tests = [transformATP(atpData, deviceName)];
    
    const itp = results.find(r => r.type === 'itp');
    if (itp?.data) tests.push(transformITP(itp.data));
    
    const leak = results.find(r => r.type === 'leak');
    if (leak?.data) tests.push(transformLeak(leak.data));
    
    const chipResult = results.find(r => r.type === 'chip');
    const chipInfo = chipResult?.data ? transformChipInfo(chipResult.data) : undefined;
    
    const device = {
      id: atpData.device_id,
      deviceType: deviceName,
      overallStatus: calculateStatus(tests),
      tests,
      chipInfo
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
