#!/bin/bash
cd /opt/Data-Labeling-Support-System/backend
for f in */.env; do
  echo "CORS_ALLOW_ALL_ORIGINS=True" >> "$f"
done
docker compose down
docker compose up -d
