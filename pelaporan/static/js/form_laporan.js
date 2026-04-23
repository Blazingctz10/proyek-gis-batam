// static/js/form_laporan.js

document.addEventListener("DOMContentLoaded", function() {

    const mapElement = document.getElementById('map');
    if (!mapElement) return; // Keluar jika bukan halaman form

    // Elemen Form
    const latInput = document.getElementById('id_latitude');
    const lonInput = document.getElementById('id_longitude');
    const latDisplay = document.getElementById('lat-display');
    const lonDisplay = document.getElementById('lon-display');
    const submitBtn = document.getElementById('submit-btn');
    const submitHelp = document.getElementById('submit-help');
    const formElement = document.getElementById('laporan-form'); 
    const submitTextSpan = submitBtn ? submitBtn.querySelector('.submit-text') : null;
    const spinnerSpan = submitBtn ? submitBtn.querySelector('.spinner-border') : null;

    // Inisialisasi Peta
    const map = L.map('map').setView([1.0456, 104.0305], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    let marker = null;

    // --- Fungsi Helper ---
    function updateMarkerAndForm(latlng) {
        const lat = latlng.lat; const lon = latlng.lng;
        if(latDisplay) latDisplay.textContent = lat.toFixed(6);
        if(lonDisplay) lonDisplay.textContent = lon.toFixed(6);
        if(latInput) latInput.value = lat;
        if(lonInput) lonInput.value = lon;
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng, { draggable: true }).addTo(map);
            marker.on('dragend', function(e) { updateMarkerAndForm(e.target.getLatLng()); });
        }
        if(submitBtn) submitBtn.disabled = false;
        if(submitHelp) submitHelp.style.display = 'none';
    }

    function displayFormErrors(errors) {
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
        for (const field in errors) {
            const errorDiv = document.getElementById(`error-${field}`);
            let fieldElement = document.getElementById(`id_${field}`);
            if (field === 'captcha') fieldElement = document.querySelector('.g-recaptcha');
            else if (field === 'foto_uploads') fieldElement = document.getElementById('id_foto_upload');
            if (errorDiv) errorDiv.textContent = errors[field].join(' '); 
            if (fieldElement) fieldElement.classList.add('is-invalid'); 
        }
    }

    function resetForm() {
        if(formElement) formElement.reset();
        if (marker) { map.removeLayer(marker); marker = null; }
        if(latDisplay) latDisplay.textContent = '-';
        if(lonDisplay) lonDisplay.textContent = '-';
        if(submitBtn) submitBtn.disabled = true;
        if(submitHelp) submitHelp.style.display = 'block';
        if (typeof grecaptcha !== 'undefined') { 
             try { grecaptcha.reset(); } catch (e) { console.warn("Gagal reset reCAPTCHA:", e); }
        }
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
    }

    // --- Event Listeners Peta & Geolokasi ---
    map.on('click', function(e) { updateMarkerAndForm(e.latlng); });

    const LocateControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
            container.innerHTML = '<a href="#" title="Cari Lokasi Saya"><i class="fa-solid fa-location-crosshairs"></i></a>';
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
        if (marker) { marker.bindPopup(`Akurasi: ${e.accuracy.toFixed(0)} meter`).openPopup(); }
    });
    map.on('locationerror', function (e) { alert("Gagal mendapatkan lokasi Anda: " + e.message); });


    // --- Event Listener Submit Form (AJAX & SweetAlert2) ---
    if (formElement && submitBtn) { 
        formElement.addEventListener('submit', function(event) {
            event.preventDefault(); // Wajib! Cegah layar hitam JSON

            // Munculkan loading di tombol
            if(submitTextSpan) submitTextSpan.classList.add('d-none');
            if(spinnerSpan) spinnerSpan.classList.remove('d-none');
            submitBtn.disabled = true;

            const formData = new FormData(formElement);

            fetch(formElement.action, {
                method: 'POST', 
                body: formData,
                headers: { 
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
                    'X-Requested-With': 'XMLHttpRequest' // Beritahu Django ini AJAX secara spesifik
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Laporan Terkirim!',
                        text: data.message,
                        confirmButtonColor: '#0d6efd',
                    }).then(() => {
                        window.location.href = '/'; // Otomatis balik ke peta utama
                    });
                    resetForm();
                } else if (data.status === 'form_error') {
                    Swal.fire('Input Tidak Valid', 'Cek kembali data form Anda (pastikan centang Captcha).', 'error');
                    displayFormErrors(data.errors);
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                } else {
                    Swal.fire('Gagal', data.message || 'Terjadi kesalahan.', 'error');
                    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                }
            })
            .catch(error => {
                console.error('Submit error:', error);
                Swal.fire('Koneksi Error', 'Gagal terhubung ke server. Coba lagi.', 'warning');
            })
            .finally(() => {
                // Kembalikan tombol ke semula
                if(submitTextSpan) submitTextSpan.classList.remove('d-none');
                if(spinnerSpan) spinnerSpan.classList.add('d-none');
                submitBtn.disabled = false;
            }); 
        }); 
    }

});