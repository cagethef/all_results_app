# Backend - Cloud Function

API serverless que busca dados de dispositivos no BigQuery.

## Deploy

1. Instale o Google Cloud SDK se ainda não tiver

2. Faça login:
```bash
gcloud auth login
```

3. Configure o projeto:
```bash
gcloud config set project tractian-bi
```

4. Deploy da função:
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

5. Após o deploy, copie a URL gerada e atualize no frontend:
   - Crie arquivo `.env` na raiz do projeto
   - Adicione: `VITE_API_URL=<URL_COPIADA>`

## Testar localmente

Não tem servidor local ainda. Use o mock do frontend ou faça deploy pra testar.

## Estrutura

- `index.js` - função principal
- `package.json` - dependências

## Permissões

A Cloud Function precisa de acesso ao BigQuery. Se der erro de permissão, adicione a role:

```bash
gcloud projects add-iam-policy-binding tractian-bi \
  --member="serviceAccount:<SERVICE_ACCOUNT>" \
  --role="roles/bigquery.dataViewer"
```
