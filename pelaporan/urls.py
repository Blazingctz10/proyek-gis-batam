# pelaporan/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Public pages
    path('', views.halaman_peta_utama, name='halaman_peta_utama'),
    path('lapor/', views.tambah_laporan, name='tambah_laporan'),
    path('api/data-laporan/', views.data_laporan_geojson, name='data_laporan_geojson'),
    path('faq/', views.faq_view, name='faq'),
    path('tentang/', views.about_view, name='about'),
    path('feedback/', views.feedback_view, name='feedback'),
    
    # ✅ AUTH URLS
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # ✅ USER DASHBOARD URLS
    path('dashboard/', views.dashboard, name='dashboard'),
    path('laporan/<int:laporan_id>/', views.detail_laporan, name='detail_laporan'),
    path('laporan/<int:laporan_id>/edit/', views.edit_laporan, name='edit_laporan'),
    path('laporan/<int:laporan_id>/hapus/', views.hapus_laporan, name='hapus_laporan'),
    path('foto/<int:foto_id>/hapus/', views.hapus_foto_laporan, name='hapus_foto_laporan'),

    # ✅ ADMIN STATISTICS & ANALYTICS URLS
    path('admin-stats/', views.admin_statistics, name='admin_statistics'),
    path('admin-laporan/', views.laporan_list_admin, name='laporan_list_admin'),
    path('export/excel/', views.export_laporan_excel, name='export_excel'),
    path('export/csv/', views.export_laporan_csv, name='export_csv'),
    path('api/heatmap/', views.heatmap_data, name='heatmap_data'),
]    
