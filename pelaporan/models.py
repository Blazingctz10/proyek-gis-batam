# pelaporan/models.py
from django.contrib.gis.db import models
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User

class LaporanJalan(models.Model):
    STATUS_CHOICES = [
        ('BARU', 'Baru'),
        ('DIVERIFIKASI', 'Diverifikasi'),
        ('DIPERBAIKI', 'Diperbaiki'),
        ('SELESAI', 'Selesai'),  # ✅ FIXED TYPO!
    ]
    
    TINGKAT_CHOICES = [  # ✅ TAMBAHAN BARU!
        ('RINGAN', 'Ringan'),
        ('SEDANG', 'Sedang'),
        ('BERAT', 'Berat'),
    ]
    
    JENIS_CHOICES = [  # ✅ TAMBAHAN BARU!
        ('LUBANG', 'Jalan Berlubang'),
        ('RETAK', 'Jalan Retak'),
        ('AMBLAS', 'Jalan Amblas'),
        ('RUSAK_PARAH', 'Rusak Parah'),
        ('LAINNYA', 'Lainnya'),
    ]

    lokasi = models.PointField(srid=4326, help_text="Lokasi titik jalan rusak")
    deskripsi = models.TextField(blank=True, null=True, help_text="Deskripsi singkat kerusakan")
    
    # ✅ TAMBAH RELASI KE USER (NULLABLE untuk backward compatibility)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='laporan_jalan', verbose_name="Pelapor (User)")
    
    email_pelapor = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email Pelapor (Opsional)")
    
    # ✅ FIELD BARU
    jenis_kerusakan = models.CharField(max_length=20, choices=JENIS_CHOICES, default='LAINNYA', verbose_name="Jenis Kerusakan")
    tingkat_kerusakan = models.CharField(max_length=10, choices=TINGKAT_CHOICES, default='SEDANG', verbose_name="Tingkat Kerusakan")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BARU')
    tanggal_lapor = models.DateTimeField(auto_now_add=True)
    tanggal_update = models.DateTimeField(auto_now=True)  # ✅ TAMBAHAN BARU
    
    catatan_admin = models.TextField(blank=True, null=True, help_text="Catatan internal admin")  # ✅ TAMBAHAN BARU
    
    objects = models.Manager()

    def __str__(self):
        return f"Laporan #{self.id} - {self.get_jenis_kerusakan_display()} - {self.status}"
    
    class Meta:
        verbose_name = "Laporan Jalan"
        verbose_name_plural = "Laporan Jalan"
        ordering = ['-tanggal_lapor']  # Terbaru dulu
    
    # ✅ METHOD UNTUK KIRIM EMAIL NOTIFICATION
    def kirim_notifikasi_email(self, subject_tambahan=""):
        """Kirim email notifikasi ke pelapor jika ada email"""
        if not self.email_pelapor:
            return False
        
        status_display = self.get_status_display()
        
        subject = f"Update Laporan Jalan #{self.id}: {status_display}"
        if subject_tambahan:
            subject = f"{subject} - {subject_tambahan}"
        
        # Template email berbeda per status
        if self.status == 'DIVERIFIKASI':
            message = f"""
Halo,

Laporan Anda tentang kerusakan jalan telah DIVERIFIKASI oleh tim kami.

Detail Laporan:
- ID Laporan: #{self.id}
- Jenis Kerusakan: {self.get_jenis_kerusakan_display()}
- Tingkat: {self.get_tingkat_kerusakan_display()}
- Status: {status_display}
- Deskripsi: {self.deskripsi or '-'}

Laporan Anda kini masuk dalam antrian perbaikan. Kami akan memberi tahu Anda saat proses perbaikan dimulai.

Terima kasih atas partisipasi Anda dalam menjaga infrastruktur Kota Batam!

Salam,
Tim LaporJalan Batam
            """
        
        elif self.status == 'DIPERBAIKI':
            message = f"""
Halo,

Kabar baik! Perbaikan untuk laporan Anda sedang dalam PROSES.

Detail Laporan:
- ID Laporan: #{self.id}
- Jenis Kerusakan: {self.get_jenis_kerusakan_display()}
- Status: {status_display}

Tim perbaikan sedang bekerja di lokasi yang Anda laporkan. Kami akan memberi tahu Anda saat perbaikan selesai.

Terima kasih,
Tim LaporJalan Batam
            """
        
        elif self.status == 'SELESAI':
            message = f"""
Halo,

Perbaikan untuk laporan Anda telah SELESAI dilakukan!

Detail Laporan:
- ID Laporan: #{self.id}
- Jenis Kerusakan: {self.get_jenis_kerusakan_display()}
- Status: {status_display}

Terima kasih telah berkontribusi dalam menjaga kualitas infrastruktur Kota Batam. Jika Anda masih menemukan masalah di lokasi tersebut, silakan buat laporan baru.

Salam,
Tim LaporJalan Batam
            """
        
        else:
            message = f"""
Halo,

Status laporan Anda telah diperbarui.

Detail Laporan:
- ID Laporan: #{self.id}
- Status: {status_display}
- Deskripsi: {self.deskripsi or '-'}

Terima kasih,
Tim LaporJalan Batam
            """
        
        try:
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [self.email_pelapor],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"ERROR saat kirim email ke {self.email_pelapor}: {e}")
            return False


class FotoLaporan(models.Model):
    laporan = models.ForeignKey(LaporanJalan, related_name='foto_set', on_delete=models.CASCADE)
    foto = models.ImageField(upload_to='laporan_foto/')
    caption = models.CharField(max_length=200, blank=True, null=True)  # ✅ TAMBAHAN BARU
    tanggal_upload = models.DateTimeField(auto_now_add=True)  # ✅ TAMBAHAN BARU

    def __str__(self):
        return f"Foto untuk Laporan #{self.laporan.id}"
    
    class Meta:
        verbose_name = "Foto Laporan"
        verbose_name_plural = "Foto Laporan"
        ordering = ['-tanggal_upload']