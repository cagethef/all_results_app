const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'tractian-bi' });

const DEVICE_CONFIG = {
  'Energy Trac': {
    tables: { atp: 'energytrac' },
    hasChipInfo: true
  },
  'Omni Trac': {
    tables: { atp: 'omnitrac', itp: 'omnitrac' },
    hasChipInfo: false
  },
  'Smart Trac Ultra': {
    tables: { atp: 'smarttrac', leak: true },
    hasChipInfo: false
  },
  'Smart Trac Pro': {
    tables: { atp: 'smarttrac', leak: true },
    hasChipInfo: false
  },
  'Smart Trac Ultra Ex': {
    tables: { atp: 'smarttrac', leak: true },
    hasChipInfo: false
  },
  'Smart Trac Ultra Gen 2': {
    tables: { atp: 'smarttrac_ultra_gen2', itp: 'smarttrac_ultra_gen2', leak: true },
    hasChipInfo: false
  },
  'Omni Receiver': {
    tables: { atp: 'omni_receiver' },
    hasChipInfo: true
  },
  'Smart Receiver Ultra': {
    tables: { atp: 'receiver', leak: true },
    hasChipInfo: true
  },
  'Smart Receiver Pro': {
    tables: { atp: 'receiver', leak: true },
    hasChipInfo: true
  },
  'Uni Trac': {
    tables: { atp: 'unitrac', leak: true },
    hasChipInfo: false
  },
  'Oee Trac': {
    tables: { atp: 'unitrac', leak: true },
    hasChipInfo: false
  }
};

const TABLES_CONFIG = [
  // ATP tables
  { table: 'fct_all_results_atp_energytrac', idColumn: 'sensor_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_omni_receiver', idColumn: 'omni_receiver_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_omnitrac', idColumn: 'omnitrac_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_receiver', idColumn: 'receiver_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_smarttrac', idColumn: 'sensor_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_unitrac', idColumn: 'unitrac_id', testType: 'atp', dateColumn: 'test_date', batchColumn: 'batch', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_atp_smarttrac_ultra_gen2', idColumn: 'sensor_id', testType: 'atp', dateColumn: 'ingestion_ts', batchColumn: 'batch', workorderColumn: 'workorder_number' },

  // ITP tables (ITP do Omni Trac tem nomes de colunas diferentes!)
  { table: 'fct_all_results_itp_omnitrac', idColumn: 'device_id', testType: 'itp', dateColumn: 'ingestion_ts', batchColumn: 'batch_number', workorderColumn: 'workorder_number' },
  { table: 'fct_all_results_itp_smarttrac_ultra_gen2', idColumn: 'sensor_id', testType: 'itp', dateColumn: 'test_completed_at', batchColumn: 'workorder_title', workorderColumn: 'workorder_number' },

  // Leak test
  { table: 'fct_all_results_leak_test', idColumn: 'device_id', testType: 'leak', dateColumn: 'test_date', batchColumn: 'workorder_title', workorderColumn: 'workorder_number' }
];

const DATASET = 'operations_dbt';

// Formata número: |valor| < 1 → 4 casas decimais; |valor| >= 1 → 2 casas decimais
function fmt4(value) {
  if (value == null) return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return Math.abs(num) < 1 ? num.toFixed(4) : num.toFixed(2);
}

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

// Função auxiliar para limpar batch do ATP Gen 2
// Converte "#20251105_10_01_atpResults_20251218_095129" em "#20251105_10"
function cleanGen2Batch(batch) {
  if (!batch) return batch;

  // Match pattern: #YYYYMMDD_NN (mantém apenas a parte inicial)
  const match = batch.match(/^(#\d{8}_\d{2})/);
  return match ? match[1] : batch;
}

// Função auxiliar para inferir tipo do dispositivo a partir do Leak Test
function inferDeviceTypeFromLeak(leakData) {
  if (!leakData) return null;

  // type_ops é a fonte mais precisa (igual ao ATP)
  if (leakData.type_ops) {
    return leakData.type_ops;
  }

  // Fallback: usar info_device
  const info_device = leakData.info_device;
  if (!info_device) return null;

  const lower = info_device.toLowerCase();

  if (lower.includes('uni trac') || lower.includes('unitrac')) {
    return 'Uni Trac';
  }

  if (lower.includes('oee trac')) {
    return 'Oee Trac';
  }

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

// Função auxiliar para inferir tipo do dispositivo a partir do ATP
function inferDeviceTypeFromATP(data, tableName) {
  // Todas as tabelas ATP agora têm type_ops — usar como fonte principal
  let deviceType = data.type_ops || data.device_name || null;

  // Normalizar variações de nome para o padrão do DEVICE_CONFIG
  if (deviceType === 'Smart Trac Ultra Gen2') {
    deviceType = 'Smart Trac Ultra Gen 2';
  }

  console.log(`[DEBUG] Inferred from ATP (${tableName}): ${deviceType} (type_ops: ${data.type_ops}, device_name: ${data.device_name})`);
  return deviceType;
}

// Função auxiliar para inferir tipo do dispositivo a partir do ITP
function inferDeviceTypeFromITP(data, tableName) {
  console.log(`[DEBUG] inferDeviceTypeFromITP - table: ${tableName}, batch_device_type: ${data.batch_device_type}`);

  // Se for da tabela omnitrac, sempre é Omni Trac
  if (tableName === 'fct_all_results_itp_omnitrac') {
    return 'Omni Trac';
  }

  // Se for da tabela smarttrac_ultra_gen2, usar batch_device_type
  if (tableName === 'fct_all_results_itp_smarttrac_ultra_gen2') {
    let deviceType = data.batch_device_type || null;

    // Mapear variações de nome para o nome padrão
    if (deviceType === 'STU Gen 2') {
      deviceType = 'Smart Trac Ultra Gen 2';
    }

    console.log(`[DEBUG] Inferred from Gen2 ITP: ${deviceType}`);
    return deviceType;
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
      useQueryCache: true
    });

    return chipRows[0] ? transformChipInfo(chipRows[0]) : null;
  } catch (error) {
    console.error('Error fetching chip info:', error);
    return null;
  }
}

// Função auxiliar para buscar em TODAS as tabelas (ATP, ITP, Leak) em paralelo
async function searchAllTables(deviceId) {
  const promises = TABLES_CONFIG.map(async ({ table, idColumn, testType, dateColumn, batchColumn }) => {
    const query = `
      SELECT *
      FROM \`tractian-bi.${DATASET}.${table}\`
      WHERE ${idColumn} = @deviceId
      ORDER BY ${dateColumn} DESC
      LIMIT 1
    `;

    try {
      console.log(`[DEBUG] Querying ${table} with idColumn=${idColumn}, deviceId=${deviceId.toUpperCase()}`);

      const [rows] = await bigquery.query({
        query,
        params: { deviceId: deviceId.toUpperCase() },
        useQueryCache: true
      });

      if (rows.length > 0) {
        console.log(`[DEBUG] Found result in ${table}:`, {
          originalIdField: idColumn,
          originalIdValue: rows[0][idColumn],
          testType
        });

        rows[0].device_id = rows[0][idColumn]; // Normaliza device_id

        // Limpar batch: ATP Gen 2 tem sufixo longo; workorder_title tem " - Lote..." depois do número
        const batchValue = rows[0][batchColumn];
        rows[0].batch = (table === 'fct_all_results_atp_smarttrac_ultra_gen2' || batchColumn === 'workorder_title')
          ? cleanGen2Batch(batchValue) : batchValue;

        rows[0].test_date = rows[0][dateColumn]; // Normaliza test_date
        rows[0]._testType = testType; // Adiciona tipo do teste
        rows[0]._tableName = table; // Adiciona nome da tabela
        return rows[0];
      }
      console.log(`[DEBUG] No results in ${table}`);
      return null;
    } catch (error) {
      console.error(`Error searching table ${table}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const filtered = results.filter(result => result !== null);
  console.log(`[DEBUG] Total results found: ${filtered.length}`, filtered.map(r => ({ table: r._tableName, type: r._testType })));
  return filtered;
}

// Função para buscar dispositivos por lote
async function getDevicesByBatch(batchPrefix, res) {
  try {
    // 1. Buscar em TODAS as tabelas (ATP, ITP, Leak) em paralelo
    const promises = TABLES_CONFIG.map(async ({ table, idColumn, testType, dateColumn, batchColumn }) => {
      const query = `
        SELECT * EXCEPT(row_num)
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY ${idColumn} ORDER BY ${dateColumn} DESC) as row_num
          FROM \`tractian-bi.${DATASET}.${table}\`
          WHERE ${batchColumn} LIKE @batchPattern
        )
        WHERE row_num = 1
      `;

      try {
        const [rows] = await bigquery.query({
          query,
          params: { batchPattern: `%${batchPrefix}%` },
          useQueryCache: true
        });

        // Adiciona metadados para cada row
        rows.forEach(row => {
          row.device_id = row[idColumn]; // Normaliza device_id

          // Limpar batch: ATP Gen 2 tem sufixo longo; workorder_title tem " - Lote..." depois do número
          const batchValue = row[batchColumn];
          row.batch = (table === 'fct_all_results_atp_smarttrac_ultra_gen2' || batchColumn === 'workorder_title')
            ? cleanGen2Batch(batchValue) : batchValue;

          row.test_date = row[dateColumn]; // Normaliza test_date
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

    // Verificar se há múltiplas workorders no lote (desambiguação)
    const workorderDeviceMap = new Map(); // workorder_number -> { deviceIds: Set, title: string|null }
    allRows.forEach(row => {
      const workorderNum = row.workorder_number;
      if (workorderNum != null) {
        if (!workorderDeviceMap.has(workorderNum)) {
          workorderDeviceMap.set(workorderNum, { deviceIds: new Set(), title: row.workorder_title || null });
        }
        workorderDeviceMap.get(workorderNum).deviceIds.add(row.device_id);
      }
    });

    if (workorderDeviceMap.size > 1) {
      const workorders = Array.from(workorderDeviceMap.entries())
        .map(([number, { deviceIds, title }]) => ({ number, title, count: deviceIds.size }))
        .sort((a, b) => a.number - b.number);

      return res.json({
        needsDisambiguation: true,
        batch: batchPrefix,
        workorders
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

      // Adicionar teste ao dispositivo (SEM determinar deviceName ainda)
      if (testType === 'atp') {
        device.atpData = row;
      } else if (testType === 'itp') {
        device.itpData = row;
      } else if (testType === 'leak') {
        device.leakData = row;
      }
    });

    // Determinar deviceName para cada dispositivo após coletar TODOS os testes
    deviceMap.forEach((device, deviceId) => {
      if (device.atpData) {
        // Prioridade 1: usar device_name/type_ops do ATP
        device.deviceName = inferDeviceTypeFromATP(device.atpData, device.atpData._tableName);
      } else if (device.itpData) {
        // Prioridade 2: usar ITP (independente se tem Leak ou não)
        // Se tem ITP de Gen 2 + Leak → será "Smart Trac Ultra Gen 2"
        // Se tem ITP de Omnitrac → será "Omni Trac"
        device.deviceName = inferDeviceTypeFromITP(device.itpData, device.itpData._tableName);
      } else if (device.leakData) {
        // Prioridade 3: usar Leak (só se não tem ATP nem ITP)
        device.deviceName = inferDeviceTypeFromLeak(device.leakData);
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
          useQueryCache: true
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
          const itpTableName = `fct_all_results_itp_${config.tables.itp}`;
          tests.push(transformITP(itpData, itpTableName));
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

// Função para buscar dispositivos por workorder
async function getDevicesByWorkorder(workorderNumber, res) {
  try {
    // 1. Buscar em TODAS as tabelas em paralelo usando workorder_number (INTEGER exact match)
    const promises = TABLES_CONFIG
      .filter(cfg => cfg.workorderColumn)
      .map(async ({ table, idColumn, testType, dateColumn, batchColumn, workorderColumn }) => {
        const query = `
          SELECT * EXCEPT(row_num)
          FROM (
            SELECT *,
              ROW_NUMBER() OVER (PARTITION BY ${idColumn} ORDER BY ${dateColumn} DESC) as row_num
            FROM \`tractian-bi.${DATASET}.${table}\`
            WHERE ${workorderColumn} = @workorderNumber
          )
          WHERE row_num = 1
        `;

        try {
          const [rows] = await bigquery.query({
            query,
            params: { workorderNumber },
            useQueryCache: true
          });

          rows.forEach(row => {
            row.device_id = row[idColumn];

            const batchValue = row[batchColumn];
            row.batch = (table === 'fct_all_results_atp_smarttrac_ultra_gen2' || batchColumn === 'workorder_title')
              ? cleanGen2Batch(batchValue) : batchValue;

            row.test_date = row[dateColumn];
            row._testType = testType;
            row._tableName = table;
          });

          return rows;
        } catch (error) {
          console.error(`Error searching workorder in ${table}:`, error);
          return [];
        }
      });

    const allResults = await Promise.all(promises);
    const allRows = allResults.flat();

    if (allRows.length === 0) {
      return res.status(404).json({
        error: 'No devices found',
        message: `Nenhum dispositivo encontrado para a workorder ${workorderNumber}`
      });
    }

    // 2. Agregar dispositivos por device_id (mesma lógica do getDevicesByBatch)
    const deviceMap = new Map();

    allRows.forEach(row => {
      const deviceId = row.device_id;
      const testType = row._testType;

      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, { atpData: null, itpData: null, leakData: null, deviceName: null, batch: row.batch });
      }

      const device = deviceMap.get(deviceId);
      if (testType === 'atp') device.atpData = row;
      else if (testType === 'itp') device.itpData = row;
      else if (testType === 'leak') device.leakData = row;
    });

    deviceMap.forEach((device) => {
      if (device.atpData) {
        device.deviceName = inferDeviceTypeFromATP(device.atpData, device.atpData._tableName);
      } else if (device.itpData) {
        device.deviceName = inferDeviceTypeFromITP(device.itpData, device.itpData._tableName);
      } else if (device.leakData) {
        device.deviceName = inferDeviceTypeFromLeak(device.leakData);
      }
    });

    // 3. Chip info batch lookup
    const deviceIdsNeedingChip = [];
    deviceMap.forEach((data, deviceId) => {
      if (!data.deviceName) return;
      const config = DEVICE_CONFIG[data.deviceName];
      if (config && config.hasChipInfo) deviceIdsNeedingChip.push(deviceId);
    });

    let chipMap = new Map();
    if (deviceIdsNeedingChip.length > 0) {
      try {
        const [chipRows] = await bigquery.query({
          query: `SELECT * FROM \`tractian-bi.${DATASET}.int_devices_chip_check\` WHERE id IN UNNEST(@deviceIds)`,
          params: { deviceIds: deviceIdsNeedingChip },
          useQueryCache: true
        });
        chipRows.forEach(chipRow => chipMap.set(chipRow.id, transformChipInfo(chipRow)));
      } catch (error) {
        console.error('Error fetching chip info batch (workorder):', error);
      }
    }

    // 4. Montar devices
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

      const chipInfo = chipMap.get(deviceId) || null;
      const tests = [];

      if (atpData) {
        tests.push(transformATP(atpData, deviceName));
      } else if (config.tables.atp) {
        tests.push({ testName: 'ATP', testType: 'electrical', status: 'pending', parameters: [] });
      }

      if (config.tables.itp) {
        if (itpData) {
          tests.push(transformITP(itpData, `fct_all_results_itp_${config.tables.itp}`));
        } else {
          tests.push({ testName: 'ITP', testType: 'electrical', status: 'pending', parameters: [] });
        }
      }

      if (config.tables.leak) {
        if (leakData) {
          tests.push(transformLeak(leakData));
        } else {
          tests.push({ testName: 'Leak Test', testType: 'leak', status: 'pending', parameters: [] });
        }
      }

      allDevices.push({
        id: deviceId,
        deviceType: deviceName,
        overallStatus: calculateStatus(tests),
        tests,
        chipInfo,
        batch: batch || undefined
      });
    });

    return res.json({
      workorder: workorderNumber,
      count: allDevices.length,
      devices: allDevices
    });

  } catch (error) {
    console.error('Error in getDevicesByWorkorder:', error);
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

  // Detectar se é uma workorder (formato: #XXXXX — exatamente 5 dígitos)
  const workorderPattern = /^#(\d{5})$/;
  const workorderMatch = input.match(workorderPattern);

  if (workorderMatch) {
    const workorderNumber = parseInt(workorderMatch[1], 10);
    return await getDevicesByWorkorder(workorderNumber, res);
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

    // 4. Determinar tipo do dispositivo considerando TODAS as fontes disponíveis
    let deviceName = null;
    let deviceIdNormalized = null;
    let batch = null;

    console.log(`[DEBUG] Device ${deviceId} - Found tests:`, {
      hasATP: !!atpData,
      hasITP: !!itpData,
      hasLeak: !!leakData,
      itpTable: itpData?._tableName
    });

    if (atpData) {
      // Prioridade 1: usar device_name/type_ops do ATP
      deviceName = inferDeviceTypeFromATP(atpData, atpData._tableName);
      deviceIdNormalized = atpData.device_id;
      batch = atpData.batch;
      console.log(`[DEBUG] Using ATP for device type: ${deviceName}`);
    } else if (itpData) {
      // Prioridade 2: usar ITP (independente se tem Leak ou não)
      // Se tem ITP de Gen 2 + Leak → será "Smart Trac Ultra Gen 2"
      // Se tem ITP de Omnitrac → será "Omni Trac"
      deviceName = inferDeviceTypeFromITP(itpData, itpData._tableName);
      deviceIdNormalized = itpData.device_id;
      batch = itpData.batch;
      console.log(`[DEBUG] Using ITP for device type: ${deviceName}`);

      if (!deviceName) {
        return res.status(500).json({
          error: 'Could not determine device type',
          message: `Found ITP but could not infer device type from table: ${itpData._tableName}`
        });
      }
    } else if (leakData) {
      // Prioridade 3: usar Leak (só se não tem ATP nem ITP)
      deviceName = inferDeviceTypeFromLeak(leakData);
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
        const itpTableName = `fct_all_results_itp_${config.tables.itp}`;
        tests.push(transformITP(itpData, itpTableName));
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
  'Energy Trac': [
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
  'Omni Trac': [
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
  'Smart Trac Pro': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'temperature_thermistor', name: 'Temperature Thermistor', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Smart Trac Ultra Ex': [
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
  'Smart Receiver Pro': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'signal', name: 'Signal', unit: 'dBm' },
    { prefix: 'modem_voltage', name: 'Modem Voltage', unit: 'V' },
    { prefix: 'modem_temp', name: 'Modem Temp', unit: '°C' },
    { prefix: 'cpu_temperature', name: 'CPU Temperature', unit: '°C' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Uni Trac': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'internal_temp_c', name: 'Internal Temp', unit: '°C' },
    { prefix: 'powerline_voltage', name: 'Powerline Voltage', unit: 'V' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ],
  'Oee Trac': [
    { prefix: 'sensor_signal', name: 'Sensor Signal', unit: 'dBm' },
    { prefix: 'internal_temp_c', name: 'Internal Temp', unit: '°C' },
    { prefix: 'powerline_voltage', name: 'Powerline Voltage', unit: 'V' },
    { prefix: 'low_status', name: 'Low Status', unit: '' }
  ]
};

function transformATP(data, deviceName) {
  // Se for ATP Gen 2, usar função específica
  if (data._tableName === 'fct_all_results_atp_smarttrac_ultra_gen2') {
    return transformATP_Gen2(data);
  }

  // Para outros ATPs, usar DEVICE_FIELDS
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

/**
 * Transform ATP data for Smart Trac Ultra Gen 2
 */
function transformATP_Gen2(data) {
  const params = [];

  // Temperature
  if (data.dut_temp != null) {
    params.push({
      name: 'Temperature',
      measured: `${data.dut_temp} °C`,
      expected: data.reference_temp != null ? `${data.reference_temp} °C` : undefined,
      status: data.temperature_check_passed ? 'approved' : 'failed',
      parameterType: 'temperature'
    });
  }

  // Signal
  if (data.dut_signal != null) {
    params.push({
      name: 'Signal',
      measured: `${data.dut_signal} dB`,
      expected: data.reference_signal != null ? `${data.reference_signal} dB` : undefined,
      status: data.signal_check_passed ? 'approved' : 'failed',
      parameterType: 'signal'
    });
  }

  // Status Count
  if (data.dut_status_count != null) {
    params.push({
      name: 'Status Count',
      measured: `${data.dut_status_count}`,
      expected: data.reference_status_count != null ? `${data.reference_status_count}` : undefined,
      status: data.status_count_check_passed ? 'approved' : 'failed',
      parameterType: 'system'
    });
  }

  // Error Check
  if (data.error_check_passed != null) {
    params.push({
      name: 'Error Check',
      measured: data.error_check_passed ? 'PASS' : 'FAIL',
      status: data.error_check_passed ? 'approved' : 'failed',
      parameterType: 'system'
    });
  }

  // Zero Signal Check
  if (data.zero_signal_check_passed != null) {
    params.push({
      name: 'Zero Signal Check',
      measured: data.zero_signal_check_passed ? 'PASS' : 'FAIL',
      status: data.zero_signal_check_passed ? 'approved' : 'failed',
      parameterType: 'system'
    });
  }

  // References List (se disponível)
  if (data.references_list) {
    params.push({
      name: 'References Used',
      measured: data.references_list,
      status: 'approved',
      parameterType: 'info'
    });
  }

  return {
    testName: 'ATP',
    testType: 'electrical',
    status: data.overall_result === 'PASS' ? 'approved' : 'failed',
    date: parseTestDate(data.test_date),
    parameters: params
  };
}

function transformITP(data, tableName) {
  // Detectar qual ITP baseado na tabela
  if (tableName === 'fct_all_results_itp_omnitrac') {
    return transformITP_OmniTrac(data);
  }
  
  if (tableName === 'fct_all_results_itp_smarttrac_ultra_gen2') {
    return transformITP_SmartTracGen2(data);
  }
  
  // Fallback (caso não reconheça a tabela)
  return {
    testName: 'ITP',
    testType: 'electrical',
    status: 'pending',
    date: parseTestDate(data.test_date),
    parameters: []
  };
}

/**
 * Transform ITP data for Omni Trac (26 tests organized in 4 sections)
 */
function transformITP_OmniTrac(data) {
  // Section 1: Power & System (6 tests)
  const powerSystemParams = [
    {
      name: 'Power Enables',
      measured: data.power_enables_status ? 'OK' : 'FAIL',
      status: data.power_enables_status ? 'approved' : 'failed',
      parameterType: 'electrical'
    },
    {
      name: 'Power Good Lines',
      measured: data.power_good_lines_status ? 'OK' : 'FAIL',
      status: data.power_good_lines_status ? 'approved' : 'failed',
      parameterType: 'electrical'
    },
    {
      name: 'SoC Temperature',
      measured: data.soc_temp_value != null ? `${data.soc_temp_value} °C` : 'N/A',
      status: data.soc_temp_status ? 'approved' : 'failed',
      parameterType: 'temperature'
    },
    {
      name: 'GPU Temperature',
      measured: data.gpu_temp_value != null ? `${data.gpu_temp_value} °C` : 'N/A',
      status: data.gpu_temp_status ? 'approved' : 'failed',
      parameterType: 'temperature'
    },
    {
      name: 'CPU Usage',
      measured: data.cpu_usage_value != null ? `${data.cpu_usage_value} %` : 'N/A',
      status: data.cpu_usage_status ? 'approved' : 'failed',
      parameterType: 'system'
    },
    {
      name: 'Memory Usage',
      measured: data.memory_usage_value != null ? `${data.memory_usage_value} MB` : 'N/A',
      status: data.memory_usage_status ? 'approved' : 'failed',
      parameterType: 'system'
    }
  ];

  // Section 2: Electrical (6 tests)
  const electricalParams = [
    {
      name: 'Front Panel 24V',
      measured: data.frontpanel_bus_24v_value != null ? `${data.frontpanel_bus_24v_value} mV` : 'N/A',
      status: data.frontpanel_bus_24v_status ? 'approved' : 'failed',
      parameterType: 'voltage'
    },
    {
      name: 'Front Panel 5V',
      measured: data.frontpanel_bus_5v_value != null ? `${data.frontpanel_bus_5v_value} mV` : 'N/A',
      status: data.frontpanel_bus_5v_status ? 'approved' : 'failed',
      parameterType: 'voltage'
    },
    {
      name: 'System 24V',
      measured: data.sys_24v_value != null ? `${data.sys_24v_value} mV` : 'N/A',
      status: data.sys_24v_status ? 'approved' : 'failed',
      parameterType: 'voltage'
    },
    {
      name: 'System 5V',
      measured: data.sys_5v_value != null ? `${data.sys_5v_value} mV` : 'N/A',
      status: data.sys_5v_status ? 'approved' : 'failed',
      parameterType: 'voltage'
    },
    {
      name: 'Fuse 24V Monitor',
      measured: data.fuse24v_aux_imon_value != null ? `${data.fuse24v_aux_imon_value} A` : 'N/A',
      status: data.fuse24v_aux_imon_status ? 'approved' : 'failed',
      parameterType: 'current'
    },
    {
      name: 'Fuse 5V Monitor',
      measured: data.fuse5v_aux_imon_value != null ? `${data.fuse5v_aux_imon_value} A` : 'N/A',
      status: data.fuse5v_aux_imon_status ? 'approved' : 'failed',
      parameterType: 'current'
    }
  ];

  // Section 3: Communication (9 tests)
  const communicationParams = [
    {
      name: 'USB Check Match',
      measured: data.usb_check_match_status ? 'OK' : 'FAIL',
      status: data.usb_check_match_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'Ethernet MAC',
      measured: data.eth0_mac_value || 'N/A',
      status: data.eth0_mac_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'iPerf Ethernet',
      measured: data.iperf_eth_value != null ? `${data.iperf_eth_value} Mbps` : 'N/A',
      status: data.iperf_eth_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'iPerf OTG',
      measured: data.iperf_otg_error || 'OK',
      status: data.iperf_otg_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'RS485 Full Duplex',
      measured: data.rs485_fd_value || 'N/A',
      status: data.rs485_fd_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'RS485 Half Duplex',
      measured: data.rs485_hd_value != null ? `${data.rs485_hd_value}` : 'N/A',
      status: data.rs485_hd_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'RS232',
      measured: data.rs232_value || 'N/A',
      status: data.rs232_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'OT485 FD Master',
      measured: data.ot485_fd_master_value || 'N/A',
      status: data.ot485_fd_master_status ? 'approved' : 'failed',
      parameterType: 'network'
    },
    {
      name: 'OT485 FD Slave',
      measured: data.ot485_fd_slave_value || 'N/A',
      status: data.ot485_fd_slave_status ? 'approved' : 'failed',
      parameterType: 'network'
    }
  ];

  // Section 4: Storage & External (5 tests)
  const storageExternalParams = [
    {
      name: 'MMC CID',
      measured: data.mmc_cid_value || 'N/A',
      status: data.mmc_cid_status ? 'approved' : 'failed',
      parameterType: 'storage'
    },
    {
      name: 'EEPROM',
      measured: data.eeprom_value || 'N/A',
      status: data.eeprom_status ? 'approved' : 'failed',
      parameterType: 'storage'
    },
    {
      name: 'RTC PCF',
      measured: data.rtc_pcf_value || 'N/A',
      status: data.rtc_pcf_status ? 'approved' : 'failed',
      parameterType: 'system'
    },
    {
      name: 'External ID Test',
      measured: data.external_id_test_value || 'N/A',
      status: data.external_id_test_status ? 'approved' : 'failed',
      parameterType: 'system'
    },
    {
      name: 'Controller Timestamp',
      measured: data.controller_timestamp_value || 'N/A',
      status: data.controller_timestamp_status ? 'approved' : 'failed',
      parameterType: 'system'
    }
  ];

  // Calcular status geral (se algum falhou, ITP falhou)
  const allParams = [...powerSystemParams, ...electricalParams, ...communicationParams, ...storageExternalParams];
  const hasFailed = allParams.some(p => p.status === 'failed');
  const overallStatus = hasFailed ? 'failed' : 'approved';

  return {
    testName: 'ITP',
    testType: 'electrical',
    status: overallStatus,
    date: parseTestDate(data.test_date),
    sections: [
      {
        name: 'Power & System',
        parameters: powerSystemParams
      },
      {
        name: 'Electrical',
        parameters: electricalParams
      },
      {
        name: 'Communication',
        parameters: communicationParams
      },
      {
        name: 'Storage & External',
        parameters: storageExternalParams
      }
    ]
  };
}

/**
 * Transform ITP data for Smart Trac Ultra Gen 2 (12 provisioning steps)
 */
function transformITP_SmartTracGen2(data) {
  // Helper function para converter status string para TestStatus
  const getStatus = (statusStr) => {
    if (!statusStr) return 'pending';
    const upper = String(statusStr).toUpperCase();
    if (upper === 'PASSED' || upper === 'PASS' || upper === 'OK' || upper === 'SUCCESS' || upper === 'APPROVED') return 'approved';
    if (upper === 'FAILED' || upper === 'FAIL') return 'failed';
    return 'pending';
  };

  // Section 1: Setup & Discovery (Steps 1-3)
  const setupParams = [
    {
      name: 'Step 1: Initialization',
      measured: getStatus(data.step1_status) === 'approved' ? 'OK' : 'FAIL',
      status: getStatus(data.step1_status),
      parameterType: 'system'
    },
    {
      name: 'Step 2: External ID',
      measured: data.step2_external_id_read || 'N/A',
      expected: data.step2_external_id_expected || undefined,
      status: data.step2_valid ? 'approved' : 'failed',
      parameterType: 'system'
    },
    {
      name: 'Step 3: BLE Discovery',
      measured: data.step3_device_name || data.step3_device_address || 'N/A',
      status: getStatus(data.step3_status),
      parameterType: 'network'
    }
  ];

  // Section 2: Components & Sensors (Steps 4-6)
  const componentsParams = [
    {
      name: 'Step 4: Components Check',
      measured: data.step4_components_ok != null && data.step4_components_total != null
        ? `${data.step4_components_ok}/${data.step4_components_total}`
        : 'N/A',
      status: getStatus(data.step4_status),
      parameterType: 'system'
    },
    {
      name: 'Step 5: Humidity',
      measured: data.step5_humidity_value != null ? `${fmt4(data.step5_humidity_value)} %` : 'N/A',
      expected: data.step5_humidity_expected != null ? `${fmt4(data.step5_humidity_expected)} %${data.step5_humidity_tolerance ? ` (${data.step5_humidity_tolerance})` : ''}` : undefined,
      status: data.step5_humidity_passed ? 'approved' : 'failed',
      parameterType: 'humidity'
    },
    {
      name: 'Step 5: Temperature',
      measured: data.step5_temp_value != null ? `${fmt4(data.step5_temp_value)} °C` : 'N/A',
      expected: data.step5_temp_expected != null ? `${fmt4(data.step5_temp_expected)} °C${data.step5_temp_tolerance ? ` (${data.step5_temp_tolerance})` : ''}` : undefined,
      status: data.step5_temp_passed ? 'approved' : 'failed',
      parameterType: 'temperature'
    },
    {
      name: 'Step 5: MCU Temperature',
      measured: data.step5_mcu_temp_value != null ? `${fmt4(data.step5_mcu_temp_value)} °C` : 'N/A',
      expected: data.step5_mcu_temp_expected != null ? `${fmt4(data.step5_mcu_temp_expected)} °C${data.step5_mcu_temp_tolerance ? ` (${data.step5_mcu_temp_tolerance})` : ''}` : undefined,
      status: data.step5_mcu_temp_passed ? 'approved' : 'failed',
      parameterType: 'temperature'
    },
    {
      name: 'Step 6: SAS Available',
      measured: data.step6_sas_available ? 'Yes' : 'No',
      status: getStatus(data.step6_status),
      parameterType: 'system'
    }
  ];

  // Section 3: Vibration Tests (Steps 7-12)
  const vibrationParams = [];

  // Step 7: Vibration (XYZ)
  if (data.step7_status) {
    vibrationParams.push({
      name: 'Step 7: RMS (X/Y/Z)',
      measured: `${data.step7_rms_x != null ? fmt4(data.step7_rms_x) : 'N/A'} / ${data.step7_rms_y != null ? fmt4(data.step7_rms_y) : 'N/A'} / ${data.step7_rms_z != null ? fmt4(data.step7_rms_z) : 'N/A'}`,
      expected: data.step7_val_rms_x_expected != null ? `${fmt4(data.step7_val_rms_x_expected)} / ${data.step7_val_rms_y_expected != null ? fmt4(data.step7_val_rms_y_expected) : 'N/A'} / ${data.step7_val_rms_z_expected != null ? fmt4(data.step7_val_rms_z_expected) : 'N/A'}` : undefined,
      status: getStatus(data.step7_validation_overall || data.step7_status),
      parameterType: 'vibration'
    });
  }

  // Step 8: Vibration (XYZ)
  if (data.step8_status) {
    vibrationParams.push({
      name: 'Step 8: RMS (X/Y/Z)',
      measured: `${data.step8_rms_x != null ? fmt4(data.step8_rms_x) : 'N/A'} / ${data.step8_rms_y != null ? fmt4(data.step8_rms_y) : 'N/A'} / ${data.step8_rms_z != null ? fmt4(data.step8_rms_z) : 'N/A'}`,
      expected: data.step8_val_rms_x_expected != null ? `${fmt4(data.step8_val_rms_x_expected)} / ${data.step8_val_rms_y_expected != null ? fmt4(data.step8_val_rms_y_expected) : 'N/A'} / ${data.step8_val_rms_z_expected != null ? fmt4(data.step8_val_rms_z_expected) : 'N/A'}` : undefined,
      status: getStatus(data.step8_validation_overall || data.step8_status),
      parameterType: 'vibration'
    });
  }

  // Step 9: Vibration
  if (data.step9_status) {
    vibrationParams.push({
      name: 'Step 9: RMS',
      measured: data.step9_rms != null ? `${fmt4(data.step9_rms)}` : 'N/A',
      expected: data.step9_val_rms_expected != null ? `${fmt4(data.step9_val_rms_expected)}${data.step9_val_rms_tolerance ? ` (${data.step9_val_rms_tolerance})` : ''}` : undefined,
      status: getStatus(data.step9_validation_overall || data.step9_status),
      parameterType: 'vibration'
    });
  }

  // Step 10: Vibration (XYZ + FRF Score)
  if (data.step10_status) {
    vibrationParams.push({
      name: 'Step 10: RMS (X/Y/Z)',
      measured: `${data.step10_rms_x != null ? fmt4(data.step10_rms_x) : 'N/A'} / ${data.step10_rms_y != null ? fmt4(data.step10_rms_y) : 'N/A'} / ${data.step10_rms_z != null ? fmt4(data.step10_rms_z) : 'N/A'}`,
      expected: data.step10_val_rms_x_expected != null ? `${fmt4(data.step10_val_rms_x_expected)} / ${data.step10_val_rms_y_expected != null ? fmt4(data.step10_val_rms_y_expected) : 'N/A'} / ${data.step10_val_rms_z_expected != null ? fmt4(data.step10_val_rms_z_expected) : 'N/A'}` : undefined,
      status: getStatus(data.step10_validation_overall || data.step10_status),
      parameterType: 'vibration'
    });
    if (data.step10_frf_score != null) {
      vibrationParams.push({
        name: 'Step 10: FRF Score',
        measured: `${fmt4(data.step10_frf_score)}`,
        expected: data.step10_val_frf_expected != null ? `${fmt4(data.step10_val_frf_expected)}${data.step10_val_frf_tolerance ? ` (${data.step10_val_frf_tolerance})` : ''}` : undefined,
        status: getStatus(data.step10_validation_overall || data.step10_status),
        parameterType: 'vibration'
      });
    }
  }

  // Step 11: Vibration (XYZ)
  if (data.step11_status) {
    vibrationParams.push({
      name: 'Step 11: RMS (X/Y/Z)',
      measured: `${data.step11_rms_x != null ? fmt4(data.step11_rms_x) : 'N/A'} / ${data.step11_rms_y != null ? fmt4(data.step11_rms_y) : 'N/A'} / ${data.step11_rms_z != null ? fmt4(data.step11_rms_z) : 'N/A'}`,
      expected: data.step11_val_rms_x_expected != null ? `${fmt4(data.step11_val_rms_x_expected)} / ${data.step11_val_rms_y_expected != null ? fmt4(data.step11_val_rms_y_expected) : 'N/A'} / ${data.step11_val_rms_z_expected != null ? fmt4(data.step11_val_rms_z_expected) : 'N/A'}` : undefined,
      status: getStatus(data.step11_validation_overall || data.step11_status),
      parameterType: 'vibration'
    });
  }

  // Step 12: Vibration
  if (data.step12_status) {
    vibrationParams.push({
      name: 'Step 12: RMS',
      measured: data.step12_rms != null ? `${fmt4(data.step12_rms)}` : 'N/A',
      expected: data.step12_val_rms_expected != null ? `${fmt4(data.step12_val_rms_expected)}${data.step12_val_rms_tolerance ? ` (${data.step12_val_rms_tolerance})` : ''}` : undefined,
      status: getStatus(data.step12_validation_overall || data.step12_status),
      parameterType: 'vibration'
    });
  }

  // Calcular status geral
  const allParams = [...setupParams, ...componentsParams, ...vibrationParams];
  const hasFailed = allParams.some(p => p.status === 'failed');
  const finalResultStatus = data.final_result ? getStatus(data.final_result) : 'pending';
  // Steps têm prioridade: se algum falhou, o ITP falhou — independente do final_result
  const overallStatus = hasFailed ? 'failed' : finalResultStatus === 'approved' ? 'approved' : 'pending';

  return {
    testName: 'ITP',
    testType: 'electrical',
    status: overallStatus,
    date: parseTestDate(data.test_completed_at),
    sections: [
      {
        name: 'Setup & Discovery',
        parameters: setupParams
      },
      {
        name: 'Components & Sensors',
        parameters: componentsParams
      },
      {
        name: 'Vibration Tests',
        parameters: vibrationParams
      }
    ]
  };
}

function transformLeak(data) {
  // Aba 1: Leak Test (valores medidos)
  const leakTestParams = [
    {
      name: 'Drop',
      measured: `${fmt4(data.test_drop)} Pa/min`,
      status: data.result_drop_pass ? 'approved' : 'failed'
    },
    {
      name: 'Slope',
      measured: `${fmt4(data.test_slope)}`,
      status: data.result_slope_pass ? 'approved' : 'failed'
    },
    {
      name: 'R² (Fit Quality)',
      measured: `${fmt4(data.test_r2)}`,
      status: data.result_r2_pass ? 'approved' : 'failed'
    }
  ];

  // Helper: converte BigQuery DATE (objeto ou string "YYYY-MM-DD") para "DD/MM/YYYY"
  function formatCalibDate(raw) {
    if (!raw) return 'N/A';
    const str = (typeof raw === 'object' && raw.value) ? raw.value : String(raw);
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
  }

  // Helper: converte decimal para percentual (0.05 → "±5%")
  function fmtPct(value) {
    if (value == null) return 'N/A';
    const pct = parseFloat((parseFloat(value) * 100).toFixed(2));
    return `±${pct}%`;
  }

  // Aba 2: Calibração (dados de referência)
  const calibrationParams = [
    {
      name: 'ID da Jiga',
      measured: data.jig_id || 'N/A',
      status: 'approved'
    },
    {
      name: 'Última Calibração',
      measured: formatCalibDate(data.calib_last_calib),
      status: 'approved'
    },
    {
      name: 'Drop de Referência',
      measured: `${fmt4(data.calib_mean_drop)} Pa/min`,
      status: 'approved'
    },
    {
      name: 'Variação Drop',
      measured: fmtPct(data.calib_error_drop),
      status: 'approved'
    },
    {
      name: 'Slope de Referência',
      measured: `${fmt4(data.calib_mean_slope)}`,
      status: 'approved'
    },
    {
      name: 'Variação Slope',
      measured: fmtPct(data.calib_error_slope),
      status: 'approved'
    },
    {
      name: 'R² de Referência',
      measured: `${fmt4(data.calib_mean_fit_qual)}`,
      status: 'approved'
    },
    {
      name: 'Variação R²',
      measured: fmtPct(data.calib_error_fit_qual),
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
