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
    "name": "signal_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_ia_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_ib_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_ic_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_va_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_vb_status",
    "mode": "",
    "type": "STRING",
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
    "name": "rms_vc_status",
    "mode": "",
    "type": "STRING",
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
    "name": "modem_temp_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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
    "name": "signal_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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
    "name": "modem_temp_status",
    "mode": "",
    "type": "STRING",
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
    "name": "cpu_usage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "memory_usage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "disk_usage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "soc_temp_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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
    "name": "sensor_signal_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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
    "name": "temperature_thermistor_status",
    "mode": "",
    "type": "STRING",
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
    "name": "sensor_signal_status",
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
    "name": "signal_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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
    "name": "modem_temp_status",
    "mode": "",
    "type": "STRING",
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
    "name": "modem_voltage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "cpu_temperature_status",
    "mode": "",
    "type": "STRING",
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
    "name": "sensor_signal_status",
    "mode": "",
    "type": "STRING",
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
    "name": "internal_temp_c_status",
    "mode": "",
    "type": "STRING",
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
    "name": "powerline_voltage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "analog_current_status",
    "mode": "",
    "type": "STRING",
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
    "name": "analog_voltage_status",
    "mode": "",
    "type": "STRING",
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
    "name": "celsius_status",
    "mode": "",
    "type": "STRING",
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
    "name": "humidity_status",
    "mode": "",
    "type": "STRING",
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
    "name": "header_rs485_status",
    "mode": "",
    "type": "STRING",
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
    "name": "digital_sample_status",
    "mode": "",
    "type": "STRING",
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
    "name": "count_true_ch1_status",
    "mode": "",
    "type": "STRING",
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
    "name": "count_false_ch1_status",
    "mode": "",
    "type": "STRING",
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
    "name": "count_true_ch2_status",
    "mode": "",
    "type": "STRING",
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
    "name": "count_false_ch2_status",
    "mode": "",
    "type": "STRING",
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
    "name": "low_status_status",
    "mode": "",
    "type": "STRING",
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

fct_all_results_itp_omnitrac (JA EXISTE)

[
  {
    "name": "source_file_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "ingestion_ts",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "device_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "device_ip",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "timestamp_raw",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch_number",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "test_type",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "total_tests",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "passed_tests",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "failed_tests",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "success_rate",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "power_enables_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "power_good_lines_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "usb_check_match_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "usb_mass_storage_detected",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "mmc_cid_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "mmc_cid_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "eth0_mac_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "eth0_mac_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "soc_temp_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "soc_temp_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "gpu_temp_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "gpu_temp_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_usage_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "cpu_usage_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "memory_usage_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "memory_usage_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "eeprom_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "eeprom_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "frontpanel_bus_24v_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "frontpanel_bus_24v_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "frontpanel_bus_5v_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "frontpanel_bus_5v_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "sys_24v_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "sys_24v_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "sys_5v_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "sys_5v_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "fuse24v_aux_imon_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "fuse24v_aux_imon_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "fuse5v_aux_imon_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "fuse5v_aux_imon_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "rs485_fd_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "rs485_fd_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rs232_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "rs232_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "iperf_eth_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "iperf_eth_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "ot485_fd_master_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "ot485_fd_master_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "ot485_fd_slave_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "ot485_fd_slave_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rtc_pcf_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "rtc_pcf_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "iperf_otg_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "iperf_otg_error",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "rs485_hd_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "rs485_hd_value",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "external_id_test_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "external_id_test_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "controller_timestamp_status",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "controller_timestamp_value",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_itp_smarttrac_ultra_gen2 (JA EXISTE)


[
  {
    "name": "source_file_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "ingestion_ts",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "sensor_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch_device_type",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "batch_test_date",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "test_completed_at",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "workflow_version",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "final_result",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "final_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "failed_steps_count",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "total_steps_count",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "failed_steps_list",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step1_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step1_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step2_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step2_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step2_external_id_read",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step2_valid",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "step3_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step3_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step3_device_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step3_device_address",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step4_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step4_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step4_components_ok",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "step4_components_total",
    "mode": "",
    "type": "INTEGER",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_humidity_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_humidity_passed",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_temp_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_temp_passed",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_mcu_temp_value",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_mcu_temp_passed",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "step5_readings_json",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step6_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step6_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step6_sas_available",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_rms_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_rms_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_rms_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_dc_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_dc_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_dc_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_csv_file",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step7_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_rms_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_rms_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_rms_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_dc_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_dc_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_dc_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_csv_file",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step8_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_rms",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_dc",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_csv_file",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step9_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_rms_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_rms_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_rms_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_dc_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_dc_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_dc_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_frf_score",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_reference_rms",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step10_error_message",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_rms_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_rms_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_rms_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_dc_x",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_dc_y",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_dc_z",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step11_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step12_status",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "step12_timestamp",
    "mode": "",
    "type": "TIMESTAMP",
    "description": "",
    "fields": []
  },
  {
    "name": "step12_rms",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step12_dc",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "step12_validation_overall",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  }
]

fct_all_results_leak_test (JA EXISTE)

[
  {
    "name": "device_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "jig_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "calibration_name",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "info_device",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "info_batch",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "test_date",
    "mode": "",
    "type": "DATE",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_mean_drop",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_error_drop",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_mean_slope",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_error_slope",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_mean_fit_qual",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_error_fit_qual",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_reference_id",
    "mode": "",
    "type": "STRING",
    "description": "",
    "fields": []
  },
  {
    "name": "calib_last_calib",
    "mode": "",
    "type": "DATE",
    "description": "",
    "fields": []
  },
  {
    "name": "test_slope",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "test_drop",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "test_r2",
    "mode": "",
    "type": "FLOAT",
    "description": "",
    "fields": []
  },
  {
    "name": "result_drop_pass",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "result_slope_pass",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "result_r2_pass",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  },
  {
    "name": "result_final_pass",
    "mode": "",
    "type": "BOOLEAN",
    "description": "",
    "fields": []
  }
]
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
