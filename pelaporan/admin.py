# pelaporan/admin.py
from django.contrib import admin
from django.contrib.gis import admin as gis_admin 
from .models import LaporanJalan, FotoLaporan
from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import format_html
from django.utils.text import Truncator
from django.contrib import messages

# Inline untuk foto (tidak berubah)
class FotoLaporanInline(admin.TabularInline):
    model = FotoLaporan
    extra = 1
    readonly_fields = ('thumbnail',)
    fields = ('foto', 'thumbnail',)

    def thumbnail(self, obj):
        if obj.foto:
            # Kecilkan sedikit thumbnail di inline jika perlu
            return format_html('<img src="{}" width="100" height="auto" />', obj.foto.url)
        return "Tidak ada gambar"
    thumbnail.short_description = 'Preview Gambar'


@admin.register(LaporanJalan)
class LaporanAdmin(gis_admin.GISModelAdmin):
    # --- 👇👇 LIST DISPLAY DIPERBARUI 👇👇 ---
    list_display = (
        'id',
        'status',
        'email_pelapor', # Tampilkan email
        'short_description', # Tampilkan deskripsi singkat
        'thumbnail_preview', # Tampilkan foto pertama
        'tanggal_lapor'
    )
    # --- 👆👆 BATAS AKHIR LIST DISPLAY 👆👆 ---

    # --- 👇👇 LIST FILTER DIPERBARUI 👇👇 ---
    list_filter = (
        'status',
        ('tanggal_lapor', admin.DateFieldListFilter), # Tambah filter tanggal
    )
    # --- 👆👆 BATAS AKHIR LIST FILTER 👆👆 ---

    # Inline Foto (tidak berubah)
    inlines = [FotoLaporanInline]

    # Pengaturan Peta (tidak berubah, cek ulang koordinat Batam jika perlu)
    default_lat = 1.0456
    default_lon = 104.0305 # Pastikan longitude benar
    default_zoom = 12

    # --- 👇👇 AKSI MASSAL (BULK ACTIONS) BARU 👇👇 ---
    actions = ['mark_verified', 'mark_fixed', 'mark_finished']

    def mark_verified(self, request, queryset):
        updated_count = queryset.update(status='DIVERIFIKASI')
        self.message_user(request, f'{updated_count} laporan ditandai sebagai Diverifikasi.', messages.SUCCESS)
        # Catatan: Aksi massal ini tidak otomatis mengirim email notifikasi
    mark_verified.short_description = "Tandai Terpilih sebagai Diverifikasi"

    def mark_fixed(self, request, queryset):
        updated_count = queryset.update(status='DIPERBAIKI')
        self.message_user(request, f'{updated_count} laporan ditandai sebagai Diperbaiki.', messages.SUCCESS)
    mark_fixed.short_description = "Tandai Terpilih sebagai Diperbaiki"

    def mark_finished(self, request, queryset):
        updated_count = queryset.update(status='SELESAI')
        self.message_user(request, f'{updated_count} laporan ditandai sebagai Selesai.', messages.SUCCESS)
    mark_finished.short_description = "Tandai Terpilih sebagai Selesai"
    # --- 👆👆 BATAS AKHIR AKSI MASSAL 👆👆 ---


    # --- 👇👇 FUNGSI BANTU UNTUK LIST DISPLAY 👇👇 ---
    def short_description(self, obj):
        # Tampilkan 50 karakter pertama deskripsi
        return Truncator(obj.deskripsi).chars(50) if obj.deskripsi else '-'
    short_description.short_description = 'Deskripsi Singkat'

    def thumbnail_preview(self, obj):
        # Ambil foto pertama yang terhubung ke laporan ini
        first_photo = obj.foto_set.first()
        if first_photo and first_photo.foto:
            # Buat thumbnail lebih kecil untuk tabel
            return format_html('<img src="{}" width="70" height="auto" style="border-radius: 4px;" />', first_photo.foto.url)
        return "Tidak Ada Foto"
    thumbnail_preview.short_description = 'Foto Utama'
    # --- 👆👆 BATAS AKHIR FUNGSI BANTU 👆👆 ---


    # Fungsi save_model untuk kirim email (tidak berubah)
    def save_model(self, request, obj, form, change):
        old_status = None
        if change and 'status' in form.changed_data:
            try:
                old_status = LaporanJalan.objects.get(pk=obj.pk).status
            except LaporanJalan.DoesNotExist:
                pass # Objek baru, tidak ada status lama

        super().save_model(request, obj, form, change)

        new_status = obj.status
        email_pelapor = obj.email_pelapor

        if email_pelapor and old_status != new_status:
            subject = ''
            message = ''
            if new_status == 'DIVERIFIKASI':
                subject = f'Laporan Anda #{obj.id} Telah Diverifikasi'
                message = f'Halo,\n\nTerima kasih atas laporan Anda (Laporan #{obj.id}). Laporan Anda telah kami verifikasi dan akan dijadwalkan untuk perbaikan.\n\nAnda bisa memantau statusnya di peta.\n\nTerima kasih,\nTim LaporJalan'
            elif new_status == 'SELESAI':
                subject = f'Laporan Anda #{obj.id} Telah Selesai Diperbaiki'
                message = f'Halo,\n\nKabar baik! Laporan kerusakan jalan (Laporan #{obj.id}) yang Anda kirimkan kini telah selesai diperbaiki.\n\nTerima kasih atas partisipasi Anda.\n\nSalam,\nTim LaporJalan'

            if subject and message:
                try:
                    send_mail(subject, message, settings.EMAIL_HOST_USER, [email_pelapor], fail_silently=False)
                except Exception as e:
                    print(f"GAGAL MENGIRIM EMAIL ke {email_pelapor}: {e}")