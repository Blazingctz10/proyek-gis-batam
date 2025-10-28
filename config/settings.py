import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-u*l7xvm5q8e7ns8@8xi!0d09puyibt@52u$b_u86hoic!tslnn'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'pelaporan',
    'django_recaptcha',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'db_laporan_jalan', 
        'USER': 'postgres',
        'PASSWORD': '12345',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

OSGEO4W_DIR = r'C:\Users\62813\AppData\Local\Programs\OSGeo4W'

GDAL_FILE_NAME = 'gdal311.dll' # <--- GANTI INI

GDAL_LIBRARY_PATH = os.path.join(OSGEO4W_DIR, 'bin', GDAL_FILE_NAME)

if not os.environ.get('GDAL_LIBRARY_PATH'):
    os.environ['GDAL_LIBRARY_PATH'] = GDAL_LIBRARY_PATH

    os.environ['PROJ_LIB'] = os.path.join(OSGEO4W_DIR, 'share', 'proj')

if not os.environ.get('PATH'):
    os.environ['PATH'] = os.path.join(OSGEO4W_DIR, 'bin') + ';' + os.environ.get('PATH', '')
else:
    os.environ['PATH'] = os.path.join(OSGEO4W_DIR, 'bin') + ';' + os.environ['PATH']
    
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

RECAPTCHA_PUBLIC_KEY = '6Lfr6fgrAAAAAOJOmn7IW024ThUM3R8UB41OzqFv'
RECAPTCHA_PRIVATE_KEY = '6Lfr6fgrAAAAADJbu6kphRpKK60nT9WSfHpnRXjO'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'email.anda@gmail.com' # <-- GANTI DENGAN EMAIL ANDA
EMAIL_HOST_PASSWORD = 'password_app_gmail_anda' # <-- GANTI DENGAN PASSWORD ANDA