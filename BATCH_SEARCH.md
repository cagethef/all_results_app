# 📦 Busca por Lote

Este documento explica como usar a funcionalidade de busca por lote para adicionar múltiplos dispositivos de uma vez.

## 🎯 **O que é um Lote?**

Um lote é um grupo de dispositivos testados juntos. O lote é identificado pelos primeiros caracteres do campo `batch` no BigQuery.

### **Formato do Lote:**
```
YYYYMMDD_XX
```

- `YYYYMMDD` = Data (8 dígitos)
- `XX` = Número do lote (2 dígitos)

### **Exemplos de IDs no mesmo lote:**
```
Lote: 20250523_04

IDs que pertencem a este lote:
- 20250523_04_01_CLARO
- 20250523_04_02_VIVO
- 20250523_04_03_TIM
- 20250523_04_RT01_CLARO  (reteste)
- 20250523_04_RT_01_VIVO  (reteste)
```

Todos compartilham o prefixo `20250523_04`, que é o identificador do lote.

## 🔍 **Como Usar**

### **1. Buscar por Lote no Campo de Entrada**

Digite o lote no campo de busca:

```
20250523_04
```

Ou com `#` no início (opcional):
```
#20250523_04
```

### **2. Resultado**

O sistema vai:
1. Buscar em todas as tabelas do BigQuery
2. Encontrar todos os dispositivos com `batch LIKE '20250523_04%'`
3. Adicionar todos na tabela de uma vez
4. Mostrar mensagem: "✓ 15 dispositivos adicionados do lote 20250523_04"

### **3. Dispositivos Duplicados**

Se algum dispositivo do lote já estiver na lista, ele será ignorado:
```
✓ 12 dispositivos adicionados do lote 20250523_04 (3 já estavam na lista)
```

## 🏗️ **Como Funciona (Técnico)**

### **Backend (`backend/index.js`)**

1. **Detecção de Lote:**
```javascript
const batchPattern = /^#?(\d{8}_\d{2})$/;
const batchMatch = input.match(batchPattern);

if (batchMatch) {
  // É um lote!
  const batchPrefix = batchMatch[1]; // Ex: "20250523_04"
  return await getDevicesByBatch(batchPrefix, res);
}
```

2. **Busca no BigQuery:**
```javascript
const query = `
  SELECT * 
  FROM \`tractian-bi.operations_dbt_dev.${table}\`
  WHERE batch LIKE @batchPattern
`;

const [rows] = await bigquery.query({
  query,
  params: { batchPattern: `${batchPrefix}%` } // 20250523_04%
});
```

3. **Resposta:**
```json
{
  "batch": "20250523_04",
  "count": 15,
  "devices": [
    { "id": "YL250QZ", "deviceType": "EnergyTrac", ... },
    { "id": "YL250RA", "deviceType": "EnergyTrac", ... },
    ...
  ]
}
```

### **Frontend (`useDevices.ts`)**

Detecta se a resposta contém múltiplos devices:

```typescript
if (data.devices && Array.isArray(data.devices)) {
  // Busca por lote
  const newDevices = data.devices.filter(device => 
    !devices.some(d => d.id === device.id)
  )
  
  setDevices(prev => [...prev, ...newDevices])
  alert(`✓ ${newDevices.length} dispositivos adicionados do lote ${data.batch}`)
}
```

## ⚡ **Performance**

- A busca itera por **todas as tabelas** (EnergyTrac, OmniTrac, etc.)
- Para cada dispositivo encontrado, busca o `chipInfo` se necessário
- Se um lote tiver 50+ dispositivos, pode levar alguns segundos

## 🚨 **Possíveis Erros**

### **"No devices found"**
```json
{
  "error": "No devices found",
  "message": "Nenhum dispositivo encontrado para o lote 20250523_04"
}
```
**Causa:** Nenhum dispositivo com esse lote existe no BigQuery.

### **"Invalid deviceId format"**
```json
{
  "error": "Invalid deviceId format"
}
```
**Causa:** O formato não é válido (nem lote nem ID).

**Formatos válidos:**
- Lote: `20250523_04` ou `#20250523_04`
- ID: `YL250QZ` (5-10 caracteres alfanuméricos)

## 🎨 **Exemplos de Uso**

### **Exemplo 1: Adicionar lote completo**
```
Input: 20250523_04
Resultado: 15 dispositivos adicionados
```

### **Exemplo 2: Adicionar múltiplos lotes**
```
Input: 20250523_04, 20250523_05, 20250523_06
Resultado: 45 dispositivos adicionados (15 de cada lote)
```

### **Exemplo 3: Mix de lotes e IDs**
```
Input: 20250523_04, YL250QZ, #20250524_01
Resultado: 
- 15 dispositivos do lote 20250523_04
- 1 dispositivo YL250QZ
- 12 dispositivos do lote 20250524_01
```

## 📋 **Requisitos**

### **BigQuery**
- Todas as tabelas devem ter a coluna `batch`
- O formato do `batch` deve seguir o padrão documentado

### **Permissões**
- A service account precisa ter acesso de leitura às tabelas
- Mesmas permissões da busca por ID único

## 🔄 **Próximas Melhorias**

Possíveis melhorias futuras:
- [ ] Loading específico: "Buscando lote... 10/15 dispositivos"
- [ ] Confirmação antes de adicionar lotes grandes (50+)
- [ ] Paginação de resultados
- [ ] Cache de lotes recentemente buscados
- [ ] Filtro por operadora dentro do lote
- [ ] Exportar lote completo (CSV/Excel)

## 🎯 **Casos de Uso**

### **Produção**
Adicionar todos os dispositivos testados em um turno específico para análise.

### **QA**
Validar todos os dispositivos de um lote de reteste.

### **Relatórios**
Gerar relatório completo de um lote específico.
