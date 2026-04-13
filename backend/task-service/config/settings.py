from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    'tasks',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASE_URL = config('DATABASE_URL')
_db = DATABASE_URL.replace('postgresql://', '').replace('postgres://', '')
_creds, _rest = _db.split('@')
_user, _pass = _creds.split(':')
_host_port_db = _rest.split('/')
_host_port = _host_port_db[0].split(':')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _host_port_db[1],
        'USER': _user,
        'PASSWORD': _pass,
        'HOST': _host_port[0],
        'PORT': _host_port[1] if len(_host_port) > 1 else '5432',
    }
}

AUTH_SERVICE_URL = config('AUTH_SERVICE_URL', default='http://auth-service:8001')
NOTIFICATION_SERVICE_URL = config('NOTIFICATION_SERVICE_URL', default='http://notification-service:8005')
PROJECT_SERVICE_URL = config('PROJECT_SERVICE_URL', default='http://project-service:8002')
RABBITMQ_URL = config('RABBITMQ_URL', default='amqp://dlss:dlss_pass@rabbitmq:5672/')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'tasks.backends.ServiceJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Task Service API',
    'DESCRIPTION': 'API quản lý task và workflow cho hệ thống Data Labeling.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
    # JWT phải được verify bằng cùng key mà auth-service đã ký.
    # Đặt JWT_SIGNING_KEY trong .env — giống với auth-service.
    'SIGNING_KEY': config('JWT_SIGNING_KEY', default=SECRET_KEY),
    'VERIFYING_KEY': config('JWT_SIGNING_KEY', default=SECRET_KEY),
}

# Thêm origins vào CORS_ALLOWED_ORIGINS trong .env, cách nhau bằng dấu phẩy
_cors_origins = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_TZ = True
