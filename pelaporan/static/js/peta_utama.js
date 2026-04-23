// static/js/peta_utama.js

document.addEventListener("DOMContentLoaded", function() {
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');
    const dataUrl = mapElement.dataset.geojsonUrl;

    // --- 1. Base Maps (Sama seperti sebelumnya) ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri'
    });

    const map = L.map('map', {
        center: [1.0456, 104.0305],
        zoom: 12,
        layers: [osmLayer]
    });

    const baseMaps = {
        "Peta Jalan (Terang)": osmLayer,
        "Mode Gelap": darkLayer,
        "Satelit": satelliteLayer
    };
    L.control.layers(baseMaps).addTo(map);


    // --- 2. Warna Status (Gradasi Logis) ---
    function getStatusColor(status) {
        if (status === 'DIVERIFIKASI') return '#fd7e14'; // Oranye (Menunggu)
        if (status === 'DIPERBAIKI') return '#0d6efd';   // Biru (Sedang Dikerjakan)
        return 'grey';
    }
    
    // --- 3. Fungsi Carousel & Badge (Sama seperti sebelumnya) ---
    function createCarousel(id, fotoUrls) {
        if (!fotoUrls || fotoUrls.length === 0) { return '<p class="text-center text-muted small my-3">Tidak ada foto.</p>'; }
        let carouselId = `carousel-${id}`; let indicators = ''; let items = '';
        fotoUrls.forEach((url, index) => {
            let activeClass = (index === 0) ? 'active' : '';
            indicators += `<button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" class="${activeClass}"></button>`;
            items += `<div class="carousel-item ${activeClass}"><img src="${url}" class="d-block w-100 popup-image zoomable-image" data-img-url="${url}" style="cursor: pointer;"></div>`;
        });
        let controls = (fotoUrls.length > 1) ? `<button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button><button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>` : '';
        return `<div id="${carouselId}" class="carousel slide" data-bs-ride="carousel"><div class="carousel-indicators">${indicators}</div><div class="carousel-inner">${items}</div>${controls}</div>`;
    }
    
    function createStatusBadge(status) {
        let badgeClass = 'bg-secondary'; let icon = '<i class="fa-solid fa-question"></i>';
        if (status === 'DIVERIFIKASI') { badgeClass = 'bg-warning text-dark'; icon = '<i class="fa-solid fa-clock"></i>'; } // Ikon Jam (Menunggu)
        if (status === 'DIPERBAIKI') { badgeClass = 'bg-primary'; icon = '<i class="fa-solid fa-person-digging"></i>'; } // Ikon Kerja (Proses)
        return `<span class="badge ${badgeClass}"><span class="icon-text">${icon} ${status}</span></span>`;
    }

    // --- 4. Fetch Data ---
    fetch(dataUrl)
        .then(response => response.json()) 
        .then(data => {
            const markers = L.markerClusterGroup();
            const geoJsonLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8, 
                        fillColor: getStatusColor(feature.properties.status), 
                        color: "#fff", // Border putih agar lebih kontras
                        weight: 2, 
                        opacity: 1, 
                        fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    const props = feature.properties; const id = feature.id;
                    const popupContent = `<div class="card popup-card">${createCarousel(id, props.foto_urls)}<div class="card-body"><h6 class="card-title">Laporan #${id}</h6><div class="mb-2">${createStatusBadge(props.status)}</div><p class="card-text">${props.deskripsi || '-'}</p></div></div>`;
                    layer.bindPopup(popupContent);
                    layer.on('popupopen', function () {
                        const popupElement = layer.getPopup().getElement();
                        popupElement.querySelectorAll('.zoomable-image').forEach(image => {
                            image.addEventListener('dblclick', function () { modalImage.src = this.dataset.imgUrl; imageModal.show(); });
                        });
                    });
                }
            });
            markers.addLayer(geoJsonLayer);
            map.addLayer(markers);
        })
        .catch(error => { console.error('Error:', error); });

    
    // --- 5. LEGENDA BARU YANG LEBIH BAGUS ---
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        
        // Judul Legenda
        div.innerHTML = '<h6><i class="fa-solid fa-circle-info me-1"></i> Status Laporan</h6>';
        
        // Item 1: Diverifikasi (Oranye)
        div.innerHTML += `
            <div class="d-flex align-items-center mb-1">
                <i style="background: #fd7e14; width: 15px; height: 15px; border-radius: 50%; display: inline-block; margin-right: 8px; border: 2px solid #fff;"></i>
                <div>
                    <strong>Menunggu Perbaikan</strong><br>
                    <small class="text-muted">(Sudah Diverifikasi)</small>
                </div>
            </div>
        `;

        // Item 2: Diperbaiki (Biru)
        div.innerHTML += `
            <div class="d-flex align-items-center">
                <i style="background: #0d6efd; width: 15px; height: 15px; border-radius: 50%; display: inline-block; margin-right: 8px; border: 2px solid #fff;"></i>
                <div>
                    <strong>Sedang Dikerjakan</strong><br>
                    <small class="text-muted">(Proses Perbaikan)</small>
                </div>
            </div>
        `;

        return div;
    };
    legend.addTo(map);

});