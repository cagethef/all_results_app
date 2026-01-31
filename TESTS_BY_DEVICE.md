# Tests by Device Type

This document maps all device types and their respective tests/parameters found in the Results folder.

---

## 1. Energy Trac

**Device Type:** Energy monitoring device with current probes (1000A or 5000A)

**Connection:** Single Chip or Dual Chip (VIVO, CLARO, TIM, AT&T, TWILIO)

### Tests:
- **ATP** - Electrical Parameters with Dynamic Limits
  - 📶 `signal` - Signal strength (dBm) - limits vary daily
  - ⚡ `rms_ia` - RMS Current Phase A (A)
  - ⚡ `rms_ib` - RMS Current Phase B (A)
  - ⚡ `rms_ic` - RMS Current Phase C (A)
  - ⚡ `rms_va` - RMS Voltage Phase A (V)
  - ⚡ `rms_vb` - RMS Voltage Phase B (V)
  - ⚡ `rms_vc` - RMS Voltage Phase C (V)
  - 🌡️ `modemTemp` - Modem temperature (°C)
  - 📊 `low_status` - Status indicator (not battery)

**Test Format:** Table with Lower/Upper Limits, Reference Average, Approved Average, STD%

**Note:** Energy Trac does NOT have battery (powered by line) and does NOT have Leak Test

**Icon:** ⚡ (Electrical energy)

---

## 2. Omni Trac

**Device Type:** Industrial IoT controller with multiple communication interfaces

### Tests:
- **ATP** - System Performance with Dynamic Limits
  - 🌡️ `socTemp` - SoC Temperature (°C)
  - 💻 `cpuUsage` - CPU Usage (%)
  - 💾 `diskUsage` - Disk Usage (bytes)
  - 💾 `memoryUsage` - Memory Usage (bytes)
  - 📊 `low_status` - Status indicator

- **ITP** - 26 comprehensive hardware tests

  **Power & System:**
  - ⚡ `power_enables` - Power rail enables
  - ⚡ `power_good_lines` - Power good signals
  - 🌡️ `soc_temp` - SoC temperature (°C)
  - 🌡️ `gpu_temp` - GPU temperature (°C)
  - 💻 `cpu_usage` - CPU usage (%)
  - 💾 `memory_usage` - Memory usage (MB)

  **Electrical:**
  - ⚡ `frontpanel_bus_24v` - Front panel 24V bus (mV)
  - ⚡ `frontpanel_bus_5v` - Front panel 5V bus (mV)
  - ⚡ `sys_24v` - System 24V rail (mV)
  - ⚡ `sys_5v` - System 5V rail (mV)
  - ⚡ `fuse24v_aux_imon` - 24V fuse current monitor
  - ⚡ `fuse5v_aux_imon` - 5V fuse current monitor

  **Storage & ID:**
  - 💾 `mmc_cid` - MMC card identifier
  - 🔧 `eeprom` - EEPROM data

  **Communication:**
  - 🔌 `usb_check_match` - USB devices verification
  - 🌐 `eth0_mac` - Ethernet MAC address
  - 📡 `iperf_eth` - Ethernet throughput (Mbps)
  - 📡 `iperf_otg` - USB OTG throughput (Mbps)
  - 📟 `rs485_fd` - RS485 Full Duplex test
  - 📟 `rs485_hd` - RS485 Half Duplex test
  - 📟 `rs232` - RS232 communication test
  - 📟 `ot485_fd_master` - OmniTrac 485 FD Master
  - 📟 `ot485_fd_slave` - OmniTrac 485 FD Slave

  **Time & External:**
  - 🕐 `rtc_pcf` - Real-time clock test
  - 🔗 `external_id_test` - External API registration
  - 🕐 `controller_timestamp` - Test controller timestamp

**Note:** Omni Trac does NOT have Leak Test

**Icon:** ⚙️ (Industrial controller)

---

## 3. Smart Trac

**Device Type:** Wireless vibration and temperature sensor

### Tests:
- **ATP** - Sensor Performance with Dynamic Limits
  - 📶 `sensorSignal` - Sensor signal strength (dBm)
  - 🌡️ `temperatureThermistor` - Thermistor temperature (°C)
  - 📊 `low_status` - Status indicator

- **Leak Test** (Estanqueidade)
  - 💧 `drop` - Pressure drop (Pa/min)
  - 📐 `slope` - Pressure decay slope
  - 📊 `r2` - Fit quality (R²)
  - 🔧 `jigID` - Test jig identifier
  - 📋 `calibrationName` - Calibration name
  - 📅 `last_calib` - Last calibration date
  - 📊 Calibration limits (max/min pressure)

**Test Format:** Table with Lower/Upper Limits, Reference Average, Approved Average, STD%

**Icon:** 📳 (Vibration sensor)

---

## 3.1. Smart Trac Ultra Gen 2

**Device Type:** Advanced wireless vibration and temperature sensor with comprehensive testing

### Tests:
- **ATP** - Sensor Performance with References
  - 📶 `reference_signal` - Reference signal strength (dBm)
  - 📶 `dut_signal` - Device under test signal (dBm)
  - 🌡️ `reference_temp` - Reference temperature (°C)
  - 🌡️ `dut_temp` - Device temperature (°C)
  - 📊 `reference_status_count` - Reference status count
  - 📊 `dut_status_count` - Device status count
  - ✅ 5 validation checks (temp, signal, status, errors, zero signal)
  - 📋 `overall_result` - PASS/FAIL

- **ITP** - 12-Step Provisioning Test
  1. 📱 `step1_qrcode` - QR code scan (sensor_id)
  2. 📡 `step2_nfc` - NFC read (external_id validation)
  3. 🔵 `step3_ble_connect` - Bluetooth connection (address, RSSI)
  4. 🔍 `step4_cli_whoami` - Component check (6 components: Flash, RAM, Accelerometers, Humidity, Magnetometer)
  5. 📊 `step5_cli_values` - Sensor readings (humidity, temperature, mcu_temp)
  6. 🔄 `step6_sas_mode` - SAS mode switch
  7. 📳 `step7_accelerometer_sample` - Passive accelerometer (RMS x/y/z, DC x/y/z)
  8. 🧲 `step8_magnetometer_sample` - Passive magnetometer
  9. 🔊 `step9_piezo_sample` - Passive piezo
  10. 📳 `step10_accelerometer_active` - Active accelerometer (with wavegen, FRF score)
  11. 🧲 `step11_magnetometer_active` - Active magnetometer
  12. 🔊 `step12_piezo_active` - Active piezo
  - 📋 `final_result` - Overall result with failed steps count

- **Leak Test** (Estanqueidade)
  - 💧 `drop` - Pressure drop (Pa/min)
  - 📐 `slope` - Pressure decay slope
  - 📊 `r2` - Fit quality (R²)
  - 🔧 `jigID` - Test jig identifier
  - 📋 `calibrationName` - Calibration name
  - 📅 `last_calib` - Last calibration date

**Icon:** 📳 (Vibration sensor)

---

## 4. Uni Trac

**Device Type:** Universal sensor interface with multiple output types

**Sensor Types:**
- NPN / PNP digital outputs
- 0-10V analog output
- 4-20mA current loop
- RS485 communication
- I2C interface

### Tests:
- **ATP** - Parameters vary by protocol type
  
  **Example (NPN Protocol):**
  - 📶 `sensorSignal` - Sensor signal strength (dBm)
  - 🌡️ `internalTempC` - Internal temperature (°C)
  - ⚡ `powerLineVoltage` - Power line voltage (V)
  - 💻 `digitalSample` - Digital sampling accuracy
  - 🔢 `countTrueCH1` - Digital pulse count CH1 (True)
  - 🔢 `countFalseCH1` - Digital pulse count CH1 (False)
  - 🔢 `countTrueCH2` - Digital pulse count CH2 (True)
  - 🔢 `countFalseCH2` - Digital pulse count CH2 (False)
  - 📊 `low_status` - Status indicator

**Test Format:** Table with Lower/Upper Limits, Reference Average, Approved Average, STD%

**Note:** Uni Trac does NOT have Leak Test. Test parameters change based on protocol (NPN, PNP, 0-10V, 4-20mA, RS485, I2C)

**Icon:** 🔌 (Universal interface)

---

## 5. Omni Receiver

**Device Type:** Wireless data receiver for sensor networks

**Connection:** Single Chip or Dual Chip (VIVO, CLARO, TIM, AT&T, TWILIO)

### Tests:
- **ATP** - Signal Quality with Dynamic Limits
  - 📶 `signal` - Receiver signal strength (dBm)
  - 🌡️ `modemTemp` - Modem temperature (°C)
  - 📊 `low_status` - Status indicator

**Test Format:** Table with Lower/Upper Limits, Reference Average, Approved Average, STD%

**Note:** Omni Receiver does NOT have Leak Test. Only Receiver (Smart Receiver) has Leak Test.

**Icon:** 📡 (Wireless receiver)

---

## 6. Receiver (Smart Receiver)

**Device Type:** Smart wireless data receiver for sensor networks

**Connection:** Single Chip or Dual Chip (VIVO, CLARO, TIM, AT&T, TWILIO)

### Tests:
- **ATP** - Extended Signal Quality with Dynamic Limits
  - 📶 `sensorSignal` - Sensor signal strength (dBm)
  - 📶 `signal` - Receiver signal strength (dBm)
  - ⚡ `modemVoltage` - Modem voltage (V)
  - 🌡️ `modemTemp` - Modem temperature (°C)
  - 🌡️ `cpuTemperature` - CPU temperature (°C)
  - 📊 `low_status` - Status indicator

- **Leak Test** (Estanqueidade)
  - 💧 `drop` - Pressure drop (Pa/min)
  - 📐 `slope` - Pressure decay slope
  - 📊 `r2` - Fit quality (R²)
  - 🔧 `jigID` - Test jig identifier
  - 📋 `calibrationName` - Calibration name

**Test Format:** Table with Lower/Upper Limits, Reference Average, Approved Average, STD%

**Icon:** 📡 (Smart receiver)

---

## 7. Peripherals (Battery Test)

**Device Type:** Battery testing equipment for Smart Trac devices

**Test Codes:**
- ITCS-0002
- ITCS-0003
- ITCS-0009
- ITCS-0012 (ST Ultra Battery with HLC)

### Tests:
- **Data Test** (Individual Battery Measurements)
  - 🔋 `Sample` - Sample number
  - ✓ `Status` - Overall status
  - ⚡ `Polarity` - Polarity check
  - 📊 `OCV Result` - Open Circuit Voltage result
  - ⚡ `OCV Measured Value` - Measured OCV (V)
  - ⚡ `OCV Reference Value` - Reference OCV (V)
  - 📉 `OCV Error` - Error percentage (%)

- **Results Test** (Batch Summary)
  - Test name
  - Work order
  - Responsible person
  - Test date
  - Number reproved by polarity
  - Number reproved by OCV
  - Approval percentage

**Icon:** 🔋 (Battery)

---

## 8. Leak Test (Estanqueidade)

**Device Type:** Leak/seal testing for specific devices only

**Tested Devices:**
- ✅ Smart Trac
- ✅ Smart Trac Ultra Gen 2
- ✅ Omni Receiver / Receiver

**NOT Tested:**
- ❌ Energy Trac
- ❌ Omni Trac
- ❌ Uni Trac

### Tests:
- **Leak Test** (Pressure Decay Analysis)
  - 📉 `drop` - Pressure drop (Pa/min)
  - 📐 `slope` - Pressure decay slope
  - 📊 `r2` (fit quality) - Curve fit quality (R²)

**Test Configuration:**
- Max/min pressure
- Load time, peak time, transfer time
- Calibration data
- Reference tanks

**Results:**
- Boolean pass/fail for each parameter
- Overall result

**Icon:** 💧 (Leak/water drop)

---

## Summary Table

| Device Type | Primary Tests | Key Parameters | Icon |
|-------------|---------------|----------------|------|
| Energy Trac | ATP | Carrier, chip, RMS currents/voltages, signal, modemTemp, low_status | ⚡ |
| Omni Trac | ATP, ITP (26 tests) | ATP: System performance; ITP: Power, temps, comms, network | ⚙️ |
| Smart Trac | ATP, Leak | sensorSignal, temperatureThermistor, low_status | 📳 |
| Smart Trac Ultra Gen 2 | ATP, ITP (12 steps), Leak | ATP: References validation; ITP: Provisioning steps; Leak: Calibration | 📳 |
| Uni Trac | ATP (protocol-based) | Signal, temp, digital counts (varies by protocol) | 🔌 |
| Omni Receiver | ATP, Leak | Carrier, chip, signal, modemTemp, low_status | 📡 |
| Receiver (Smart) | ATP, Leak | Carrier, chip, sensor/receiver signal, modem stats, CPU temp | 📡 |
| Peripherals | Data, Results | Battery OCV, polarity | 🔋 |

---

## Notes

### File Naming Patterns:
- **Omni Trac ITP:** `ITP-{DEVICE_ID}-{timestamp}.json`
- **Leak Test:** `leak_test-{batch}-{DEVICE_ID}-{timestamp}.json`
- **Smart/Uni/Energy:** `{type}_{test}_{timestamp}__{work_order}.csv`
- **Receiver:** `receiver_{test}_{timestamp}__{work_order}.csv`
- **Peripherals:** `ITCS{code}_{test}_{id}.csv`

### Test Status Values:
- ✅ `true` / `approved` - Test passed
- ❌ `false` / `failed` - Test failed
- ⏳ `pending` - Test not yet performed
- ⚠️ `warning` - Test passed with tolerance

### Common Parameters Across Devices:
- **Signal strength:** All wireless devices
- **Temperature:** Most devices monitor internal temperature
- **Battery status:** All battery-powered devices
- **Work order:** Links tests to production batches
