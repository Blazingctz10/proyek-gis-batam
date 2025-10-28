# pelaporan/models.py
from django.contrib.gis.db import models

class LaporanJalan(models.Model):
    STATUS_CHOICES = [
        ('BARU', 'Baru'),
        ('DIVERIFIKASI', 'Diverifikasi'),
        ('DIPERBAIKI', 'Diperbaiki'),
        ('SELESEI', 'Selesai'),
    ]

    lokasi = models.PointField(srid=4326, help_text="Lokasi titik jalan rusak")
    deskripsi = models.TextField(blank=True, null=True, help_text="Deskripsi singkat kerusakan")
    
    email_pelapor = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email Pelapor (Opsional)")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BARU')
    tanggal_lapor = models.DateTimeField(auto_now_add=True)
    
    objects = models.Manager()

    def __str__(self):
        return f"Laporan #{self.id} - {self.status}"

# TAMBAHKAN MODEL BARU INI DI BAWAHNYA
class FotoLaporan(models.Model):
    # Hubungkan foto ini ke LaporanJalan
    # related_name='foto_set' akan kita pakai nanti
    laporan = models.ForeignKey(LaporanJalan, related_name='foto_set', on_delete=models.CASCADE)
    foto = models.ImageField(upload_to='laporan_foto/')

    def __str__(self):
        return f"Foto untuk Laporan #{self.laporan.id}"