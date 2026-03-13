const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const bigquery     = new BigQuery({ projectId: 'tractian-bi' });
const secretClient = new SecretManagerServiceClient();

const PROJECT_ID  = 'tractian-bi';
const SECRET_NAME = 'tractian_access_token';
const DATASET     = 'operations_dbt';
const LOG_TABLE   = 'debug_workorders_log';

const MOTOR_BASE_URL  = 'https://motor-v3.tractian.com/v2';
const TRACTIAN_WO_URL = 'https://api.tractian.com/bifrost/v2/workorders'
  + '?operationsProxy%5BloadWorkOrderTimers%5D=true'
  + '&operationsProxy%5BloadWorkOrderOperations%5D=true'
  + '&operationsProxy%5BloadCalendarSchedules%5D=true'
  + '&operationsProxy%5BloadWorkOrderOperationCalendarSchedules%5D=true'
  + '&operationsProxy%5BloadWorkOrderOperationCalendarScheduleParticipants%5D=true'
  + '&operationsProxy%5BloadDisabledCategories%5D=true'
  + '&operationsProxy%5BloadWorkOrderOperationInventories%5D=true'
  + '&operationsProxy%5BloadWorkOrderOperationProcedures%5D=true'
  + '&operationsProxy%5BloadWorkOrderExecutants%5D=true'
  + '&operationsProxy%5BloadWorkOrderProcedures%5D=true';

const COMPANY_ID        = '61702662e5f4b108e3f8cee3';
const TEAM_ID           = '645d542b82e8d6001f522b6c';
const LOCATION_ID       = '65a816bb0b8b2d001e028b15';
const ON_HOLD_REASON_ID = '64a33d9075ce0a001ecd5285';

// Token cache para evitar chamadas repetidas ao Secret Manager
let _cachedToken = null;
let _cachedTokenExp = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && _cachedTokenExp > now + 300) return _cachedToken;

  const name = `projects/${PROJECT_ID}/secrets/${SECRET_NAME}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  const token = version.payload.data.toString('utf8').trim();

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    _cachedTokenExp = payload.exp ?? now + 3600;
  } catch {
    _cachedTokenExp = now + 3600;
  }

  _cachedToken = token;
  return token;
}

// Normaliza valores do BigQuery para bater com as opções do select no Tractian
const DEVICE_TYPE_NORMALIZE = {
  'smart trac ultra gen2':     'Smart Trac Ultra Gen 2',
  'smart trac ultra gen 2':    'Smart Trac Ultra Gen 2',
  'stu gen 2':                 'Smart Trac Ultra Gen 2',
  'smart trac ultra ex':       'Smart Trac Ultra Ex',
  'smart trac ultra':          'Smart Trac Ultra',
  'stu':                       'Smart Trac Ultra',
  'smart trac pro':            'Smart Trac Pro',
  'smart receiver pro':        'Smart Receiver Pro',
  'srp':                       'Smart Receiver Pro',
  'smart receiver ultra':      'Smart Receiver Ultra',
  'sru':                       'Smart Receiver Ultra',
  'energy trac':               'Energy Trac',
  'uni trac':                  'Uni Trac',
  'omni trac cpu':             'Omni Trac Cpu',
  'omni trac receiver':        'Omni Trac Receiver',
  'omni trac':                 'Omni Trac Cpu',
};

function normalizeDeviceType(value) {
  if (!value) return value;
  return DEVICE_TYPE_NORMALIZE[String(value).toLowerCase().trim()] ?? value;
}

// Section IDs do template padrão do Tractian (h1 → seção 1, h2 → seção 2)
const SECTION_ID_MAP = {
  h1: '8da2b662-c82b-4c5e-b9bc-f70fd42c60f6',
  h2: 'b0f1ddb0-ff75-46d7-b96b-3134eedc6a57',
};

function buildProcedure(device, templateFields, now) {
  let currentSection = null;
  const fields = [];

  for (const tf of templateFields) {
    if (tf.type === 'heading') {
      currentSection = SECTION_ID_MAP[tf.id] ?? tf.id;
      fields.push({ type: 'heading', name: tf.name, metricIds: null, value: null, allCheckedRequired: null, createdAt: now, updatedAt: now });
      continue;
    }

    // Resolve valor do device pelo campo mapeado
    let rawValue = tf.mappedTo != null ? (device[tf.mappedTo] ?? null) : null;

    // Normaliza device_type para bater com opções do WO
    if (tf.mappedTo === 'device_type' && rawValue) rawValue = normalizeDeviceType(rawValue);

    // Formata datas para YYYY-MM-DD
    if (tf.type === 'date' && rawValue) {
      try { rawValue = new Date(rawValue).toISOString().split('T')[0]; } catch { rawValue = null; }
    }

    const base = { type: tf.type, name: tf.name, metricIds: null, required: tf.required ?? false, section: currentSection, allCheckedRequired: null, createdAt: now, updatedAt: now };

    if (tf.type === 'simpleText') {
      fields.push({ ...base, value: rawValue });
    } else if (tf.type === 'select') {
      const options = (tf.options ?? []).filter(Boolean).map(n => ({ name: n }));
      let value = null;
      if (rawValue !== null) {
        const idx = (tf.options ?? []).findIndex(o => o === rawValue || String(o).toLowerCase() === String(rawValue).toLowerCase());
        value = idx >= 0 ? idx : null;
      }
      fields.push({ ...base, value, options, helpText: '', useMultiple: false });
    } else if (tf.type === 'date') {
      fields.push({ ...base, value: rawValue });
    } else if (tf.type === 'file') {
      fields.push({ ...base, value: null, isNotesAndFilesEnabled: false });
    } else if (tf.type === 'yesNoCustom') {
      fields.push({ ...base, value: { option: null }, isNotesAndFilesEnabled: true, isAudioEnabled: true, associationTrigger: null, associationEntity: null });
    }
  }

  return { assetId: null, locationId: null, title: 'Product Quality Debug', fields, description: '', companyId: COMPANY_ID, createdByUserId: '68909902a03bec08eb49632d' };
}

function buildWorkOrderPayload(device, templateFields) {
  const now = new Date().toISOString();
  const { device_id } = device;

  return {
    workOrderProcedures: [],
    planningStatus: 'unplanned',
    title: `[${device_id}] Product Quality Debug`,
    plannedStartDate: null,
    assignedUserIds: [],
    assignedTeamIds: [TEAM_ID],
    assetId: null,
    locationId: null,
    linkedRequestIds: [],
    customFields: [],
    identifiedAssetFailures: [],
    workOrderOperations: [
      {
        title: 'Product Quality Debug',
        locationId: LOCATION_ID,
        assetId: null,
        order: 1,
        plannedTeamId: null,
        assignedIds: [TEAM_ID],
        companyId: COMPANY_ID,
        createdAt: now,
        updatedAt: now,
        externalId: `auto-${device_id}-${Date.now()}`,
        workOrderOperationInventories: [],
        workOrderOperationProcedureIds: ['692f3f2ca5c2b166a0391294'],
        workOrderOperationProcedures: [buildProcedure(device, templateFields, now)],
        workOrderOperationCustomFields: [],
        id: '692f3f2ca5c2b166a0391293',
        workOrderItemsQueue: {
          added: [], deleted: [], updated: [], changeStatus: [],
          addPurchaseRequisition: null, addTransferRequest: null,
          assignedTeamIds: [TEAM_ID], assignedUserIds: [],
        },
      },
    ],
    linkedRequests: [],
    addedWorkOrderProceduresIds: [],
    removedWorkOrderProceduresIds: [],
    inventoryItems: [],
    linkedWorkOrderIds: [],
    companyId: COMPANY_ID,
    procedure: [],
  };
}

async function startWorkorder(workorderId, token) {
  const res = await fetch(`${MOTOR_BASE_URL}/workorders/${workorderId}/actions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-company-id': COMPANY_ID },
    body: JSON.stringify({ action: 'start', oldData: { status: 'open' }, newData: { status: 'inProgress' } }),
  });
  if (!res.ok) console.warn(`[createWorkorder] start failed: ${res.status} ${await res.text()}`);
  return res.ok;
}

async function pauseWorkorder(workorderId, token) {
  const res = await fetch(`${MOTOR_BASE_URL}/workorders/${workorderId}/actions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-company-id': COMPANY_ID },
    body: JSON.stringify({ action: 'pause', oldData: { status: 'inProgress' }, newData: { status: 'onHold', onHoldReasonId: ON_HOLD_REASON_ID } }),
  });
  if (!res.ok) console.warn(`[createWorkorder] pause failed: ${res.status} ${await res.text()}`);
  return res.ok;
}

exports.createWorkorder = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { template, ...device } = req.body ?? {};
  if (!device.device_id) return res.status(400).json({ error: 'device_id obrigatório' });
  if (!template?.length) return res.status(400).json({ error: 'template obrigatório' });

  try {
    const token = await getAccessToken();
    const payload = buildWorkOrderPayload(device, template);

    console.log(`[createWorkorder] Criando WO para device_id=${device.device_id}`);

    const response = await fetch(TRACTIAN_WO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-company-id': COMPANY_ID,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      _cachedToken = null; // invalida cache
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Execute refresh_token_headless.py para renovar o token no Secret Manager',
      });
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`[createWorkorder] Tractian API ${response.status}: ${body.slice(0, 300)}`);
      return res.status(502).json({ error: 'Erro na API Tractian', status: response.status, details: body.slice(0, 200) });
    }

    const data = await response.json();
    const workorder_id = data._id ?? data.id ?? data.workOrderId ?? null;

    console.log(`[createWorkorder] WO criada: ${workorder_id}`);

    // Start → Pause (quality pause)
    if (workorder_id) {
      await startWorkorder(workorder_id, token);
      await pauseWorkorder(workorder_id, token);
    }

    // Registra no BigQuery
    await bigquery.query({
      query: `
        INSERT INTO \`tractian-bi.${DATASET}.${LOG_TABLE}\`
          (device_id, workorder_id, created_at)
        VALUES (@device_id, @workorder_id, CURRENT_TIMESTAMP())
      `,
      params: { device_id: device.device_id, workorder_id },
    });

    return res.status(201).json({ ok: true, workorder_id });

  } catch (error) {
    console.error('[createWorkorder] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
