# pelaporan/management/commands/seed_laporan.py
import os
import shutil
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.core.files import File
from django.conf import settings
from pelaporan.models import LaporanJalan, FotoLaporan
from pelaporan.views import get_batam_boundary

class Command(BaseCommand):
    help = "Clear all existing reports and seed 28 realistic demo road damage reports across Batam with placeholder photos."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("=== MEMULAI RESET & SEEDING LAPORAN JALAN BATAM ==="))

        # 1. Clear database completely
        foto_count = FotoLaporan.objects.count()
        laporan_count = LaporanJalan.objects.count()
        FotoLaporan.objects.all().delete()
        LaporanJalan.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Berhasil menghapus {laporan_count} laporan dan {foto_count} foto dari database."))

        # 2. Prepare sample photos
        sample_dir = settings.BASE_DIR / 'media' / 'sample_road_damage'
        photo_samples = {
            'LUBANG': sample_dir / 'pothole.jpg',
            'RETAK': sample_dir / 'cracked.jpg',
            'AMBLAS': sample_dir / 'amblas.jpg',
            'RUSAK_PARAH': sample_dir / 'repair.jpg',
            'LAINNYA': sample_dir / 'pothole.jpg',
        }

        # 3. Realistic Reports Dataset across Batam Sub-districts
        reports_data = [
            # --- BATAM KOTA & BATAM CENTRE ---
            {
                "subdistrict": "Batam Centre",
                "lat": 1.1286, "lng": 104.0538,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "DIPERBAIKI",
                "deskripsi": "Lubang aspal sedalam 8 cm di lajur kiri Jl. Engku Putri, tepat 100 meter sebelum Bundaran BP Batam. Membahayakan pengendara motor pada malam hari.",
                "days_ago": 4, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Batam Centre",
                "lat": 1.1345, "lng": 104.0480,
                "jenis": "RETAK", "tingkat": "RINGAN", "status": "DIVERIFIKASI",
                "deskripsi": "Retak buaya di persimpangan Jl. Raja Haji Fisabilillah menuju Pasir Putih. Aspal mulai terkelupas dan bergelombang.",
                "days_ago": 7, "photo_key": "RETAK"
            },
            {
                "subdistrict": "Batam Kota",
                "lat": 1.1290, "lng": 104.0585,
                "jenis": "LUBANG", "tingkat": "BERAT", "status": "BARU",
                "deskripsi": "Lubang menganga cukup dalam di dekat pintu keluar Mega Mall Batam Centre, lajur lambat arah Alun-alun Engku Putri.",
                "days_ago": 1, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Batam Kota",
                "lat": 1.1215, "lng": 104.0250,
                "jenis": "RUSAK_PARAH", "tingkat": "BERAT", "status": "DIPERBAIKI",
                "deskripsi": "Aspal terkelupas parah di turunan Flyover Laluan Madani mengarah ke Simpang Kabil. Sedang dipasang rambu drum peringatan.",
                "days_ago": 6, "photo_key": "RUSAK_PARAH"
            },
            {
                "subdistrict": "Batam Kota",
                "lat": 1.1130, "lng": 104.0620,
                "jenis": "AMBLAS", "tingkat": "BERAT", "status": "SELESAI",
                "deskripsi": "Amblas saluran gorong-gorong di Jl. Tengku Sulung depan Perumahan KDA Batam Kota. Perbaikan pengaspalan ulang telah selesai tuntas.",
                "days_ago": 18, "photo_key": "AMBLAS"
            },

            # --- NAGOYA (LUBUK BAJA) ---
            {
                "subdistrict": "Nagoya",
                "lat": 1.1420, "lng": 104.0125,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "BARU",
                "deskripsi": "Beberapa titik lubang jalan di Jl. Imam Bonjol depan Hotel Nagoya Plaza. Sering tergenang air saat hujan lebat.",
                "days_ago": 2, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Nagoya",
                "lat": 1.1455, "lng": 104.0150,
                "jenis": "RETAK", "tingkat": "RINGAN", "status": "DIVERIFIKASI",
                "deskripsi": "Permukaan aspal retak memanjang di Jl. Teuku Umar akses keluar Nagoya Hill Mall. Mulai membuat laju kendaraan tidak rata.",
                "days_ago": 5, "photo_key": "RETAK"
            },
            {
                "subdistrict": "Nagoya",
                "lat": 1.1378, "lng": 104.0135,
                "jenis": "AMBLAS", "tingkat": "BERAT", "status": "DIPERBAIKI",
                "deskripsi": "Badan jalan amblas sekitar 15 cm di Jl. Raden Patah arah Simpang Baloi. Petugas sedang melakukan penimbunan agregat batu pecah.",
                "days_ago": 8, "photo_key": "AMBLAS"
            },
            {
                "subdistrict": "Nagoya",
                "lat": 1.1350, "lng": 104.0280,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Lubang jalan aspal di Simpang Sei Panas arah Nagoya. Lubang sudah ditambal hotmix halus oleh dinas terkait.",
                "days_ago": 22, "photo_key": "RUSAK_PARAH"
            },

            # --- BATU AJI ---
            {
                "subdistrict": "Batu Aji",
                "lat": 1.0520, "lng": 103.9880,
                "jenis": "LUBANG", "tingkat": "BERAT", "status": "DIPERBAIKI",
                "deskripsi": "Jalan berlubang besar dan bergelombang di Jl. R. Suprapto depan SP Plaza Batu Aji. Sering dilewati truk kontainer berat.",
                "days_ago": 9, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Batu Aji",
                "lat": 1.0650, "lng": 103.9650,
                "jenis": "RUSAK_PARAH", "tingkat": "BERAT", "status": "DIVERIFIKASI",
                "deskripsi": "Kerusakan aspal parah dan berbatu di Simpang Basecamp menuju Marina. Pengendara roda dua harus ekstra hati-hati.",
                "days_ago": 3, "photo_key": "RUSAK_PARAH"
            },
            {
                "subdistrict": "Batu Aji",
                "lat": 1.0720, "lng": 103.9520,
                "jenis": "AMBLAS", "tingkat": "BERAT", "status": "BARU",
                "deskripsi": "Bahu jalan amblas tergerus air hujan di Jl. Brigjen Katamso dekat galangan kapal Tanjung Uncang.",
                "days_ago": 1, "photo_key": "AMBLAS"
            },
            {
                "subdistrict": "Batu Aji",
                "lat": 1.0580, "lng": 103.9810,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Penambalan lubang di Jl. Pahlawan depan RSUD Embung Fatimah Batu Aji telah selesai dikerjakan dengan rapi.",
                "days_ago": 15, "photo_key": "LUBANG"
            },

            # --- SEKUPANG ---
            {
                "subdistrict": "Sekupang",
                "lat": 1.1150, "lng": 103.9520,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "BARU",
                "deskripsi": "Lubang aspal di tikungan Jl. KH Ahmad Dahlan dekat lampu merah Sei Harapan Sekupang.",
                "days_ago": 2, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Sekupang",
                "lat": 1.1250, "lng": 103.9350,
                "jenis": "RETAK", "tingkat": "SEDANG", "status": "DIPERBAIKI",
                "deskripsi": "Retak parah dan kontur jalan miring di Jl. RE Martadinata arah Pelabuhan Domestik Sekupang. Sedang perataan pondasi.",
                "days_ago": 11, "photo_key": "RETAK"
            },
            {
                "subdistrict": "Sekupang",
                "lat": 1.1120, "lng": 103.9610,
                "jenis": "AMBLAS", "tingkat": "RINGAN", "status": "DIVERIFIKASI",
                "deskripsi": "Turunan aspal amblas tipis di samping jembatan Sei Harapan menuju Tiban. Membutuhkan pelapisan ulang.",
                "days_ago": 4, "photo_key": "AMBLAS"
            },
            {
                "subdistrict": "Sekupang",
                "lat": 1.1180, "lng": 103.9450,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Lubang jalan di Jl. Dr Cipto Mangunkusumo depan kawasan perkantoran Sekupang telah tuntas diaspal.",
                "days_ago": 20, "photo_key": "LUBANG"
            },

            # --- TIBAN ---
            {
                "subdistrict": "Tiban",
                "lat": 1.1180, "lng": 103.9850,
                "jenis": "LUBANG", "tingkat": "BERAT", "status": "DIPERBAIKI",
                "deskripsi": "Lubang beruntun di Jl. Gajah Mada arah Tiban Kampung. Titik rawan kecelakaan di saat hujan deras.",
                "days_ago": 5, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Tiban",
                "lat": 1.1290, "lng": 103.9810,
                "jenis": "AMBLAS", "tingkat": "BERAT", "status": "BARU",
                "deskripsi": "Jalan perbukitan amblas separuh lajur di jalur Simpang Mentarau menuju Tiban Indah.",
                "days_ago": 1, "photo_key": "AMBLAS"
            },
            {
                "subdistrict": "Tiban",
                "lat": 1.1125, "lng": 103.9890,
                "jenis": "RETAK", "tingkat": "RINGAN", "status": "DIVERIFIKASI",
                "deskripsi": "Retak rambut di aspal Jl. Tiban Raya depan pusat kuliner Tiban Centre. Belum terlalu dalam namun melebar.",
                "days_ago": 6, "photo_key": "RETAK"
            },
            {
                "subdistrict": "Tiban",
                "lat": 1.1155, "lng": 103.9780,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Penambalan aspal jalan berlubang di Simpang Tiban III telah rampung dan permukaan jalan kembali mulus.",
                "days_ago": 14, "photo_key": "RUSAK_PARAH"
            },

            # --- SAGULUNG ---
            {
                "subdistrict": "Sagulung",
                "lat": 1.0380, "lng": 103.9920,
                "jenis": "LUBANG", "tingkat": "BERAT", "status": "DIPERBAIKI",
                "deskripsi": "Aspal tergerus parah di Jl. Dapur 12 Sagulung dekat pasar basah. Sering dilalui kendaraan niaga dan dump truck.",
                "days_ago": 7, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Sagulung",
                "lat": 1.0420, "lng": 103.9850,
                "jenis": "RUSAK_PARAH", "tingkat": "BERAT", "status": "DIVERIFIKASI",
                "deskripsi": "Permukaan jalan bergelombang dan berlubang tajam di Simpang Fanindo Sagulung arah Dapur 12.",
                "days_ago": 4, "photo_key": "RUSAK_PARAH"
            },
            {
                "subdistrict": "Sagulung",
                "lat": 1.0340, "lng": 103.9990,
                "jenis": "AMBLAS", "tingkat": "SEDANG", "status": "BARU",
                "deskripsi": "Bahu jalan amblas di Kavling Flamboyan Sagulung, membuat tepi selokan rawan runtuh jika dilintasi mobil.",
                "days_ago": 2, "photo_key": "AMBLAS"
            },
            {
                "subdistrict": "Sagulung",
                "lat": 1.0480, "lng": 103.9950,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Perbaikan tambal sulam di Simpang Nato Sagulung telah selesai dilakukan pihak kontraktor pemeliharaan jalan.",
                "days_ago": 25, "photo_key": "LUBANG"
            },

            # --- BENGKONG ---
            {
                "subdistrict": "Bengkong",
                "lat": 1.1480, "lng": 104.0320,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "DIPERBAIKI",
                "deskripsi": "Lubang jalan aspal di Jl. Bengkong Kolam arah Bengkong Harapan. Roda kendaraan sering terantuk keras.",
                "days_ago": 5, "photo_key": "LUBANG"
            },
            {
                "subdistrict": "Bengkong",
                "lat": 1.1620, "lng": 104.0290,
                "jenis": "RETAK", "tingkat": "RINGAN", "status": "DIVERIFIKASI",
                "deskripsi": "Retak aspal di Jl. Golden Prawn Bengkong Laut arah restoran laut. Permukaan sedikit bergelombang.",
                "days_ago": 8, "photo_key": "RETAK"
            },
            {
                "subdistrict": "Bengkong",
                "lat": 1.1420, "lng": 104.0350,
                "jenis": "RUSAK_PARAH", "tingkat": "BERAT", "status": "BARU",
                "deskripsi": "Kerusakan jalan parah dan aspal hancur di Simpang Bengkong Sadai akibat sering dilewati kendaraan proyek.",
                "days_ago": 1, "photo_key": "RUSAK_PARAH"
            },
            {
                "subdistrict": "Bengkong",
                "lat": 1.1510, "lng": 104.0380,
                "jenis": "LUBANG", "tingkat": "SEDANG", "status": "SELESAI",
                "deskripsi": "Perbaikan lubang jalan di Jl. Yos Sudarso Bengkong Baru telah tuntas diaspal rata.",
                "days_ago": 16, "photo_key": "LUBANG"
            },
        ]

        # 4. Create and Save Reports with Photos
        created_count = 0
        now = timezone.now()

        for item in reports_data:
            report_time = now - timedelta(days=item["days_ago"], hours=item["days_ago"]*2, minutes=15)
            
            laporan = LaporanJalan(
                lokasi=Point(item["lng"], item["lat"], srid=4326),
                deskripsi=item["deskripsi"],
                jenis_kerusakan=item["jenis"],
                tingkat_kerusakan=item["tingkat"],
                status=item["status"],
                email_pelapor=f"warga.{item['subdistrict'].lower().replace(' ', '')}@gmail.com",
            )
            laporan.save()

            # Set realistic past dates
            LaporanJalan.objects.filter(id=laporan.id).update(
                tanggal_lapor=report_time,
                tanggal_update=report_time + timedelta(hours=12)
            )

            # Attach realistic sample road photo
            photo_path = photo_samples.get(item["photo_key"], sample_dir / 'pothole.jpg')
            if photo_path.exists():
                with open(photo_path, 'rb') as f:
                    foto_obj = FotoLaporan(laporan=laporan)
                    foto_obj.foto.save(f"seed_{laporan.id}_{photo_path.name}", File(f), save=True)

            created_count += 1
            self.stdout.write(f"[{created_count}/28] #{laporan.id} {item['subdistrict']}: {item['jenis']} - {item['status']}")

        self.stdout.write(self.style.SUCCESS(f"\nSUKSES! Berhasil membuat {created_count} laporan baru dengan foto dokumentasi kerusakan jalan di seluruh Batam."))
