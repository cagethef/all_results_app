# IDs de Teste por Dispositivo

Use estes IDs para testar cada tipo de dispositivo:

## Energy Trac
```
TZ229AZ
BV379MP
KW547AN
```
**Esperado**: 
- **ATP**: Signal, RMS IA/IB/IC, RMS VA/VB/VC, Modem Temp, Low Status
- **Chip Info**: Carrier, Chip Type, CCID(s)

---

## Omni Receiver
```
ENF3C26
GCK9V35
CMT5U68
```
**Esperado**: 
- **ATP**: Signal, Modem Temp, Low Status
- **Chip Info**: Carrier, Chip Type, CCID(s)

---

## Receiver (Smart Receiver)
```
EXZ4F22
BXA5T31
TIN6Y12
```
**Esperado**: 
- **ATP**: Sensor Signal, Signal, Modem Voltage, Modem Temp, CPU Temp, Low Status
- **Leak Test**: Jig ID, Calibration, Drop, Slope, R²
- **Chip Info**: Carrier, Chip Type, CCID(s)

---

## Omni Trac
```
EX09483
TP93090
YM80169
```
**Esperado**: 
- **ATP**: SoC Temp, CPU Usage, Disk Usage, Memory Usage, Low Status
- **ITP**: Power Enables, USB Check, MMC CID, Ethernet MAC, SoC Temp, RS485 FD, RS232, iPERF Ethernet (26 testes resumidos)

---

## Smart Trac
```
VUN0162
DGY7748
AAE5389
```
**Esperado**: 
- **ATP**: Sensor Signal, Temperature Thermistor, Low Status
- **Leak Test**: Jig ID, Calibration, Drop, Slope, R²

---

## Smart Trac Ultra Gen 2
```
XZP2935
ILG3241
VHV9876
```
**Esperado**: 
- **ATP**: Reference Signal/Temp/Status + DUT Signal/Temp/Status (with validation checks)
- **ITP**: QR, NFC, BLE, CLI Who Am I (6 components), Accelerometer Sample/Active, Steps Passed (12-step provisioning)
- **Leak Test**: Jig ID, Calibration, Drop, Slope, R²

---

## Uni Trac
```
R981JGI
E819ECZ
B329YGM
```
**Esperado**: 
- **ATP**: Sensor Signal, Internal Temp, Low Status (simplified for mock)

---

## Teste Misto (Tabela Dinâmica)

Adicione IDs diferentes para ver a tabela se adaptando:
```
TZ229AZ  → Energy Trac (ATP)
EX09483  → Omni Trac (ATP + ITP)
VUN0162  → Smart Trac (ATP + Leak)
R981JGI  → Uni Trac (ATP)
```

A tabela mostrará apenas as colunas relevantes! 🎯
