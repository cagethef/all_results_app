# Integração BigQuery

## Arquitetura

```
Frontend React → Cloud Function API → BigQuery
```

## Estratégia de Query

### Passo 1: Achar o tipo do dispositivo

Usa wildcard pra buscar em todas as tabelas ATP de uma vez:

```sql
SELECT *, _TABLE_SUFFIX as device_table
FROM `tractian-bi.operations_dbt.fct_all_results_atp_*`
WHERE sensor_id = @deviceId
  AND _TABLE_SUFFIX IN ('energytrac', 'omnitrac', 'smarttrac', 'receiver', 'unitrac')
LIMIT 1
```

Isso retorna os dados do ATP mais a coluna `device_name` que diz qual é o tipo do dispositivo.

### Passo 2: Ver quais outros testes buscar

Cada dispositivo tem testes diferentes:

- Energy Trac: só ATP
- Omni Trac: ATP + ITP
- Smart Trac: ATP + Leak
- Smart Trac Ultra Gen 2: ATP + ITP + Leak
- Omni Receiver: ATP
- Smart Receiver: ATP + Leak
- Uni Trac: só ATP

Usamos um mapa de configuração pra saber quais tabelas consultar baseado no device_name.

### Passo 3: Buscar os outros testes em paralelo

Se o dispositivo precisa de ITP e Leak, consultamos as duas tabelas ao mesmo tempo usando Promise.all(). Isso é mais rápido do que consultar uma depois da outra.

## Estrutura das tabelas

```
fct_all_results_atp_energytrac (JA EXISTE TABELA)

[
  {
    "name": "sensor_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ia_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ia_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ib_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ib_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ic_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_ic_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_va_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_va_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_vb_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_vb_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_vc_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rms_vc_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_omni_receiver (JA EXISTE TABELA)

[
  {
    "name": "omni_receiver_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_omnitrac (JA EXISTE TABELA)

[
  {
    "name": "omnitrac_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_usage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_usage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "memory_usage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "memory_usage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "disk_usage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "disk_usage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "soc_temp_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "soc_temp_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_smarttrac (JA EXISTE TABELA)

[
  {
    "name": "sensor_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "temperature_thermistor_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "temperature_thermistor_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_receiver (JA EXISTE TABELA)

[
  {
    "name": "receiver_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_temp_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_voltage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "modem_voltage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_temperature_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_temperature_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_unitrac (JA EXISTE TABELA)

[
  {
    "name": "unitrac_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "protocol",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "protocol_group",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_signal_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "internal_temp_c_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "internal_temp_c_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "powerline_voltage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "powerline_voltage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "analog_current_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "analog_current_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "analog_voltage_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "analog_voltage_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "celsius_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "celsius_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "humidity_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "humidity_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "header_rs485_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "header_rs485_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "digital_sample_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "digital_sample_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "count_true_ch1_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "count_true_ch1_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "count_false_ch1_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "count_false_ch1_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "count_true_ch2_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "count_true_ch2_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "count_false_ch2_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "count_false_ch2_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "low_status_ref_mean",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "final_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_atp_smarttrac_ultra_gen2 (N EXISTE TABELA AINDA)

fct_all_results_itp_omnitrac (N EXISTE TABELA AINDA)
fct_all_results_itp_smarttrac_ultra_gen2 (N EXISTE TABELA AINDA)

fct_all_results_leak_smarttrac_ultra_gen2 (N EXISTE TABELA AINDA)
fct_all_results_leak_smarttrac (N EXISTE TABELA AINDA)
fct_all_results_leak_receiver (N EXISTE TABELA AINDA)
```

## Custo

Cloud Functions tem 2 milhões de invocações grátis por mês. BigQuery tem 1TB de queries grátis por mês. Pro uso normal, fica dentro do free tier.

## Otimizações futuras

Se precisar de melhor performance:
- Adicionar cache Redis pros dispositivos mais acessados
- Usar clustering do BigQuery na coluna sensor_id
- Criar materialized view juntando todas as tabelas ATP
- Adicionar CDN pras respostas estáticas da API

Por enquanto, a abordagem com wildcard já é boa o suficiente.
