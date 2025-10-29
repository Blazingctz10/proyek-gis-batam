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
    const formElement = document.getElementById('laporan-form'); // Pastikan ID ini ada di HTML
    const submitTextSpan = submitBtn ? submitBtn.querySelector('.submit-text') : null;
    const spinnerSpan = submitBtn ? submitBtn.querySelector('.spinner-border') : null;

    // Elemen Modal Notifikasi
    const notificationModalElement = document.getElementById('notificationModal');
    let notificationModal = null;
    let notificationModalLabel = null;
    let notificationModalBody = null;
    if (notificationModalElement) {
        notificationModal = new bootstrap.Modal(notificationModalElement);
        notificationModalLabel = document.getElementById('notificationModalLabel');
        notificationModalBody = document.getElementById('notificationModalBody');
    } else {
        console.error("Modal notifikasi (id='notificationModal') tidak ditemukan!");
    }

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

    function showNotificationModal(title, message, type = 'danger') {
        if (!notificationModal || !notificationModalLabel || !notificationModalBody) return;
        notificationModalLabel.textContent = title;
        let icon = '';
        if (type === 'success') icon = '<i class="fa-solid fa-check-circle text-success me-2"></i>';
        else if (type === 'danger') icon = '<i class="fa-solid fa-exclamation-triangle text-danger me-2"></i>';
        else if (type === 'warning') icon = '<i class="fa-solid fa-exclamation-circle text-warning me-2"></i>';
        notificationModalBody.innerHTML = icon + message;

        const header = notificationModalElement.querySelector('.modal-header');
        if (header) {
            header.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-white', 'text-dark');
            if (type === 'success') header.classList.add('bg-success', 'text-white');
            else if (type === 'danger') header.classList.add('bg-danger', 'text-white');
            else if (type === 'warning') header.classList.add('bg-warning', 'text-dark');
        }
        notificationModal.show();
    }

    function displayFormErrors(errors) {
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .g-recaptcha, input[type=file]').forEach(el => el.classList.remove('is-invalid'));
        for (const field in errors) {
            const errorDiv = document.getElementById(`error-${field}`);
            let fieldElement = document.getElementById(`id_${field}`);
            if (field === 'captcha') fieldElement = document.querySelector('.g-recaptcha');
            else if (field === 'foto_uploads') fieldElement = document.getElementById('id_foto_upload');
            if (errorDiv) errorDiv.textContent = errors[field].join(' '); // Tampilkan error
            if (fieldElement) fieldElement.classList.add('is-invalid'); // Tandai field
        }
    }

    function resetForm() {
        if(formElement) formElement.reset();
        if (marker) { map.removeLayer(marker); marker = null; }
        if(latDisplay) latDisplay.textContent = '-';
        if(lonDisplay) lonDisplay.textContent = '-';
        if(submitBtn) submitBtn.disabled = true;
        if(submitHelp) submitHelp.style.display = 'block';
        if (typeof grecaptcha !== 'undefined') { // Reset Captcha
             try { grecaptcha.reset(); } catch (e) { console.warn("Gagal reset reCAPTCHA:", e); }
        }
        // Bersihkan tanda error
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


    // --- Event Listener Submit Form (AJAX) ---
    if (formElement && submitBtn && submitTextSpan && spinnerSpan) { // Pastikan semua elemen tombol ada
        formElement.addEventListener('submit', function(event) {
            console.log("Submit event triggered!"); // Debug
            event.preventDefault(); // Hentikan submit default

            // Tampilkan loading state
            submitTextSpan.classList.add('d-none');
            spinnerSpan.classList.remove('d-none');
            submitBtn.disabled = true;
            // Bersihkan error lama
             displayFormErrors({}); // Panggil dengan objek kosong untuk membersihkan

            const formData = new FormData(formElement);

            fetch(formElement.action, {
                method: 'POST', body: formData,
                headers: { 'X-CSRFToken': formData.get('csrfmiddlewaretoken') }
            })
            .then(response => {
                if (!response.ok) { // Jika status HTTP bukan 2xx
                    // Coba baca error JSON dari backend
                    return response.json().then(errData => {
                        // Tambahkan status HTTP ke errorData agar bisa dicek di catch
                        errData.httpStatus = response.status;
                        throw errData;
                    });
                 }
                return response.json(); // Jika status HTTP 2xx
            })
            .then(data => {
                console.log("Fetch success, data:", data); // Debug
                if (data.status === 'success') {
                    // Tampilkan modal sukses
                    showNotificationModal('Sukses!', data.message, 'success');
                    // Reset form
                    resetForm();
                    // Tunggu sebentar lalu redirect
                    setTimeout(() => {
                        console.log("Redirecting after success..."); // Debug
                        window.location.href = '/'; // Ke halaman utama
                    }, 2500); // Durasi tunggu (ms)
                } else {
                    // Handle jika status=warning atau lainnya dari backend (jarang)
                    showNotificationModal('Informasi', data.message || 'Terjadi kesalahan.', 'warning');
                    if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }
                }
            })
            .catch(errorData => {
                console.error('Submit error received:', errorData);

                // Handle error dari backend (status 400) atau error jaringan
                if (errorData && errorData.status === 'form_error' && errorData.errors) {
                     showNotificationModal('Kesalahan Input', errorData.message || 'Harap perbaiki kesalahan pada form.', 'danger');
                     displayFormErrors(errorData.errors);
                     if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }
                } else if (errorData && errorData.status === 'error' && errorData.message) {
                     showNotificationModal('Kesalahan Lokasi', errorData.message, 'danger');
                     if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }
                } else {
                     // Error Jaringan atau error JSON parse gagal, dll.
                     showNotificationModal('Error', 'Gagal mengirim laporan. Periksa koneksi Anda atau coba lagi nanti.', 'danger');
                     if (typeof grecaptcha !== 'undefined') { grecaptcha.reset(); }
                }
            })
            .finally(() => {
                console.log("Fetch finally block executed."); // Debug
                // Sembunyikan loading state
                submitTextSpan.classList.remove('d-none');
                spinnerSpan.classList.add('d-none');

                // Aktifkan tombol HANYA jika terjadi error (tidak redirect)
                // Cek apakah modal error sedang tampil
                 let isErrorModalVisible = false;
                 if (notificationModalElement) {
                     const header = notificationModalElement.querySelector('.modal-header');
                     isErrorModalVisible = notificationModalElement.classList.contains('show') && (header.classList.contains('bg-danger') || header.classList.contains('bg-warning'));
                 }

                 if (isErrorModalVisible) {
                    submitBtn.disabled = false; // Aktifkan lagi jika error
                 } else {
                     // Biarkan disable jika sukses (akan redirect) atau jika modal belum/tidak tampil
                     submitBtn.disabled = true;
                      if(submitHelp) submitHelp.style.display = 'block'; // Tampilkan lagi helper jika tombol disable
                 }
            }); // Akhir .finally
        }); // Akhir addEventListener
    } else {
        console.error("Elemen form (id='laporan-form') atau elemen tombol submit tidak ditemukan saat DOMContentLoaded.");
    }

}); // <-- Penutup DOMContentLoaded