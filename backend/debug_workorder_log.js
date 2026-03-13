const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'tractian-bi' });

const DATASET = 'operations_dbt';
const TABLE   = 'debug_workorders_log';

exports.manageWorkorderLog = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');

  // POST → insere registro (marca WO como criada)
  if (req.method === 'POST') {
    const { device_id, workorder_id } = req.body ?? {};
    if (!device_id) return res.status(400).json({ error: 'device_id obrigatório' });

    try {
      const query = `
        INSERT INTO \`tractian-bi.${DATASET}.${TABLE}\`
          (device_id, workorder_id, created_at)
        VALUES
          (@device_id, @workorder_id, CURRENT_TIMESTAMP())
      `;
      await bigquery.query({
        query,
        params: { device_id, workorder_id: workorder_id ?? null },
      });
      console.log(`[workorder-log] Inserido device_id=${device_id}`);
      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error('[workorder-log] Erro ao inserir:', error.message);
      return res.status(500).json({ error: 'Erro ao inserir registro', details: error.message });
    }
  }

  // DELETE → remove registro (desfaz marcação de WO)
  if (req.method === 'DELETE') {
    const { device_id } = req.body ?? {};
    if (!device_id) return res.status(400).json({ error: 'device_id obrigatório' });

    try {
      const query = `
        DELETE FROM \`tractian-bi.${DATASET}.${TABLE}\`
        WHERE device_id = @device_id
      `;
      await bigquery.query({ query, params: { device_id } });
      console.log(`[workorder-log] Removido device_id=${device_id}`);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[workorder-log] Erro ao remover:', error.message);
      return res.status(500).json({ error: 'Erro ao remover registro', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
