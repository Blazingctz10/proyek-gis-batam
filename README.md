# 🗺️ LaporJalan Batam - WebGIS Pelaporan Jalan Rusak

Aplikasi WebGIS berbasis Django untuk memvisualisasikan, melaporkan, dan mengelola laporan kerusakan jalan di wilayah Batam. Aplikasi ini memungkinkan publik untuk melihat peta sebaran jalan rusak yang telah diverifikasi dan mengirimkan laporan baru lengkap dengan foto dan lokasi. Admin dapat memverifikasi, mengelola status, dan melihat detail laporan melalui antarmuka admin Django yang terintegrasi dengan peta.

## ✨ Fitur Utama

* **Peta Interaktif:** Menampilkan lokasi jalan rusak menggunakan Leaflet.js.
* **Pelaporan Publik:** Formulir untuk mengirim laporan baru dengan penanda lokasi di peta, deskripsi, dan upload multi-foto.
* **Moderasi Admin:** Sistem verifikasi laporan melalui Django Admin, hanya laporan terverifikasi/diproses yang tampil di peta publik.
* **Status Laporan:** Laporan memiliki status (Baru, Diverifikasi, Diperbaiki, Selesai) yang dikelola oleh admin.
* **Popup Peta Informatif:** Menampilkan detail laporan (deskripsi, status, carousel foto) saat pin diklik.
* **Zoom Foto:** Klik dua kali pada foto di popup untuk memperbesar gambar dalam modal.
* **Pengelompokan Pin (Clustering):** Menggabungkan pin yang berdekatan secara otomatis untuk performa dan kejelasan peta (menggunakan `Leaflet.markercluster`).
* **Geolokasi:** Tombol "Cari Lokasi Saya" 🧭 di form lapor untuk memudahkan penentuan lokasi via GPS.
* **Notifikasi Email:** Pengiriman email otomatis ke pelapor (jika email diberikan) saat status laporan diverifikasi atau selesai.
* **Mode Gelap/Terang:** Tombol toggle 🌙/☀️ untuk mengubah tema tampilan.
* **Desain Responsif:** Tampilan yang beradaptasi untuk desktop dan perangkat mobile menggunakan Bootstrap.
* **Animasi Halus:** Efek *fade-in* saat halaman dimuat dan transisi halus pada elemen UI.

## 🛠️ Tumpukan Teknologi (Technology Stack)

* **Backend:** Python 3.x, Django 4.x+
* **GIS Backend:** GeoDjango, GDAL, PROJ
* **Database:** PostgreSQL + PostGIS extension
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **UI Framework:** Bootstrap 5.x
* **Map Library:** Leaflet.js
* **Leaflet Plugins:** Leaflet.markercluster
* **Python Libraries:** `psycopg2-binary`, `Pillow`, `django-recaptcha` (Lihat `requirements.txt` untuk detail)
* **Keamanan Form:** Google reCAPTCHA v2 ("I'm not a robot")

## ⚙️ Persyaratan Sistem (Selain Python)

Sebelum menjalankan proyek ini, pastikan sistem Anda memiliki:

1.  **Database PostgreSQL:** Versi 12 atau lebih baru direkomendasikan.
2.  **Ekstensi PostGIS:** Pastikan PostGIS terinstal **di dalam** database PostgreSQL Anda.
3.  **GDAL & PROJ:** Library Geospasial fundamental yang **wajib** ada.
    * **Windows:** Cara termudah adalah menginstal **OSGeo4W** (`C:\OSGeo4W`). Pastikan path ke `bin` dan `share/proj` dari OSGeo4W sudah ditambahkan ke *Environment Variables* sistem Anda, ATAU atur `GDAL_LIBRARY_PATH` dan `PROJ_LIB` di `settings.py`.
    * **Linux (Ubuntu/Debian):** `sudo apt-get update && sudo apt-get install gdal-bin libgdal-dev python3-gdal` (Perintah `python3-gdal` mungkin tidak wajib jika Anda menggunakan `venv`).
    * **Mac:** Gunakan Homebrew: `brew install gdal proj`.

## 🚀 Setup & Instalasi (Development)

Ikuti langkah-langkah ini untuk menjalankan proyek di komputer lokal Anda:

1.  **Clone Repositori:**
    ```bash
    git clone <URL_REPO_GITHUB_ANDA>
    cd <nama-folder-proyek>
    ```

2.  **Buat & Aktifkan Virtual Environment:**
    ```bash
    # Buat venv
    python -m venv venv

    # Aktifkan venv
    # Windows:
    venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    ```

3.  **Install Dependensi Python:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Setup Database:**
    * Pastikan server PostgreSQL Anda berjalan.
    * Buat database baru (misal: `db_laporan_jalan`) dengan user dan password Anda.
    * Masuk ke database baru tersebut (via `psql` atau pgAdmin) dan jalankan:
        ```sql
        CREATE EXTENSION postgis;
        ```

5.  **Konfigurasi `settings.py`:**
    * Salin `config/settings.py` menjadi `config/local_settings.py` (jika Anda menggunakan pola ini) atau edit langsung `settings.py`.
    * **Wajib:** Atur bagian `DATABASES` agar sesuai dengan nama database, user, dan password PostgreSQL Anda.
    * **Wajib:** Atur `SECRET_KEY` Django Anda sendiri. Jangan gunakan *secret key* *default* di *production*.
    * **Wajib:** Atur `RECAPTCHA_PUBLIC_KEY` dan `RECAPTCHA_PRIVATE_KEY` dengan kunci reCAPTCHA v2 Anda dari Google.
    * **Wajib (Email):** Atur `EMAIL_HOST_USER` dan `EMAIL_HOST_PASSWORD` (gunakan *App Password* Gmail) agar notifikasi email berfungsi.
    * **Pastikan `DEBUG = True`** untuk *development*.
    * **(Opsional):** Jika *environment variable* GDAL/PROJ belum diatur, Anda bisa mengatur `GDAL_LIBRARY_PATH` dan `PROJ_LIB` secara manual di `settings.py` (lihat contoh di kode komentar sebelumnya).

6.  **Jalankan Migrasi Database:**
    Perintah ini akan membuat semua tabel yang dibutuhkan oleh Django dan GeoDjango.
    ```bash
    python manage.py makemigrations pelaporan
    python manage.py migrate
    ```

7.  **Buat Superuser (Admin):**
    Akun ini digunakan untuk login ke `/admin/`.
    ```bash
    python manage.py createsuperuser
    ```

8.  **Jalankan Server Development:**
    ```bash
    python manage.py runserver
    ```

9.  **Akses Aplikasi:**
    * Peta Utama & Legenda: `http://127.0.0.1:8000/`
    * Form Lapor: `http://127.0.0.1:8000/lapor/`
    * Admin Dashboard: `http://127.0.0.1:8000/admin/` (Login dengan akun superuser)

## 📖 Penggunaan

* **Publik:** Buka halaman utama untuk melihat peta jalan rusak yang sudah diverifikasi (warna oranye) atau sedang diperbaiki (warna biru). Klik pin untuk detail dan foto. Gunakan kontrol lapisan untuk ganti *base map*.
* **Melapor:** Buka halaman "Lapor", klik lokasi di peta (atau gunakan tombol 🧭), isi deskripsi, email (opsional), upload satu atau lebih foto, centang reCAPTCHA, lalu kirim.
* **Admin:** Login ke `/admin/`, buka bagian "Pelaporan" -> "Laporan Jalans". Anda bisa melihat semua laporan (termasuk yang "Baru"), mengedit detail, menambah/menghapus foto, dan **mengubah status** untuk memverifikasi atau menandai selesai. Gunakan "Actions" untuk mengubah status banyak laporan sekaligus.

## ☁️ Catatan Deployment (Production)

Untuk menjalankan aplikasi ini di server publik (*Go Live*):

1.  **JANGAN GUNAKAN `runserver` di produksi.**
2.  Atur `DEBUG = False` di `settings.py`.
3.  Konfigurasi `ALLOWED_HOSTS` di `settings.py` dengan nama domain Anda.
4.  Jalankan `python manage.py collectstatic` untuk mengumpulkan file CSS, JS, dan gambar statis.
5.  Gunakan **Gunicorn** (atau *application server* WSGI lain) untuk menjalankan aplikasi Django.
6.  Gunakan **Nginx** (atau *web server* lain) sebagai *reverse proxy* di depan Gunicorn untuk melayani file statis (`staticfiles/`) dan media (`media/`) secara efisien, serta menangani koneksi HTTPS.
7.  Pastikan PostgreSQL, PostGIS, dan GDAL terinstal dengan benar di server produksi.
8.  Gunakan **Cloudflare** (paket gratis) untuk CDN, HTTPS, dan keamanan dasar.

*(Tutorial detail "Deploy Django Gunicorn Nginx" banyak tersedia online).*

---
## 📜 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat file `LICENSE` untuk detail lengkap.