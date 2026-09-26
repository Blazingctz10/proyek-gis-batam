// static/js/peta_utama.js

document.addEventListener("DOMContentLoaded", function() {
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const modalElement = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const baseUrl = mapElement.dataset.geojsonUrl;

    // --- 1. Base Maps (100% Bebas API Key & Tanpa Watermark) ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    });
    const topoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
    });
    const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri',
        maxZoom: 18
    });

    const map = L.map('map', {
        center: [1.1250, 104.0380],
        zoom: 12,
        layers: [osmLayer]
    });

    const baseMaps = {
        "Peta Jalan Standar (OSM)": osmLayer,
        "Peta Topografi (Esri Topo)": topoLayer,
        "Peta Jalan Halus (Esri Street)": streetLayer,
        "Citra Satelit (Esri World Imagery)": satelliteLayer
    };
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // --- 2. Marker Layer Group (with Cluster) ---
    let markersLayer = L.markerClusterGroup({
        maxClusterRadius: 40,
        showCoverageOnHover: false
    });
    map.addLayer(markersLayer);

    // Generator Custom GIS Icon dengan glowing halo pulse (sesuai referensi UI)
    function createGisMarkerIcon(status) {
        let pinClass = 'pin-menunggu';
        let iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';

        if (status === 'DIPERBAIKI') {
            pinClass = 'pin-dikerjakan';
            iconHtml = '<i class="fa-solid fa-wrench"></i>';
        } else if (status === 'SELESAI') {
            pinClass = 'pin-selesai';
            iconHtml = '<i class="fa-solid fa-check"></i>';
        }

        return L.divIcon({
            className: 'custom-gis-pin-container',
            html: `
                <div class="custom-gis-pin ${pinClass}">
                    <div class="pin-halo"></div>
                    <div class="pin-core">${iconHtml}</div>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22]
        });
    }
    
    // Carousel Foto
    function createCarousel(id, fotoUrls) {
        if (!fotoUrls || fotoUrls.length === 0) {
            return '<div class="p-3 text-center text-muted small bg-light rounded mb-2"><i class="fas fa-image fa-2x opacity-50 mb-1 d-block"></i>Tidak ada lampiran foto.</div>';
        }
        let carouselId = `carousel-${id}`;
        let indicators = '';
        let items = '';
        fotoUrls.forEach((url, index) => {
            let activeClass = (index === 0) ? 'active' : '';
            indicators += `<button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" class="${activeClass}"></button>`;
            items += `<div class="carousel-item ${activeClass}"><img src="${url}" class="d-block w-100 popup-image zoomable-image rounded" data-img-url="${url}" style="cursor: pointer; max-height: 180px; object-fit: cover;"></div>`;
        });
        let controls = (fotoUrls.length > 1) ? 
            `<button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
             <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>` : '';
        return `<div id="${carouselId}" class="carousel slide mb-2" data-bs-ride="carousel"><div class="carousel-indicators">${indicators}</div><div class="carousel-inner">${items}</div>${controls}</div>`;
    }
    
    // Status Badge
    function createStatusBadge(status) {
        if (status === 'SELESAI') {
            return `<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i> Selesai</span>`;
        } else if (status === 'DIPERBAIKI') {
            return `<span class="badge bg-warning text-dark"><i class="fa-solid fa-wrench me-1"></i> Sedang Dikerjakan</span>`;
        } else if (status === 'DIVERIFIKASI') {
            return `<span class="badge bg-danger text-white"><i class="fa-solid fa-clock me-1"></i> Diverifikasi</span>`;
        } else {
            return `<span class="badge bg-danger text-white"><i class="fa-solid fa-triangle-exclamation me-1"></i> Menunggu Inspeksi</span>`;
        }
    }

    // --- 3. Fetch Data GeoJSON ---
    function loadGeoJson() {
        const statusVal = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';
        const jenisVal = document.getElementById('filter-jenis') ? document.getElementById('filter-jenis').value : '';
        const tingkatVal = document.getElementById('filter-tingkat') ? document.getElementById('filter-tingkat').value : '';

        const params = new URLSearchParams();
        if (statusVal) params.append('status', statusVal);
        if (jenisVal) params.append('jenis', jenisVal);
        if (tingkatVal) params.append('tingkat', tingkatVal);

        const fetchUrl = baseUrl + (params.toString() ? ('?' + params.toString()) : '');

        fetch(fetchUrl)
            .then(response => response.json()) 
            .then(data => {
                markersLayer.clearLayers();
                if (!data || !data.features || data.features.length === 0) return;

                const geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: createGisMarkerIcon(feature.properties.status),
                            title: feature.properties.jenis_kerusakan || 'Laporan Kerusakan'
                        });
                    },
                    onEachFeature: function (feature, layer) {
                        const props = feature.properties;
                        const id = feature.id;
                        const popupContent = `
                            <div class="popup-card border-0" style="min-width: 240px; font-family: var(--font-sans);">
                                ${createCarousel(id, props.foto_urls)}
                                <div class="p-2">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="fw-bold small">Laporan #${id}</span>
                                        ${createStatusBadge(props.status)}
                                    </div>
                                    <p class="small text-muted mb-1"><strong>Jenis:</strong> ${props.jenis_kerusakan || '-'}</p>
                                    <p class="small text-muted mb-1"><strong>Tingkat:</strong> ${props.tingkat_kerusakan || '-'}</p>
                                    <p class="card-text small mb-2 text-secondary">${props.deskripsi || '<em>Tidak ada deskripsi</em>'}</p>
                                    <div class="d-flex justify-content-between align-items-center pt-2 border-top border-color">
                                        <small class="text-muted" style="font-size: 0.72rem;">${props.tanggal_lapor || ''}</small>
                                        <a href="/laporan/${id}/" class="fw-bold text-primary small" style="text-decoration: none;">
                                            Lihat Detail <i class="fas fa-arrow-right ms-1"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                        layer.bindPopup(popupContent, { maxWidth: 280 });
                        layer.on('popupopen', function () {
                            const popupElement = layer.getPopup().getElement();
                            if (popupElement && modalElement && modalImage) {
                                popupElement.querySelectorAll('.zoomable-image').forEach(image => {
                                    image.addEventListener('dblclick', function () {
                                        modalImage.src = this.dataset.imgUrl;
                                        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                                        modal.show();
                                    });
                                });
                            }
                        });
                    }
                });
                markersLayer.addLayer(geoJsonLayer);
            })
            .catch(error => { console.error('Error fetching GeoJSON:', error); });
    }

    // Panggil saat awal
    loadGeoJson();

    // Event listener filter
    ['filter-status', 'filter-jenis', 'filter-tingkat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', loadGeoJson);
    });

    const resetBtn = document.getElementById('btn-reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (document.getElementById('filter-status')) document.getElementById('filter-status').value = '';
            if (document.getElementById('filter-jenis')) document.getElementById('filter-jenis').value = '';
            if (document.getElementById('filter-tingkat')) document.getElementById('filter-tingkat').value = '';
            loadGeoJson();
        });
    }

});