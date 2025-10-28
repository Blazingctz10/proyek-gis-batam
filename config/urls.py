# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Arahkan semua traffic ke aplikasi 'pelaporan'
    path('', include('pelaporan.urls')), 
]

# Ini penting untuk menampilkan gambar (foto laporan)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)