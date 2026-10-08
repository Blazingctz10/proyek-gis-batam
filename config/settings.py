import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# ✅ GUNAKAN ENVIRONMENT VARIABLES UNTUK PRODUCTION
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-u*l7xvm5q8e7ns8@8xi!0d09puyibt@52u$b_u86hoic!tslnn')

DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',') if h.strip()] if not DEBUG else ['*']

# Application definition
INSTALLED_APPS = [
    'jazzmin',
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
    'pelaporan.middleware.SeparateAdminSessionMiddleware',
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
                'pelaporan.context_processors.platform_info',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'db_laporan_jalan'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', '12345'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'id'  # ✅ Ganti ke Bahasa Indonesia
TIME_ZONE = 'Asia/Jakarta'  # ✅ Timezone Batam
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# GDAL / GEOS Configuration (Cross-Platform & Resilient)
if os.name == 'nt':
    import glob
    # Daftar lokasi potensial GDAL di Windows (PostgreSQL PostGIS bin, OSGeo4W, dll.)
    gdal_candidates = [
        r'C:\Program Files\PostgreSQL\15\bin',
        r'C:\Program Files\PostgreSQL\16\bin',
        r'C:\Program Files\PostgreSQL\14\bin',
        os.environ.get('OSGEO4W_ROOT', '') + r'\bin' if os.environ.get('OSGEO4W_ROOT') else '',
        r'C:\OSGeo4W\bin',
        r'C:\OSGeo4W64\bin',
        os.path.expandvars(r'%LOCALAPPDATA%\Programs\OSGeo4W\bin'),
        r'C:\Program Files\GDAL',
    ]

    selected_bin = None
    selected_gdal = None
    selected_geos = None

    for candidate in gdal_candidates:
        if candidate and os.path.isdir(candidate):
            dlls = glob.glob(os.path.join(candidate, '*gdal*.dll'))
            if dlls:
                selected_bin = candidate
                selected_gdal = dlls[0]
                geos = glob.glob(os.path.join(candidate, '*geos_c*.dll'))
                if geos:
                    selected_geos = geos[0]
                break

    if selected_bin:
        try:
            os.add_dll_directory(selected_bin)
        except (AttributeError, OSError):
            pass
        os.environ['PATH'] = selected_bin + ';' + os.environ.get('PATH', '')
        if selected_gdal:
            GDAL_LIBRARY_PATH = selected_gdal
        if selected_geos:
            GEOS_LIBRARY_PATH = selected_geos

        proj_candidates = [
            r'C:\Program Files\PostgreSQL\15\share\contrib\postgis-3.6\proj',
            r'C:\Program Files\PostgreSQL\15\share\contrib\postgis-3.5\proj',
            r'C:\Program Files\PostgreSQL\16\share\contrib\postgis-3.6\proj',
            r'C:\OSGeo4W\share\proj',
        ]
        for p in proj_candidates:
            if os.path.isdir(p):
                os.environ['PROJ_LIB'] = p
                break


# reCAPTCHA Configuration
RECAPTCHA_PUBLIC_KEY = os.environ.get('RECAPTCHA_PUBLIC_KEY', '6Lfr6fgrAAAAAOJOmn7IW024ThUM3R8UB41OzqFv')
RECAPTCHA_PRIVATE_KEY = os.environ.get('RECAPTCHA_PRIVATE_KEY', '6Lfr6fgrAAAAADJbu6kphRpKK60nT9WSfHpnRXjO')

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'your-email@gmail.com')  # ✅ GANTI!
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'your-app-password')  # ✅ GANTI!

# ✅ TAMBAHAN: File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB

# ✅ TAMBAHAN: Security Settings untuk Production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# ✅ TAMBAHAN: Login & Session Settings
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'dashboard'
LOGOUT_REDIRECT_URL = 'landing'
ADMIN_SESSION_COOKIE_NAME = 'admin_sessionid'

# ✅ JAZZMIN ADMIN UI CONFIGURATION
JAZZMIN_SETTINGS = {
    "site_title": "Admin LaporJalan Batam",
    "site_header": "LaporJalan Batam",
    "site_brand": "WebGIS Batam",
    "site_logo_classes": "fas fa-route",
    "welcome_sign": "Selamat Datang di Panel Kontrol WebGIS Batam",
    "copyright": "LaporJalan Batam © 2026",
    "search_model": ["pelaporan.LaporanJalan", "auth.User"],
    "user_avatar": None,
    
    # Top Menu Links
    "topmenu_links": [
        {"name": "Beranda Web", "url": "landing", "permissions": ["auth.view_user"]},
        {"name": "Peta Interaktif", "url": "halaman_peta_utama", "permissions": ["auth.view_user"]},
        {"name": "Statistik & Analisis", "url": "admin_statistics", "permissions": ["auth.view_user"]},
    ],
    
    # User Menu
    "usermenu_links": [
        {"name": "Dashboard Pelapor", "url": "dashboard", "icon": "fas fa-columns"},
        {"name": "Statistik Admin", "url": "admin_statistics", "icon": "fas fa-chart-line"},
    ],
    
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    
    # Icons untuk menu model di sidebar
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "pelaporan.LaporanJalan": "fas fa-road-barrier",
        "pelaporan.FotoLaporan": "fas fa-camera",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    
    "related_modal_active": True,
    "custom_css": None,
    "custom_js": None,
    "use_google_fonts_cdn": True,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "default_theme_mode": "auto",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}