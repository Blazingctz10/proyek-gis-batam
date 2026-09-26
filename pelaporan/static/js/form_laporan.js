// static/js/form_laporan.js
// Multi-Step Wizard Controller for LaporJalan Batam WebGIS

document.addEventListener("DOMContentLoaded", function() {

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // --- Elemen Input Form ---
    const latInput = document.getElementById('id_latitude');
    const lonInput = document.getElementById('id_longitude');
    const latDisplay = document.getElementById('lat-display');
    const lonDisplay = document.getElementById('lon-display');
    const formElement = document.getElementById('laporan-form'); 
    const submitBtn = document.getElementById('submit-btn');
    const submitTextSpan = submitBtn ? submitBtn.querySelector('.submit-text') : null;
    const spinnerSpan = submitBtn ? submitBtn.querySelector('.spinner-border') : null;
    const deskripsiInput = document.getElementById('id_deskripsi');
    const jenisInput = document.getElementById('id_jenis_kerusakan');
    const tingkatInput = document.getElementById('id_tingkat_kerusakan');
    const fotoInput = document.getElementById('id_foto_upload');

    // --- Elemen Wizard & Stepper ---
    const panel1 = document.getElementById('panel-step-1');
    const panel2 = document.getElementById('panel-step-2');
    const panel3 = document.getElementById('panel-step-3');

    const step1 = document.getElementById('stepper-step-1');
    const step2 = document.getElementById('stepper-step-2');
    const step3 = document.getElementById('stepper-step-3');

    const btnGotoStep2 = document.getElementById('btn-goto-step-2');
    const btnGotoStep3 = document.getElementById('btn-goto-step-3');

    const addressCard = document.getElementById('detected-address-card');
    const addressText = document.getElementById('detected-address-text');
    const noLocationHint = document.getElementById('no-location-hint');
    const btnUseAddress = document.getElementById('btn-use-address');
    const btnCopyCoords = document.getElementById('btn-copy-coords');

    const step2LocationPreview = document.getElementById('step2-location-preview');
    const summaryCoords = document.getElementById('summary-coords');
    const summaryAddress = document.getElementById('summary-address');
    const summaryJenis = document.getElementById('summary-jenis');
    const summaryTingkat = document.getElementById('summary-tingkat');
    const summaryPhotos = document.getElementById('summary-photos');

    let currentDetectedAddress = '';
    let currentStep = 1;

    // --- 1. Inisialisasi Peta Leaflet (OpenStreetMap 100% Bebas API Key) ---
    const defaultCenter = [1.1250, 104.0380];
    const map = L.map('map').setView(defaultCenter, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    let marker = null;

    // Custom GIS pin icon dengan pulsing halo
    const customPinIcon = L.divIcon({
        className: 'custom-gis-pin-container',
        html: `
            <div class="custom-gis-pin pin-menunggu">
                <div class="pin-halo"></div>
                <div class="pin-core"><i class="fa-solid fa-location-dot"></i></div>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -20]
    });

    // --- 2. Reverse Geocoding via Nominatim OSM ---
    let geocodeTimeout = null;
    function fetchReverseGeocode(lat, lon) {
        if (geocodeTimeout) clearTimeout(geocodeTimeout);
        geocodeTimeout = setTimeout(() => {
            if (addressText) addressText.textContent = "Mencari nama jalan & kawasan...";
            if (addressCard) addressCard.classList.remove('d-none');
            if (noLocationHint) noLocationHint.classList.add('d-none');

            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        const road = data.address.road || data.address.pedestrian || data.address.street;
                        const suburb = data.address.suburb || data.address.village || data.address.city_district || '';
                        const city = data.address.city || 'Kota Batam';
                        
                        let displayParts = [];
                        if (road) displayParts.push(road);
                        if (suburb) displayParts.push(suburb);
                        if (city) displayParts.push(city);
                        
                        currentDetectedAddress = displayParts.join(', ') || data.display_name.split(',').slice(0, 3).join(',');
                        if (addressText) addressText.textContent = currentDetectedAddress;
                        if (marker) marker.bindPopup(`<strong>${currentDetectedAddress}</strong>`).openPopup();
                    } else {
                        currentDetectedAddress = `Titik Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                        if (addressText) addressText.textContent = currentDetectedAddress;
                    }
                })
                .catch(() => {
                    currentDetectedAddress = `Titik Lokasi: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                    if (addressText) addressText.textContent = currentDetectedAddress;
                });
        }, 300);
    }

    // --- 3. Update Titik Marker & Form ---
    function updateMarkerAndForm(latlng) {
        const lat = typeof latlng.lat === 'number' ? latlng.lat : parseFloat(latlng.lat);
        const lon = typeof latlng.lng === 'number' ? latlng.lng : parseFloat(latlng.lng);
        
        if (latDisplay) latDisplay.textContent = lat.toFixed(6);
        if (lonDisplay) lonDisplay.textContent = lon.toFixed(6);
        if (latInput) latInput.value = lat;
        if (lonInput) lonInput.value = lon;
        
        if (marker) {
            marker.setLatLng([lat, lon]);
        } else {
            marker = L.marker([lat, lon], { icon: customPinIcon, draggable: true }).addTo(map);
            marker.on('dragend', function(e) { updateMarkerAndForm(e.target.getLatLng()); });
        }

        fetchReverseGeocode(lat, lon);

        // Aktifkan tombol Lanjut ke Langkah 2
        if (btnGotoStep2) {
            btnGotoStep2.disabled = false;
        }
        if (noLocationHint) {
            noLocationHint.classList.add('d-none');
        }
    }

    // Salin koordinat
    if (btnCopyCoords) {
        btnCopyCoords.addEventListener('click', function() {
            if (!latInput.value || !lonInput.value) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'info', title: 'Pilih titik di peta terlebih dahulu' });
                }
                return;
            }
            const coordText = `${parseFloat(latInput.value).toFixed(6)}, ${parseFloat(lonInput.value).toFixed(6)}`;
            navigator.clipboard.writeText(coordText).then(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'Koordinat tersalin: ' + coordText });
                }
            });
        });
    }

    // Sisipkan alamat ke deskripsi
    if (btnUseAddress) {
        btnUseAddress.addEventListener('click', function() {
            if (!currentDetectedAddress || !deskripsiInput) return;
            const prefix = `[Lokasi: ${currentDetectedAddress}] `;
            if (!deskripsiInput.value.includes(prefix)) {
                deskripsiInput.value = prefix + (deskripsiInput.value ? ('\n' + deskripsiInput.value) : '');
                deskripsiInput.focus();
            }
            if (typeof Swal !== 'undefined') {
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, icon: 'success', title: 'Alamat disisipkan ke deskripsi!' });
            }
        });
    }

    // Quick Tag Chips
    document.querySelectorAll('.quick-tag-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            if (!deskripsiInput) return;
            const tagText = this.getAttribute('data-tag');
            const formattedTag = `[${tagText}]`;
            
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                deskripsiInput.value = deskripsiInput.value.replace(formattedTag, '').replace(/\s{2,}/g, ' ').trim();
            } else {
                this.classList.add('active');
                deskripsiInput.value = (deskripsiInput.value.trim() ? (deskripsiInput.value.trim() + ' ') : '') + formattedTag;
            }
        });
    });

    // --- 4. WIZARD STEP NAVIGATION ENGINE ---
    function goToStep(targetStep) {
        // Validasi saat ingin berpindah maju
        if (targetStep === 2) {
            if (!latInput.value || !lonInput.value) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Titik Lokasi Wajib Dipilih', 'Silakan klik titik lokasi jalan yang rusak pada peta terlebih dahulu.', 'warning');
                } else {
                    alert('Silakan klik titik lokasi pada peta terlebih dahulu!');
                }
                return;
            }
            // Update preview di langkah 2
            if (step2LocationPreview) {
                const latStr = parseFloat(latInput.value).toFixed(5);
                const lonStr = parseFloat(lonInput.value).toFixed(5);
                step2LocationPreview.textContent = `${latStr}, ${lonStr} ${currentDetectedAddress ? ('— ' + currentDetectedAddress) : ''}`;
            }
        }

        if (targetStep === 3) {
            // Validasi data rincian langkah 2
            let valid = true;
            if (jenisInput && !jenisInput.value) {
                jenisInput.classList.add('is-invalid');
                valid = false;
            } else if (jenisInput) {
                jenisInput.classList.remove('is-invalid');
            }

            if (tingkatInput && !tingkatInput.value) {
                tingkatInput.classList.add('is-invalid');
                valid = false;
            } else if (tingkatInput) {
                tingkatInput.classList.remove('is-invalid');
            }

            if (deskripsiInput && deskripsiInput.value.trim().length < 5) {
                deskripsiInput.classList.add('is-invalid');
                valid = false;
            } else if (deskripsiInput) {
                deskripsiInput.classList.remove('is-invalid');
            }

            if (!valid) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Lengkapi Rincian', 'Pastikan Jenis Kerusakan, Tingkat Kerusakan, dan Deskripsi (minimal 5 karakter) sudah diisi.', 'warning');
                }
                return;
            }

            // Update Ringkasan Langkah 3
            if (summaryCoords && latInput.value) {
                summaryCoords.textContent = `${parseFloat(latInput.value).toFixed(5)}, ${parseFloat(lonInput.value).toFixed(5)}`;
            }
            if (summaryAddress) {
                summaryAddress.textContent = currentDetectedAddress || 'Koordinat Peta Terpilih';
            }
            if (summaryJenis && jenisInput) {
                summaryJenis.textContent = jenisInput.options[jenisInput.selectedIndex]?.text || '-';
            }
            if (summaryTingkat && tingkatInput) {
                summaryTingkat.textContent = tingkatInput.options[tingkatInput.selectedIndex]?.text || '-';
            }
            if (summaryPhotos && fotoInput) {
                const count = fotoInput.files ? fotoInput.files.length : 0;
                summaryPhotos.textContent = `${count} Foto Terlampir`;
            }
        }

        // Sembunyikan semua panel dan tampilkan panel target
        [panel1, panel2, panel3].forEach(p => { if (p) p.classList.remove('active'); });
        if (targetStep === 1 && panel1) panel1.classList.add('active');
        if (targetStep === 2 && panel2) panel2.classList.add('active');
        if (targetStep === 3 && panel3) panel3.classList.add('active');

        // Update visual stepper atas
        const connectors = document.querySelectorAll('.stepper-connector');

        if (targetStep === 1) {
            step1.classList.remove('completed');
            step1.classList.add('active');
            step1.querySelector('.step-circle').innerHTML = '<i class="fas fa-map-pin"></i>';
            step2.classList.remove('active', 'completed');
            step3.classList.remove('active', 'completed');
            if (connectors[0]) connectors[0].classList.remove('completed');
            if (connectors[1]) connectors[1].classList.remove('completed');

            // Render ulang ukuran peta jika kembali ke step 1
            setTimeout(() => { map.invalidateSize(); }, 150);
        } else if (targetStep === 2) {
            step1.classList.remove('active');
            step1.classList.add('completed');
            step1.querySelector('.step-circle').innerHTML = '<i class="fas fa-check"></i>';
            step2.classList.remove('completed');
            step2.classList.add('active');
            step2.querySelector('.step-circle').innerHTML = '<i class="fas fa-pen-to-square"></i>';
            step3.classList.remove('active', 'completed');
            if (connectors[0]) connectors[0].classList.add('completed');
            if (connectors[1]) connectors[1].classList.remove('completed');
        } else if (targetStep === 3) {
            step1.classList.add('completed');
            step1.querySelector('.step-circle').innerHTML = '<i class="fas fa-check"></i>';
            step2.classList.add('completed');
            step2.querySelector('.step-circle').innerHTML = '<i class="fas fa-check"></i>';
            step3.classList.add('active');
            if (connectors[0]) connectors[0].classList.add('completed');
            if (connectors[1]) connectors[1].classList.add('completed');
        }

        currentStep = targetStep;

        // Scroll halus ke header form
        const formTop = document.querySelector('.stepper-horizontal');
        if (formTop) {
            formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- 5. Event Listener Tombol Navigasi Wizard ---
    if (btnGotoStep2) {
        btnGotoStep2.addEventListener('click', () => goToStep(2));
    }
    if (btnGotoStep3) {
        btnGotoStep3.addEventListener('click', () => goToStep(3));
    }

    document.querySelectorAll('.btn-back-to-step-1').forEach(btn => {
        btn.addEventListener('click', () => goToStep(1));
    });
    document.querySelectorAll('.btn-back-to-step-2').forEach(btn => {
        btn.addEventListener('click', () => goToStep(2));
    });

    // Klik langsung pada Stepper di atas
    if (step1) {
        step1.addEventListener('click', () => goToStep(1));
    }
    if (step2) {
        step2.addEventListener('click', () => {
            if (latInput.value && lonInput.value) goToStep(2);
        });
    }
    if (step3) {
        step3.addEventListener('click', () => {
            if (latInput.value && lonInput.value && deskripsiInput.value.length >= 5) goToStep(3);
        });
    }

    // --- 6. Inisialisasi Mode Edit jika sudah ada Koordinat ---
    if (latInput && lonInput && latInput.value && lonInput.value) {
        const existingLat = parseFloat(latInput.value);
        const existingLon = parseFloat(lonInput.value);
        if (!isNaN(existingLat) && !isNaN(existingLon)) {
            map.setView([existingLat, existingLon], 15);
            updateMarkerAndForm({ lat: existingLat, lng: existingLon });
        }
    }

    // --- 7. Event Listener Peta & Geolokasi ---
    map.on('click', function(e) { updateMarkerAndForm(e.latlng); });

    const LocateControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
            container.innerHTML = '<a href="#" title="Cari Lokasi Saya (GPS)"><i class="fa-solid fa-location-crosshairs"></i></a>';
            container.style.cursor = 'pointer';
            container.onclick = function (e) {
                e.stopPropagation(); e.preventDefault();
                map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
            }; return container;
        }
    });
    map.addControl(new LocateControl());
    
    map.on('locationfound', function (e) {
        updateMarkerAndForm(e.latlng);
        if (marker) { marker.bindPopup(`<strong>Lokasi GPS Terdeteksi</strong><br>Akurasi: &plusmn;${e.accuracy.toFixed(0)} meter`).openPopup(); }
    });
    map.on('locationerror', function (e) { 
        if (typeof Swal !== 'undefined') {
            Swal.fire('GPS Terkendala', "Gagal mendapatkan lokasi sensor: " + e.message + ". Silakan klik titik langsung di peta.", 'warning');
        } else {
            alert("Gagal mendapatkan lokasi Anda: " + e.message); 
        }
    });

    // --- 8. Error Display & Reset Helpers ---
    function displayFormErrors(errors) {
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .form-select, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
        
        let firstErrorStep = null;
        for (const field in errors) {
            const errorDiv = document.getElementById(`error-${field}`);
            let fieldElement = document.getElementById(`id_${field}`);
            if (field === 'captcha') fieldElement = document.querySelector('.g-recaptcha');
            else if (field === 'foto_uploads') fieldElement = document.getElementById('id_foto_upload');
            
            if (errorDiv) {
                errorDiv.textContent = Array.isArray(errors[field]) ? errors[field].join(' ') : errors[field];
            }
            if (fieldElement) fieldElement.classList.add('is-invalid'); 

            if (field === 'latitude' || field === 'longitude') firstErrorStep = 1;
            else if (field === 'jenis_kerusakan' || field === 'tingkat_kerusakan' || field === 'deskripsi') {
                if (!firstErrorStep) firstErrorStep = 2;
            } else if (field === 'foto_uploads' || field === 'captcha') {
                if (!firstErrorStep) firstErrorStep = 3;
            }
        }
        if (firstErrorStep) goToStep(firstErrorStep);
    }

    function resetForm() {
        if (formElement) formElement.reset();
        if (marker) { map.removeLayer(marker); marker = null; }
        if (latDisplay) latDisplay.textContent = '-';
        if (lonDisplay) lonDisplay.textContent = '-';
        if (btnGotoStep2) btnGotoStep2.disabled = true;
        if (addressCard) addressCard.classList.add('d-none');
        if (noLocationHint) noLocationHint.classList.remove('d-none');
        document.querySelectorAll('.quick-tag-chip').forEach(c => c.classList.remove('active'));
        goToStep(1);
        if (typeof grecaptcha !== 'undefined') { 
             try { grecaptcha.reset(); } catch (e) { console.warn("Gagal reset reCAPTCHA:", e); }
        }
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .form-select, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
    }

    // --- 9. Submit AJAX & SweetAlert2 ---
    if (formElement && submitBtn) { 
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();

            if (submitTextSpan) submitTextSpan.classList.add('d-none');
            if (spinnerSpan) spinnerSpan.classList.remove('d-none');
            submitBtn.disabled = true;

            const formData = new FormData(formElement);
            const targetAction = formElement.action || window.location.href;

            fetch(targetAction, {
                method: 'POST', 
                body: formData,
                headers: { 
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                return response.json().then(data => ({
                    status: response.status,
                    ok: response.ok,
                    data: data
                }));
            })
            .then(({ ok, data }) => {
                if (ok && data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Laporan Berhasil Terkirim!',
                        text: data.message,
                        confirmButtonColor: '#2563eb',
                        confirmButtonText: 'Buka Detail Laporan'
                    }).then(() => {
                        if (data.laporan_id) {
                            window.location.href = `/laporan/${data.laporan_id}/`;
                        } else {
                            window.location.href = '/';
                        }
                    });
                    resetForm();
                } else if (data.status === 'form_error') {
                    Swal.fire('Input Belum Lengkap', data.message || 'Cek kembali data form Anda (pastikan centang reCAPTCHA).', 'error');
                    displayFormErrors(data.errors || {});
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                } else {
                    Swal.fire('Gagal Menyimpan', data.message || 'Terjadi kesalahan sistem.', 'error');
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                }
            })
            .catch(error => {
                console.error('Submit error:', error);
                Swal.fire('Koneksi Terkendala', 'Gagal memproses data di server. Coba periksa koneksi internet Anda.', 'warning');
            })
            .finally(() => {
                if (submitTextSpan) submitTextSpan.classList.remove('d-none');
                if (spinnerSpan) spinnerSpan.classList.add('d-none');
                submitBtn.disabled = false;
            }); 
        }); 
    }

});