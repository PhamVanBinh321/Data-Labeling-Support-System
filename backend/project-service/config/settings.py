from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'projects',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

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

# Inter-service URLs
AUTH_SERVICE_URL = config('AUTH_SERVICE_URL', default='http://auth-service:8001')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'projects.backends.ServiceJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_TZ = True
