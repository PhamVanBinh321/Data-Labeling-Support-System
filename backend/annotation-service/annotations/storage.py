import io
import logging
from django.conf import settings
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

_client = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
    return _client


def ensure_bucket_exists(bucket: str = None) -> None:
    bucket = bucket or settings.MINIO_BUCKET
    client = get_client()
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            # Set public read policy để browser truy cập ảnh trực tiếp
            policy = f'''{{
                "Version":"2012-10-17",
                "Statement":[{{
                    "Effect":"Allow",
                    "Principal":"*",
                    "Action":["s3:GetObject"],
                    "Resource":["arn:aws:s3:::{bucket}/*"]
                }}]
            }}'''
            client.set_bucket_policy(bucket, policy)
            logger.info(f'MinIO bucket "{bucket}" created with public-read policy.')
    except S3Error as e:
        logger.error(f'MinIO ensure_bucket_exists error: {e}')


def upload_file(object_name: str, data: bytes, content_type: str = 'image/jpeg') -> None:
    client = get_client()
    client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def delete_file(object_name: str) -> None:
    try:
        client = get_client()
        client.remove_object(settings.MINIO_BUCKET, object_name)
    except S3Error as e:
        logger.warning(f'MinIO delete_file error for "{object_name}": {e}')


def get_public_url(object_name: str) -> str:
    return f'{settings.MINIO_PUBLIC_HOST}/{settings.MINIO_BUCKET}/{object_name}'
