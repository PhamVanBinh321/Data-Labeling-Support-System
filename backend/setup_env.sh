#!/bin/bash
set -e

cd /opt/Data-Labeling-Support-System/backend

VPS_IP="103.163.118.227"

SHARED_JWT=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_AUTH=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_PROJECT=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_TASK=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_ANNOTATION=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_NOTIFY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
KEY_ADMIN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')

cat > auth-service/.env <<ENVEOF
SECRET_KEY=${KEY_AUTH}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,auth-service
DATABASE_URL=postgresql://auth_user:auth_pass@auth-db:5432/auth_db
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
JWT_SIGNING_KEY=${SHARED_JWT}
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

cat > project-service/.env <<ENVEOF
SECRET_KEY=${KEY_PROJECT}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,project-service
DATABASE_URL=postgresql://project_user:project_pass@project-db:5432/project_db
AUTH_SERVICE_URL=http://auth-service:8001
NOTIFICATION_SERVICE_URL=http://notification-service:8005
JWT_SIGNING_KEY=${SHARED_JWT}
RABBITMQ_URL=amqp://dlss:dlss_pass@rabbitmq:5672/
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

cat > task-service/.env <<ENVEOF
SECRET_KEY=${KEY_TASK}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,task-service
DATABASE_URL=postgresql://task_user:task_pass@task-db:5432/task_db
AUTH_SERVICE_URL=http://auth-service:8001
NOTIFICATION_SERVICE_URL=http://notification-service:8005
JWT_SIGNING_KEY=${SHARED_JWT}
RABBITMQ_URL=amqp://dlss:dlss_pass@rabbitmq:5672/
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

cat > annotation-service/.env <<ENVEOF
SECRET_KEY=${KEY_ANNOTATION}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,annotation-service
DATABASE_URL=postgresql://annotation_user:annotation_pass@annotation-db:5432/annotation_db
AUTH_SERVICE_URL=http://auth-service:8001
TASK_SERVICE_URL=http://task-service:8003
MEDIA_ROOT=/media
JWT_SIGNING_KEY=${SHARED_JWT}
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=dlss-media
MINIO_PUBLIC_HOST=http://${VPS_IP}:9000
MINIO_USE_SSL=False
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

cat > notification-service/.env <<ENVEOF
SECRET_KEY=${KEY_NOTIFY}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,notification-service
DATABASE_URL=postgresql://notify_user:notify_pass@notification-db:5432/notify_db
AUTH_SERVICE_URL=http://auth-service:8001
JWT_SIGNING_KEY=${SHARED_JWT}
REDIS_URL=redis://redis:6379/1
RABBITMQ_URL=amqp://dlss:dlss_pass@rabbitmq:5672/
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

cat > admin-service/.env <<ENVEOF
SECRET_KEY=${KEY_ADMIN}
DEBUG=False
ALLOWED_HOSTS=${VPS_IP},localhost,admin-service
DATABASE_URL=postgresql://reporting_user:reporting_pass@reporting-db:5432/reporting_db
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVEOF

echo "=== ALL .env FILES CREATED SUCCESSFULLY ==="
ls -la auth-service/.env project-service/.env task-service/.env annotation-service/.env notification-service/.env admin-service/.env
