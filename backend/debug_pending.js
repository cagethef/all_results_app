const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'tractian-bi' });

const DATASET = 'operations_dbt';
const TABLE   = 'int_devices_debugging_pending';

exports.getDebuggingPending = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const query = `
      SELECT
        p.device_id,
        p.device_type,
        p.sap_code,
        p.batch_name,
        p.created_at_production,
        p.created_at_debugging,
        p.days_in_debug,
        p.hours_in_debug,
        p.fail_name,
        p.fail_type,
        p.fail_descriptor,
        p.fail_sequence,
        p.step,
        p.stage,
        CASE WHEN w.device_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_workorder,
        w.workorder_id
      FROM \`tractian-bi.${DATASET}.${TABLE}\` p
      LEFT JOIN \`tractian-bi.${DATASET}.debug_workorders_log\` w
        ON p.device_id = w.device_id
      ORDER BY p.days_in_debug DESC
    `;

    const [rows] = await bigquery.query({ query, useQueryCache: true });

    const devices = rows.map(row => ({
      device_id:            row.device_id,
      device_type:          row.device_type,
      sap_code:             row.sap_code,
      batch_name:           row.batch_name,
      created_at_production: row.created_at_production?.value ?? row.created_at_production,
      created_at_debugging: row.created_at_debugging?.value ?? row.created_at_debugging,
      days_in_debug:        row.days_in_debug,
      hours_in_debug:       row.hours_in_debug,
      fail_name:            row.fail_name,
      fail_type:            row.fail_type,
      fail_descriptor:      row.fail_descriptor,
      fail_sequence:        row.fail_sequence,
      step:                 row.step,
      stage:                row.stage,
      has_workorder:        row.has_workorder ?? false,
      workorder_id:         row.workorder_id ?? null,
    }));

    console.log(`[debugging/pending] Retornando ${devices.length} dispositivos`);
    return res.status(200).json(devices);

  } catch (error) {
    console.error('[debugging/pending] Erro:', error.message);
    return res.status(500).json({ error: 'Erro ao buscar dados', details: error.message });
  }
};
