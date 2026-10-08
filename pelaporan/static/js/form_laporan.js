// static/js/form_laporan.js
// Multi-Step Wizard Controller for LaporJalan Batam WebGIS with Photo & Captcha Validation Gate

document.addEventListener("DOMContentLoaded", function() {

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // --- Form Input Elements ---
    const latInput = document.getElementById('id_latitude');
    const lonInput = document.getElementById('id_longitude');
    const formElement = document.getElementById('laporan-form'); 
    const submitBtn = document.getElementById('submit-btn');
    const submitTextSpan = submitBtn ? submitBtn.querySelector('.submit-text') : null;
    const spinnerSpan = submitBtn ? submitBtn.querySelector('.spinner-border') : null;
    const deskripsiInput = document.getElementById('id_deskripsi');
    const jenisInput = document.getElementById('id_jenis_kerusakan');
    const tingkatInput = document.getElementById('id_tingkat_kerusakan');
    const fotoInput = document.getElementById('id_foto_upload');
    const previewContainer = document.getElementById('foto-preview-container');

    // --- Wizard Panels & Steps ---
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
    const locationSelectedBadge = document.getElementById('location-selected-badge');
    const btnUseAddress = document.getElementById('btn-use-address');

    const step2LocationPreview = document.getElementById('step2-location-preview');
    const summaryCoords = document.getElementById('summary-coords');
    const summaryAddress = document.getElementById('summary-address');
    const summaryJenis = document.getElementById('summary-jenis');
    const summaryTingkat = document.getElementById('summary-tingkat');
    const summaryPhotos = document.getElementById('summary-photos');
    const photoCountStatus = document.getElementById('photo-count-status');
    const checkPhotoItem = document.getElementById('check-photo-item');
    const checkCaptchaItem = document.getElementById('check-captcha-item');

    let currentDetectedAddress = '';
    let hasValidPhoto = false;
    let hasValidCaptcha = false;

    // --- 1. Map Initialization (OSM) ---
    const defaultCenter = [1.1250, 104.0380];
    const map = L.map('map').setView(defaultCenter, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    let marker = null;

    // Custom GIS pin icon
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

    // --- 3. Update Marker & Form Inputs ---
    function updateMarkerAndForm(latlng, zoomToLevel = null) {
        const lat = typeof latlng.lat === 'number' ? latlng.lat : parseFloat(latlng.lat);
        const lon = typeof latlng.lng === 'number' ? latlng.lng : parseFloat(latlng.lng);
        
        if (latInput) latInput.value = lat;
        if (lonInput) lonInput.value = lon;
        
        if (marker) {
            marker.setLatLng([lat, lon]);
        } else {
            marker = L.marker([lat, lon], { icon: customPinIcon, draggable: true }).addTo(map);
            marker.on('dragend', function(e) { updateMarkerAndForm(e.target.getLatLng()); });
        }

        if (zoomToLevel) {
            map.setView([lat, lon], zoomToLevel);
        }

        fetchReverseGeocode(lat, lon);

        // Enable Next to Step 2
        if (btnGotoStep2) btnGotoStep2.disabled = false;
        if (noLocationHint) noLocationHint.classList.add('d-none');
        if (locationSelectedBadge) locationSelectedBadge.classList.remove('d-none');
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

    // --- 4. GPS Button: Zoom to Level 17-18 and Place Pin ---
    const LocateControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
            container.innerHTML = '<a href="#" title="Gunakan Lokasi GPS Saya"><i class="fa-solid fa-location-crosshairs"></i></a>';
            container.style.cursor = 'pointer';
            container.onclick = function (e) {
                e.stopPropagation(); e.preventDefault();
                map.locate({ setView: false, maxZoom: 18, enableHighAccuracy: true });
            }; return container;
        }
    });
    map.addControl(new LocateControl());
    
    map.on('locationfound', function (e) {
        // Zoom to 18 on location and place pin
        map.setView(e.latlng, 18);
        updateMarkerAndForm(e.latlng);
        if (marker) {
            marker.bindPopup(`<strong>Lokasi GPS Terdeteksi</strong><br>Akurasi: &plusmn;${e.accuracy.toFixed(0)} meter`).openPopup();
        }
    });
    map.on('locationerror', function (e) { 
        if (typeof Swal !== 'undefined') {
            Swal.fire('GPS Terkendala', "Gagal mendeteksi lokasi GPS: " + e.message + ". Silakan klik titik langsung di atas peta jalan.", 'warning');
        } else {
            alert("Gagal mendeteksi lokasi: " + e.message); 
        }
    });

    map.on('click', function(e) { updateMarkerAndForm(e.latlng); });

    // --- 5. Submit Button Gate: Check Photo + reCAPTCHA ---
    function checkSubmitReadiness() {
        // Check photo
        hasValidPhoto = fotoInput && fotoInput.files && fotoInput.files.length > 0;
        
        // Check captcha
        let captchaResponse = '';
        if (typeof grecaptcha !== 'undefined') {
            try { captchaResponse = grecaptcha.getResponse(); } catch(e) {}
        }
        hasValidCaptcha = captchaResponse.length > 0;

        // Update Checklist Visuals
        if (checkPhotoItem) {
            if (hasValidPhoto) {
                checkPhotoItem.className = 'd-flex align-items-center gap-2 mb-1 text-success';
                checkPhotoItem.innerHTML = `<i class="fas fa-circle-check"></i> Foto Dokumentasi Terlampir (${fotoInput.files.length})`;
            } else {
                checkPhotoItem.className = 'd-flex align-items-center gap-2 mb-1 text-danger';
                checkPhotoItem.innerHTML = `<i class="fas fa-circle-xmark"></i> Wajib Minimal 1 Foto Dokumentasi`;
            }
        }

        if (checkCaptchaItem) {
            if (hasValidCaptcha) {
                checkCaptchaItem.className = 'd-flex align-items-center gap-2 text-success';
                checkCaptchaItem.innerHTML = `<i class="fas fa-circle-check"></i> Verifikasi reCAPTCHA Selesai`;
            } else {
                checkCaptchaItem.className = 'd-flex align-items-center gap-2 text-danger';
                checkCaptchaItem.innerHTML = `<i class="fas fa-circle-xmark"></i> Menunggu Verifikasi reCAPTCHA`;
            }
        }

        // Enable or Disable Submit Button
        if (submitBtn) {
            submitBtn.disabled = !(hasValidPhoto && hasValidCaptcha);
        }
    }

    // Interval to monitor reCAPTCHA state automatically
    setInterval(checkSubmitReadiness, 600);

    // --- 6. Photo Input & Thumbnail Previews ---
    if (fotoInput && previewContainer) {
        fotoInput.addEventListener('change', function(e) {
            previewContainer.innerHTML = '';
            const files = Array.from(e.target.files);
            
            if (files.length === 0) {
                if (summaryPhotos) {
                    summaryPhotos.className = 'fw-bold text-danger';
                    summaryPhotos.textContent = '0 Foto (Wajib Minimal 1)';
                }
                if (photoCountStatus) {
                    photoCountStatus.className = 'badge bg-danger-subtle text-danger small';
                    photoCountStatus.textContent = 'Wajib Diisi';
                }
                checkSubmitReadiness();
                return;
            }

            if (files.length > 5) {
                Swal.fire('Maksimal 5 Foto', 'Anda hanya dapat mengunggah maksimal 5 file foto dokumentasi.', 'warning');
                fotoInput.value = '';
                checkSubmitReadiness();
                return;
            }

            if (summaryPhotos) {
                summaryPhotos.className = 'fw-bold text-success';
                summaryPhotos.textContent = `${files.length} Foto Terpilih`;
            }
            if (photoCountStatus) {
                photoCountStatus.className = 'badge bg-success-subtle text-success small';
                photoCountStatus.textContent = `${files.length} Foto Siap`;
            }

            files.forEach((file, index) => {
                if (file.size > 5 * 1024 * 1024) {
                    Swal.fire('Ukuran Terlalu Besar', `Foto ke-${index + 1} melebihi batas 5MB`, 'warning');
                    return;
                }
                if (!file.type.match('image.*')) {
                    Swal.fire('Format Salah', `File ke-${index + 1} bukan berkas gambar yang didukung`, 'warning');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const div = document.createElement('div');
                    div.className = 'upload-preview-item';
                    div.style.cssText = 'position: relative; width: 75px; height: 75px; border-radius: 8px; overflow: hidden; border: 2px solid var(--border-color); display: inline-block; margin-right: 8px; margin-bottom: 8px;';
                    div.innerHTML = `
                        <img src="${evt.target.result}" alt="Preview ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                    `;
                    previewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            });

            checkSubmitReadiness();
        });
    }

    // --- 7. Wizard Navigation Engine ---
    function goToStep(targetStep) {
        if (targetStep === 2) {
            if (!latInput.value || !lonInput.value) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Pilih Titik di Peta', 'Silakan klik titik lokasi jalan yang rusak pada peta atau gunakan tombol sensor GPS terlebih dahulu.', 'warning');
                } else {
                    alert('Silakan tentukan titik lokasi pada peta terlebih dahulu!');
                }
                return;
            }
            if (step2LocationPreview) {
                const latStr = parseFloat(latInput.value).toFixed(5);
                const lonStr = parseFloat(lonInput.value).toFixed(5);
                step2LocationPreview.textContent = `${latStr}, ${lonStr} ${currentDetectedAddress ? ('— ' + currentDetectedAddress) : ''}`;
            }
        }

        if (targetStep === 3) {
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
                    Swal.fire('Lengkapi Formulir', 'Pilih Jenis Kerusakan, Tingkat Kerusakan, dan tuliskan Deskripsi (minimal 5 karakter).', 'warning');
                }
                return;
            }

            // Update Step 3 Summary
            if (summaryCoords && latInput.value) {
                summaryCoords.textContent = `${parseFloat(latInput.value).toFixed(5)}, ${parseFloat(lonInput.value).toFixed(5)}`;
            }
            if (summaryAddress) {
                summaryAddress.textContent = currentDetectedAddress || 'Titik Koordinat Terpilih';
            }
            if (summaryJenis && jenisInput) {
                summaryJenis.textContent = jenisInput.options[jenisInput.selectedIndex]?.text || '-';
            }
            if (summaryTingkat && tingkatInput) {
                summaryTingkat.textContent = tingkatInput.options[tingkatInput.selectedIndex]?.text || '-';
            }
            checkSubmitReadiness();
        }

        [panel1, panel2, panel3].forEach(p => { if (p) p.classList.remove('active'); });
        if (targetStep === 1 && panel1) panel1.classList.add('active');
        if (targetStep === 2 && panel2) panel2.classList.add('active');
        if (targetStep === 3 && panel3) panel3.classList.add('active');

        const connectors = document.querySelectorAll('.stepper-connector');
        if (targetStep === 1) {
            step1.classList.remove('completed');
            step1.classList.add('active');
            step1.querySelector('.step-circle').innerHTML = '<i class="fas fa-map-pin"></i>';
            step2.classList.remove('active', 'completed');
            step3.classList.remove('active', 'completed');
            if (connectors[0]) connectors[0].classList.remove('completed');
            if (connectors[1]) connectors[1].classList.remove('completed');
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

        const formTop = document.querySelector('.stepper-horizontal');
        if (formTop) {
            formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (btnGotoStep2) btnGotoStep2.addEventListener('click', () => goToStep(2));
    if (btnGotoStep3) btnGotoStep3.addEventListener('click', () => goToStep(3));

    document.querySelectorAll('.btn-back-to-step-1').forEach(btn => {
        btn.addEventListener('click', () => goToStep(1));
    });
    document.querySelectorAll('.btn-back-to-step-2').forEach(btn => {
        btn.addEventListener('click', () => goToStep(2));
    });

    if (step1) step1.addEventListener('click', () => goToStep(1));
    if (step2) step2.addEventListener('click', () => { if (latInput.value && lonInput.value) goToStep(2); });
    if (step3) step3.addEventListener('click', () => { if (latInput.value && lonInput.value && deskripsiInput.value.length >= 5) goToStep(3); });

    // Existing edit mode coordinates
    if (latInput && lonInput && latInput.value && lonInput.value) {
        const existingLat = parseFloat(latInput.value);
        const existingLon = parseFloat(lonInput.value);
        if (!isNaN(existingLat) && !isNaN(existingLon)) {
            map.setView([existingLat, existingLon], 16);
            updateMarkerAndForm({ lat: existingLat, lng: existingLon });
        }
    }

    // --- 8. Error Display Helpers ---
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
        if (btnGotoStep2) btnGotoStep2.disabled = true;
        if (addressCard) addressCard.classList.add('d-none');
        if (noLocationHint) noLocationHint.classList.remove('d-none');
        if (locationSelectedBadge) locationSelectedBadge.classList.add('d-none');
        if (previewContainer) previewContainer.innerHTML = '';
        goToStep(1);
        if (typeof grecaptcha !== 'undefined') { 
             try { grecaptcha.reset(); } catch (e) {}
        }
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .form-select, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
        checkSubmitReadiness();
    }

    // --- 9. Submit AJAX & Success Screen with Large ID Box, Copy Button, Track Link ---
    if (formElement && submitBtn) { 
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();

            // Client photo validation
            if (!fotoInput.files || fotoInput.files.length === 0) {
                Swal.fire('Foto Wajib Diunggah', 'Silakan lampirkan minimal 1 foto dokumentasi fisik kerusakan jalan.', 'warning');
                goToStep(3);
                return;
            }

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
                    const reportId = data.laporan_id || 'BARU';
                    const idFormatted = `#${reportId}`;

                    // Set Report ID and Link in Success Modal
                    const modalIdElem = document.getElementById('success-report-id');
                    const trackLinkElem = document.getElementById('link-track-status');
                    const copyBtnElem = document.getElementById('btn-copy-success-id');
                    const copyTextElem = document.getElementById('copy-success-text');

                    if (modalIdElem) modalIdElem.textContent = idFormatted;
                    if (trackLinkElem) trackLinkElem.href = `/lacak/?q=${reportId}`;

                    if (copyBtnElem) {
                        copyBtnElem.onclick = function() {
                            navigator.clipboard.writeText(`${reportId}`).then(() => {
                                if (copyTextElem) copyTextElem.textContent = 'ID Tersalin!';
                                copyBtnElem.classList.replace('btn-outline-primary', 'btn-success');
                                setTimeout(() => {
                                    if (copyTextElem) copyTextElem.textContent = 'Salin ID Laporan';
                                    copyBtnElem.classList.replace('btn-success', 'btn-outline-primary');
                                }, 2000);
                            });
                        };
                    }

                    // Show custom success modal
                    const successModalEl = document.getElementById('successReportModal');
                    if (successModalEl) {
                        const bsModal = bootstrap.Modal.getOrCreateInstance(successModalEl);
                        bsModal.show();
                    } else {
                        Swal.fire({
                            icon: 'success',
                            title: `Laporan #${reportId} Berhasil Terkirim!`,
                            text: 'Gunakan ID laporan untuk melacak progres penanganan.',
                            confirmButtonColor: '#ea580c',
                            confirmButtonText: 'Lacak Status Laporan'
                        }).then(() => {
                            window.location.href = `/lacak/?q=${reportId}`;
                        });
                    }

                    resetForm();
                } else if (data.status === 'form_error') {
                    Swal.fire('Input Belum Lengkap', data.message || 'Cek kembali data form Anda (pastikan foto terlampir & centang reCAPTCHA).', 'error');
                    displayFormErrors(data.errors || {});
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                    checkSubmitReadiness();
                } else {
                    Swal.fire('Gagal Menyimpan', data.message || 'Terjadi kesalahan sistem saat menyimpan laporan.', 'error');
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                    checkSubmitReadiness();
                }
            })
            .catch(error => {
                console.error('Submit error:', error);
                Swal.fire('Koneksi Terkendala', 'Gagal memproses data di server. Periksa jaringan internet Anda.', 'warning');
            })
            .finally(() => {
                if (submitTextSpan) submitTextSpan.classList.remove('d-none');
                if (spinnerSpan) spinnerSpan.classList.add('d-none');
                checkSubmitReadiness();
            }); 
        }); 
    }

});