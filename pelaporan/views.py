# pelaporan/views.py
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.gis.geos import Point # Untuk mengubah lat/lon ke Point
from .models import LaporanJalan, FotoLaporan
from .forms import LaporanForm

def halaman_peta_utama(request):
    """Menampilkan halaman peta utama (homepage)."""
    context = {
        'title': 'Peta Laporan Jalan Rusak'
    }
    return render(request, 'pelaporan/peta_utama.html', context)

def data_laporan_geojson(request):
    laporan_valid = LaporanJalan.objects.filter(
        status__in=['DIVERIFIKASI', 'DIPERBAIKI']
    )

    # Kita buat GeoJSON secara manual
    features = []
    for laporan in laporan_valid:
        # Ambil semua URL foto untuk laporan ini
        foto_urls = [foto.foto.url for foto in laporan.foto_set.all()]
        
        features.append({
            "type": "Feature",
            "id": laporan.id,
            "properties": {
                "deskripsi": laporan.deskripsi,
                "status": laporan.status,
                "foto_urls": foto_urls # <-- Ini mengirim array foto
            },
            "geometry": {
                "type": "Point",
                "coordinates": [laporan.lokasi.x, laporan.lokasi.y]
            }
        })

    # Buat struktur GeoJSON final
    data_geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Perhatikan: Ini mengirim 'data_geojson' (sebuah dict)
    # Ini akan otomatis menjadi JSON Objek
    return JsonResponse(data_geojson)

def tambah_laporan(request):
    """Menampilkan halaman form dan memproses data POST."""
    if request.method == 'POST':
        # 1. JANGAN kirim request.FILES ke form
        form = LaporanForm(request.POST) 
        
        # 2. INI DIA BARIS YANG HILANG!
        #    Ambil file foto secara manual dari <input name="foto_uploads">
        foto_list = request.FILES.getlist('foto_uploads')

        if form.is_valid():
            # 3. Simpan laporan utama (tanpa commit dulu)
            laporan = form.save(commit=False)
            
            lat = form.cleaned_data['latitude']
            lon = form.cleaned_data['longitude']
            
            laporan.lokasi = Point(float(lon), float(lat), srid=4326) # Ganti srid=4326 jika perlu
            
            laporan.save() # Simpan LaporanJalan utama

            # 4. Loop semua file foto yang di-upload
            for f in foto_list:
                # Buat objek FotoLaporan baru untuk setiap foto
                FotoLaporan.objects.create(
                    laporan=laporan,  # <-- Hubungkan ke laporan utama
                    foto=f            # <-- Simpan filenya
                )
            
            # 5. Arahkan kembali ke halaman peta utama
            return redirect('halaman_peta_utama')
    else:
        # Jika request GET, tampilkan form kosong
        form = LaporanForm()

    context = {
        'form': form,
        'title': 'Lapor Jalan Rusak'
    }
    return render(request, 'pelaporan/form_laporan.html', context)