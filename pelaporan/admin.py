# pelaporan/admin.py
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import LaporanJalan, FotoLaporan


class FotoLaporanInline(admin.TabularInline):
    """Inline untuk menampilkan foto di halaman edit laporan"""
    model = FotoLaporan
    extra = 0
    readonly_fields = ['preview_foto', 'tanggal_upload']
    fields = ['preview_foto', 'foto', 'caption', 'tanggal_upload']
    
    def preview_foto(self, obj):
        if obj.foto:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 150px;" />',
                obj.foto.url
            )
        return "-"
    preview_foto.short_description = "Preview"


@admin.register(LaporanJalan)
class LaporanJalanAdmin(GISModelAdmin):
    """Admin untuk model LaporanJalan dengan auto-email notification"""
    
    list_display = [
        'id',
        'status_badge',
        'jenis_kerusakan',
        'tingkat_badge',
        'lokasi_singkat',
        'email_pelapor',
        'tanggal_lapor',
        'jumlah_foto'
    ]
    
    list_filter = [
        'status',
        'jenis_kerusakan',
        'tingkat_kerusakan',
        'tanggal_lapor'
    ]
    
    search_fields = [
        'id',
        'deskripsi',
        'email_pelapor',
        'catatan_admin'
    ]
    
    readonly_fields = [
        'tanggal_lapor',
        'tanggal_update',
        'lokasi_map'
    ]
    
    fieldsets = (
        ('Informasi Laporan', {
            'fields': ('status', 'jenis_kerusakan', 'tingkat_kerusakan', 'deskripsi')
        }),
        ('Lokasi', {
            'fields': ('lokasi', 'lokasi_map')
        }),
        ('Data Pelapor', {
            'fields': ('email_pelapor',)
        }),
        ('Admin', {
            'fields': ('catatan_admin', 'tanggal_lapor', 'tanggal_update'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [FotoLaporanInline]
    
    # Konfigurasi GIS
    default_lon = 104.0304  # Batam center
    default_lat = 1.0456
    default_zoom = 12
    
    def status_badge(self, obj):
        """Tampilkan status dengan badge berwarna"""
        colors = {
            'BARU': '#6c757d',
            'DIVERIFIKASI': '#ffc107',
            'DIPERBAIKI': '#0d6efd',
            'SELESAI': '#198754'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def tingkat_badge(self, obj):
        """Tampilkan tingkat dengan badge berwarna"""
        colors = {
            'RINGAN': '#28a745',
            'SEDANG': '#ffc107',
            'BERAT': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 10px;">{}</span>',
            colors.get(obj.tingkat_kerusakan, '#6c757d'),
            obj.get_tingkat_kerusakan_display()
        )
    tingkat_badge.short_description = 'Tingkat'
    
    def lokasi_singkat(self, obj):
        """Tampilkan koordinat singkat"""
        if obj.lokasi:
            return f"{obj.lokasi.y:.4f}, {obj.lokasi.x:.4f}"
        return "-"
    lokasi_singkat.short_description = 'Koordinat'
    
    def jumlah_foto(self, obj):
        """Hitung jumlah foto"""
        count = obj.foto_set.count()
        if count > 0:
            return format_html(
                '<span style="color: #0d6efd;">📷 {}</span>',
                count
            )
        return "-"
    jumlah_foto.short_description = 'Foto'
    
    def lokasi_map(self, obj):
        """Tampilkan link ke Google Maps"""
        if obj.lokasi:
            url = f"https://www.google.com/maps?q={obj.lokasi.y},{obj.lokasi.x}"
            return format_html(
                '<a href="{}" target="_blank">Buka di Google Maps 🗺️</a>',
                url
            )
        return "-"
    lokasi_map.short_description = 'Lihat di Peta'
    
    # ✅ MAGIC HAPPENS HERE: AUTO SEND EMAIL SAAT STATUS BERUBAH
    def save_model(self, request, obj, form, change):
        """Override save untuk trigger email notification"""
        
        # Cek apakah ini update (bukan create baru)
        if change:
            # Ambil object lama dari database
            old_obj = LaporanJalan.objects.get(pk=obj.pk)
            old_status = old_obj.status
            new_status = obj.status
            
            # Jika status berubah, kirim email
            if old_status != new_status:
                # Simpan dulu
                super().save_model(request, obj, form, change)
                
                # Kirim email (gunakan method di model)
                email_sent = obj.kirim_notifikasi_email()
                
                if email_sent:
                    self.message_user(
                        request,
                        f"✅ Status diubah menjadi '{obj.get_status_display()}' dan email notifikasi telah dikirim ke {obj.email_pelapor}",
                        level='success'
                    )
                else:
                    if obj.email_pelapor:
                        self.message_user(
                            request,
                            f"⚠️ Status diubah, tapi email gagal dikirim ke {obj.email_pelapor}",
                            level='warning'
                        )
                    else:
                        self.message_user(
                            request,
                            f"ℹ️ Status diubah menjadi '{obj.get_status_display()}' (pelapor tidak menyertakan email)",
                            level='info'
                        )
                return
        
        # Jika bukan perubahan status, save normal
        super().save_model(request, obj, form, change)
    
    # Action untuk bulk update status
    @admin.action(description='✅ Verifikasi laporan terpilih')
    def verifikasi_laporan(self, request, queryset):
        count = 0
        for laporan in queryset.filter(status='BARU'):
            laporan.status = 'DIVERIFIKASI'
            laporan.save()
            if laporan.kirim_notifikasi_email():
                count += 1
        
        self.message_user(
            request,
            f"{queryset.count()} laporan diverifikasi, {count} email terkirim"
        )
    
    @admin.action(description='🔧 Tandai sedang diperbaiki')
    def tandai_diperbaiki(self, request, queryset):
        count = 0
        for laporan in queryset.filter(status='DIVERIFIKASI'):
            laporan.status = 'DIPERBAIKI'
            laporan.save()
            if laporan.kirim_notifikasi_email():
                count += 1
        
        self.message_user(
            request,
            f"{queryset.count()} laporan ditandai sedang diperbaiki, {count} email terkirim"
        )
    
    @admin.action(description='✔️ Tandai selesai diperbaiki')
    def tandai_selesai(self, request, queryset):
        count = 0
        for laporan in queryset.filter(status='DIPERBAIKI'):
            laporan.status = 'SELESAI'
            laporan.save()
            if laporan.kirim_notifikasi_email():
                count += 1
        
        self.message_user(
            request,
            f"{queryset.count()} laporan ditandai selesai, {count} email terkirim"
        )
    
    actions = [verifikasi_laporan, tandai_diperbaiki, tandai_selesai]


@admin.register(FotoLaporan)
class FotoLaporanAdmin(admin.ModelAdmin):
    """Admin untuk model FotoLaporan"""
    
    list_display = ['id', 'preview_thumb', 'laporan_link', 'caption', 'tanggal_upload']
    list_filter = ['tanggal_upload']
    search_fields = ['caption', 'laporan__id']
    readonly_fields = ['preview_large', 'tanggal_upload']
    
    fields = ['laporan', 'foto', 'preview_large', 'caption', 'tanggal_upload']
    
    def preview_thumb(self, obj):
        if obj.foto:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 75px;" />',
                obj.foto.url
            )
        return "-"
    preview_thumb.short_description = "Thumbnail"
    
    def preview_large(self, obj):
        if obj.foto:
            return format_html(
                '<img src="{}" style="max-width: 500px;" />',
                obj.foto.url
            )
        return "-"
    preview_large.short_description = "Preview Besar"
    
    def laporan_link(self, obj):
        url = reverse('admin:pelaporan_laporanjalan_change', args=[obj.laporan.id])
        return format_html(
            '<a href="{}">Laporan #{}</a>',
            url,
            obj.laporan.id
        )
    laporan_link.short_description = "Laporan Terkait"