# pelaporan/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # 1. Halaman Peta Utama (Homepage)
    path('', views.halaman_peta_utama, name='halaman_peta_utama'),
    
    # 2. Halaman Form Lapor
    path('lapor/', views.tambah_laporan, name='tambah_laporan'),
    
    # 3. API Endpoint untuk data GeoJSON
    path('api/data-laporan/', views.data_laporan_geojson, name='data_laporan_geojson'),
]