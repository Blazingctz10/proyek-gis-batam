# pelaporan/views.py
from django.shortcuts import render # Hapus redirect
from django.http import JsonResponse # Gunakan JsonResponse
from django.contrib.gis.geos import Point, GEOSGeometry, GEOSException # Impor GIS
from .models import LaporanJalan, FotoLaporan # Impor model
from .forms import LaporanForm, FeedbackForm # Impor form
from django.contrib import messages # Tetap pakai messages untuk fallback non-AJAX & halaman lain
from pathlib import Path # Impor Path
from django.conf import settings # Impor settings
from django.core.mail import send_mail # Impor send_mail

# Ambil BASE_DIR dari settings
BASE_DIR = settings.BASE_DIR

# --- CACHING UNTUK BATAS BATAM ---
_batam_boundary_cache = None # Variabel global untuk menyimpan geometri

def get_batam_boundary():
    """
    Fungsi helper untuk membaca WKT dari file, DENGAN CACHING.
    Hanya membaca file jika belum ada di cache.
    """
    global _batam_boundary_cache # Gunakan variabel global

    if _batam_boundary_cache is not None:
        print("Menggunakan Batas Batam dari cache.") # Debug
        return _batam_boundary_cache

    print("Membaca Batas Batam dari file...") # Debug
    WKT_FILE_PATH = BASE_DIR / 'batas_batam.wkt'
    boundary = None # Default jika gagal
    try:
        if WKT_FILE_PATH.is_file():
            with open(WKT_FILE_PATH, 'r', encoding='utf-8') as f:
                batas_wkt_string = f.read().strip()
            if batas_wkt_string:
                boundary = GEOSGeometry(batas_wkt_string, srid=4326)
                print("GEOSGeometry BERHASIL dibuat!") # Debug sukses
            else:
                print("PERINGATAN (views-cache): File batas_batam.wkt kosong.")
        else:
            print(f"PERINGATAN (views-cache): File batas wilayah TIDAK DITEMUKAN di {WKT_FILE_PATH}")

    except GEOSException as e:
        print(f"ERROR GEOS (views-cache): Gagal membuat geometri dari WKT: {e}")
    except Exception as e:
        print(f"ERROR LAIN (views-cache) saat memuat batas Batam: {type(e).__name__} - {e}")

    _batam_boundary_cache = boundary
    return _batam_boundary_cache
# --- BATAS AKHIR CACHING ---


# --- VIEWS APLIKASI ---

def halaman_peta_utama(request):
    """Menampilkan halaman peta utama (homepage). Tetap gunakan render."""
    context = {'title': 'Peta Laporan Jalan Rusak'}
    return render(request, 'pelaporan/peta_utama.html', context)

def data_laporan_geojson(request):
    """API endpoint untuk mengirim data GeoJSON ke Leaflet (tidak berubah)."""
    laporan_valid = LaporanJalan.objects.filter(
        status__in=['DIVERIFIKASI', 'DIPERBAIKI']
    )
    features = []
    for laporan in laporan_valid:
        foto_urls = [foto.foto.url for foto in laporan.foto_set.all()]
        features.append({
            "type": "Feature", "id": laporan.id,
            "properties": {
                "deskripsi": laporan.deskripsi, "status": laporan.status, "foto_urls": foto_urls
            },
            "geometry": {"type": "Point", "coordinates": [laporan.lokasi.x, laporan.lokasi.y]}
        })
    data_geojson = {"type": "FeatureCollection", "features": features}
    return JsonResponse(data_geojson)

def tambah_laporan(request):
    """Menampilkan halaman form (GET) atau memproses data POST via AJAX."""
    if request.method == 'POST':
        form = LaporanForm(request.POST, request.FILES) # Kirim FILES juga

        if form.is_valid():
            lat = form.cleaned_data['latitude']
            lon = form.cleaned_data['longitude']
            lokasi_point = Point(float(lon), float(lat), srid=4326)

            # Validasi Batas Wilayah
            batam_boundary_geom = get_batam_boundary()
            if batam_boundary_geom and not lokasi_point.within(batam_boundary_geom):
                # Kembalikan error geofencing sebagai JSON
                return JsonResponse({'status': 'error', 'message': 'Lokasi laporan harus berada di dalam wilayah Batam.'}, status=400)
            elif not batam_boundary_geom:
                print("PERINGATAN (views): Tidak dapat memvalidasi batas Batam, laporan tetap disimpan.")

            # Lanjutkan penyimpanan
            laporan = form.save(commit=False)
            laporan.lokasi = lokasi_point
            laporan.save()

            # Simpan multiple foto
            foto_list = request.FILES.getlist('foto_uploads')
            for f in foto_list:
                FotoLaporan.objects.create(laporan=laporan, foto=f)

            # Kembalikan pesan sukses sebagai JSON
            return JsonResponse({'status': 'success', 'message': 'Laporan Anda telah berhasil dikirim dan menunggu verifikasi.'})

        else: # Jika form TIDAK valid
            # --- Print error form untuk debugging ---
            print("Form Errors:", form.errors.as_json())
            # --- Akhir Print ---
            errors_dict = {field: [e for e in errors] for field, errors in form.errors.items()}
            return JsonResponse({'status': 'form_error', 'errors': errors_dict, 'message': 'Harap perbaiki kesalahan pada form.'}, status=400)

    # Jika request GET
    else:
        form = LaporanForm()
        context = {'form': form, 'title': 'Lapor Jalan Rusak'}
        return render(request, 'pelaporan/form_laporan.html', context)

# View untuk FAQ (tidak berubah)
def faq_view(request):
    context = {'title': 'Pertanyaan Umum (FAQ)'}
    return render(request, 'pelaporan/faq.html', context)

# View untuk Tentang (tidak berubah)
def about_view(request):
    context = {'title': 'Tentang LaporJalan Batam'}
    return render(request, 'pelaporan/about.html', context)

# View untuk Feedback (tidak berubah)
def feedback_view(request):
    if request.method == 'POST':
        form = FeedbackForm(request.POST)
        if form.is_valid():
            nama = form.cleaned_data['nama']
            email = form.cleaned_data['email']
            subjek = form.cleaned_data['subjek']
            pesan = form.cleaned_data['pesan']

            email_subject = f"Feedback LaporJalan: {subjek}"
            email_body = (f"Feedback baru:\n\nDari: {nama if nama else 'Anonim'}\nEmail: {email if email else '-'}\n\n{pesan}")
            try:
                send_mail(email_subject, email_body, settings.EMAIL_HOST_USER, [settings.EMAIL_HOST_USER], fail_silently=False)
                messages.success(request, 'Terima kasih atas umpan balik Anda!')
                return redirect('halaman_peta_utama')
            except Exception as e:
                messages.error(request, f'Maaf, terjadi kesalahan saat mengirim pesan: {e}')
    else:
        form = FeedbackForm()
    context = {'form': form, 'title': 'Kirim Umpan Balik'}
    return render(request, 'pelaporan/feedback.html', context)