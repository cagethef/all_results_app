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
    
    let atpData = null;
    
    // Tenta cada tabela até encontrar o device
    for (const { table, idColumn } of tablesToTry) {
      const query = `
        SELECT * 
        FROM \`tractian-bi.operations_dbt.${table}\`
        WHERE ${idColumn} = @deviceId
        LIMIT 1
      `;
      
      const [rows] = await bigquery.query({
        query,
        params: { deviceId: deviceId.toUpperCase() },
        useQueryCache: true
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
    
    // Busca outros testes em paralelo (quando existirem)
    const testPromises = [];
    
    if (config.tables.itp) {
      // ITP ainda não existe
      testPromises.push(Promise.resolve({ type: 'itp', data: null }));
    }
    
    if (config.tables.leak) {
      // Leak ainda não existe
      testPromises.push(Promise.resolve({ type: 'leak', data: null }));
    }
    
    const results = await Promise.all(testPromises);
    
    // Monta resposta final
    const tests = [transformATP(atpData, deviceName)];
    
    const itp = results.find(r => r.type === 'itp');
    if (itp?.data) tests.push(transformITP(itp.data));
    
    const leak = results.find(r => r.type === 'leak');
    if (leak?.data) tests.push(transformLeak(leak.data));
    
    const device = {
      id: atpData.device_id,
      deviceType: deviceName,
      overallStatus: calculateStatus(tests),
      tests
      // chipInfo ignorado por enquanto
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
    { field: 'signal_ref_mean', name: 'Signal', unit: 'dBm' },
    { field: 'rms_ia_ref_mean', name: 'RMS IA', unit: 'A' },
    { field: 'rms_ib_ref_mean', name: 'RMS IB', unit: 'A' },
    { field: 'rms_ic_ref_mean', name: 'RMS IC', unit: 'A' },
    { field: 'rms_va_ref_mean', name: 'RMS VA', unit: 'V' },
    { field: 'rms_vb_ref_mean', name: 'RMS VB', unit: 'V' },
    { field: 'rms_vc_ref_mean', name: 'RMS VC', unit: 'V' },
    { field: 'modem_temp_ref_mean', name: 'Modem Temp', unit: '°C' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ],
  'Omni Receiver': [
    { field: 'signal_ref_mean', name: 'Signal', unit: 'dBm' },
    { field: 'modem_temp_ref_mean', name: 'Modem Temp', unit: '°C' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ],
  'OmniTrac': [
    { field: 'soc_temp_ref_mean', name: 'SoC Temp', unit: '°C' },
    { field: 'cpu_usage_ref_mean', name: 'CPU Usage', unit: '%' },
    { field: 'memory_usage_ref_mean', name: 'Memory Usage', unit: 'MB' },
    { field: 'disk_usage_ref_mean', name: 'Disk Usage', unit: 'MB' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ],
  'Smart Trac Ultra': [
    { field: 'sensor_signal_ref_mean', name: 'Sensor Signal', unit: 'dBm' },
    { field: 'temperature_thermistor_ref_mean', name: 'Temperature Thermistor', unit: '°C' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ],
  'Smart Receiver Ultra': [
    { field: 'sensor_signal_ref_mean', name: 'Sensor Signal', unit: 'dBm' },
    { field: 'signal_ref_mean', name: 'Signal', unit: 'dBm' },
    { field: 'modem_voltage_ref_mean', name: 'Modem Voltage', unit: 'V' },
    { field: 'modem_temp_ref_mean', name: 'Modem Temp', unit: '°C' },
    { field: 'cpu_temperature_ref_mean', name: 'CPU Temperature', unit: '°C' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ],
  'Unitrac': [
    { field: 'sensor_signal_ref_mean', name: 'Sensor Signal', unit: 'dBm' },
    { field: 'internal_temp_c_ref_mean', name: 'Internal Temp', unit: '°C' },
    { field: 'powerline_voltage_ref_mean', name: 'Powerline Voltage', unit: 'V' },
    { field: 'low_status_ref_mean', name: 'Low Status', unit: '' }
  ]
};

function transformATP(data, deviceName) {
  const fields = DEVICE_FIELDS[deviceName] || [];
  const params = [];
  
  for (const { field, name, unit } of fields) {
    if (data[field] != null) {
      params.push({
        name,
        measured: unit ? `${data[field]} ${unit}` : data[field],
        status: 'approved'
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
