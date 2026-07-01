```bash
docker build -t coeus-core:local .

docker run -it \
  --name coeus-bot-local \
  --env-file .env \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/notes:/app/notes \
  coeus-core:local
```