# pelaporan/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.halaman_peta_utama, name='halaman_peta_utama'),
    path('lapor/', views.tambah_laporan, name='tambah_laporan'),
    path('api/data-laporan/', views.data_laporan_geojson, name='data_laporan_geojson'),
    path('faq/', views.faq_view, name='faq'),

    # 👇👇 VERIFY THIS LINE IS CORRECT 👇👇
    path('tentang/', views.about_view, name='about'),

    path('feedback/', views.feedback_view, name='feedback'),
]