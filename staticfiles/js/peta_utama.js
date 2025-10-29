// static/js/peta_utama.js

document.addEventListener("DOMContentLoaded", function() {
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');
    const dataUrl = mapElement.dataset.geojsonUrl;

    // Definisikan Base Map Layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Inisialisasi Peta
    const map = L.map('map', {
        center: [1.0456, 104.0305], // Batam
        zoom: 12,
        layers: [osmLayer] // Default ke OSM
    });

    // Buat Objek Base Maps
    const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Mode Gelap": darkLayer,
        "Satelit": satelliteLayer
    };

    // Tambahkan Layer Control
    L.control.layers(baseMaps).addTo(map);

    // Fungsi Helper
    function getStatusColor(status) {
        if (status === 'DIVERIFIKASI') return 'orange';
        if (status === 'DIPERBAIKI') return 'blue';
        return 'grey';
    }
    
    function createCarousel(id, fotoUrls) {
        if (!fotoUrls || fotoUrls.length === 0) { return '<p class="text-center text-muted small my-3">Tidak ada foto terlampir.</p>'; }
        let carouselId = `carousel-${id}`; let indicators = ''; let items = '';
        fotoUrls.forEach((url, index) => {
            let activeClass = (index === 0) ? 'active' : '';
            indicators += `<button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" class="${activeClass}"></button>`;
            items += `<div class="carousel-item ${activeClass}"><img src="${url}" class="d-block w-100 popup-image zoomable-image" alt="Foto Laporan" data-img-url="${url}" style="cursor: pointer;"></div>`;
        });
        let controls = '';
        if (fotoUrls.length > 1) {
            controls = `<button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev"><span class="carousel-control-prev-icon" aria-hidden="true"></span></button><button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span></button>`;
        }
        return `<div id="${carouselId}" class="carousel slide" data-bs-ride="carousel"><div class="carousel-indicators">${indicators}</div><div class="carousel-inner">${items}</div>${controls}</div>`;
    }
    
    function createStatusBadge(status) {
        let badgeClass = 'bg-secondary'; let icon = '<i class="fa-solid fa-question-circle"></i>';
        if (status === 'DIVERIFIKASI') { badgeClass = 'bg-warning text-dark'; icon = '<i class="fa-solid fa-eye"></i>'; }
        if (status === 'DIPERBAIKI') { badgeClass = 'bg-primary'; icon = '<i class="fa-solid fa-wrench"></i>'; }
        return `<span class="badge ${badgeClass}"><span class="icon-text">${icon} ${status}</span></span>`;
    }

    // Fetch Data dan Tampilkan
    fetch(dataUrl)
        .then(response => response.json()) 
        .then(data => {
            const markers = L.markerClusterGroup();
            const geoJsonLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8, fillColor: getStatusColor(feature.properties.status), color: "#000",
                        weight: 1, opacity: 1, fillOpacity: 0.8
                    });
                },
                onEachFeature: function (feature, layer) {
                    const props = feature.properties; const id = feature.id;
                    const popupContent = `<div class="card popup-card">${createCarousel(id, props.foto_urls)}<div class="card-body"><h6 class="card-title">Detail Kerusakan</h6><p class="card-subtitle mb-2 text-muted">Laporan #${id}</p>${createStatusBadge(props.status)}<p class="card-text">${props.deskripsi || 'Tidak ada deskripsi.'}</p></div></div>`;
                    layer.bindPopup(popupContent);
                    layer.on('popupopen', function () {
                        const popupElement = layer.getPopup().getElement();
                        const zoomableImages = popupElement.querySelectorAll('.zoomable-image');
                        zoomableImages.forEach(image => {
                            image.addEventListener('dblclick', function () {
                                modalImage.src = this.dataset.imgUrl; imageModal.show();
                            });
                        });
                    });
                }
            });
            markers.addLayer(geoJsonLayer);
            map.addLayer(markers);
        })
        .catch(error => { console.error('Error fetching or parsing GeoJSON:', error); });
    
    // Legenda Peta
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [ { status: 'DIVERIFIKASI', color: 'orange', text: 'Menunggu Perbaikan' }, { status: 'DIPERBAIKI', color: 'blue', text: 'Sedang Dikerjakan' } ];
        let labels = ['<h6>Keterangan:</h6>']; 
        for (let i = 0; i < grades.length; i++) { labels.push('<i style="background:' + grades[i].color + '"></i> ' + grades[i].text); }
        div.innerHTML = labels.join('<br>');
        return div;
    };
    legend.addTo(map);

});