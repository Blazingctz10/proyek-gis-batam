// static/js/form_laporan.js

document.addEventListener("DOMContentLoaded", function() {
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const latInput = document.getElementById('id_latitude');
    const lonInput = document.getElementById('id_longitude');
    const latDisplay = document.getElementById('lat-display');
    const lonDisplay = document.getElementById('lon-display');
    const submitBtn = document.getElementById('submit-btn');
    const submitHelp = document.getElementById('submit-help');

    const map = L.map('map').setView([1.0456, 104.0305], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    let marker = null;

    function updateMarkerAndForm(latlng) {
        const lat = latlng.lat; const lon = latlng.lng;
        latDisplay.textContent = lat.toFixed(6);
        lonDisplay.textContent = lon.toFixed(6);
        latInput.value = lat; lonInput.value = lon;
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng, { draggable: true }).addTo(map);
            marker.on('dragend', function(e) { updateMarkerAndForm(e.target.getLatLng()); });
        }
        submitBtn.disabled = false; submitHelp.style.display = 'none';
    }

    map.on('click', function(e) { updateMarkerAndForm(e.latlng); });

    // Kode Geolocation
    const LocateControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
            container.innerHTML = '<a href="#" title="Cari Lokasi Saya"><i class="fa-solid fa-location-crosshairs"></i></a>';
            container.style.cursor = 'pointer';
            container.onclick = function (e) {
                e.stopPropagation(); e.preventDefault();
                map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
            };
            return container;
        }
    });
    map.addControl(new LocateControl());

    map.on('locationfound', function (e) {
        updateMarkerAndForm(e.latlng);
        if (marker) { marker.bindPopup(`Akurasi: ${e.accuracy.toFixed(0)} meter`).openPopup(); }
    });

    map.on('locationerror', function (e) { alert("Gagal mendapatkan lokasi Anda: " + e.message); });

});