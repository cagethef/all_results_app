# Setup Google Cloud

Passo a passo pra configurar o backend no Google Cloud.

## Pré-requisitos

1. Conta Google Cloud (já tem acesso ao projeto tractian-bi)
2. Google Cloud SDK instalado

## Instalar Google Cloud SDK

### Windows
1. Baixe: https://cloud.google.com/sdk/docs/install
2. Execute o instalador
3. Abra um novo terminal

### Verificar instalação
```bash
gcloud --version
```

## Configurar projeto

```bash
# Login
gcloud auth login

# Selecionar projeto
gcloud config set project tractian-bi

# Ver configuração atual
gcloud config list
```

## Deploy da Cloud Function

```bash
# Entrar na pasta backend
cd backend

# Deploy
gcloud functions deploy getDevice --gen2 --runtime=nodejs22 --region=southamerica-east1 --source=. --entry-point=getDevice --trigger-http --allow-unauthenticated
```

Vai demorar uns 2-3 minutos.

## Pegar a URL

Depois do deploy, a URL aparece no terminal. Algo como:
```
https://us-central1-tractian-bi.cloudfunctions.net/getDevice
```

Copie essa URL.

## Configurar frontend

1. Crie arquivo `.env` na raiz do projeto:
```
VITE_API_URL=https://us-central1-tractian-bi.cloudfunctions.net
```

2. Reinicie o servidor de dev:
```bash
npm run dev
```

## Testar

Abra o app e tenta adicionar um dispositivo. Deve buscar do BigQuery agora.

Se der erro de "Device not found", o ID não existe no BigQuery. Usa um ID da tabela TEST_IDS.md.

## Ver logs

Pra debugar:
```bash
gcloud functions logs read getDevice --region=us-central1 --limit=50
```

Ou acesse: https://console.cloud.google.com/functions

## Atualizar função

Sempre que mudar o código do backend:
```bash
cd backend
gcloud functions deploy getDevice \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=getDevice \
  --trigger-http \
  --allow-unauthenticated
```

## Custos

- 2 milhões de invocações grátis/mês
- BigQuery 1TB queries grátis/mês

Uso normal fica no free tier.
