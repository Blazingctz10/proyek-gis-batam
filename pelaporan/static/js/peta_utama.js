// static/js/peta_utama.js
// Enhanced WebGIS Interactive Workspace with Collapsible Filter Panel, Geolocation & Auto Bounds Fit

document.addEventListener("DOMContentLoaded", function() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const modalElement = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const baseUrl = mapElement.dataset.geojsonUrl;

    // --- 1. Base Maps (Bebas API Key & Tanpa Watermark) ---
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

    const defaultBatamCenter = [1.1250, 104.0380];
    const map = L.map('map', {
        center: defaultBatamCenter,
        zoom: 12,
        layers: [osmLayer]
    });

    const baseMaps = {
        "Peta Jalan Standar (OSM)": osmLayer,
        "Peta Topografi (Esri Topo)": topoLayer,
        "Peta Jalan Halus (Esri Street)": streetLayer,
        "Citra Satelit (Esri Imagery)": satelliteLayer
    };
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // --- 2. Marker Layer Group & Tracking Data ---
    // disableClusteringAtZoom: 13 ensures individual markers are visible without clustering when zoomed in
    let markersLayer = L.markerClusterGroup({
        maxClusterRadius: 28,
        disableClusteringAtZoom: 13,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true
    });
    map.addLayer(markersLayer);

    let currentFeatures = [];
    let markerMapById = {};
    let userLocationMarker = null;
    let userLocationCircle = null;
    let hasFittedInitialBounds = false;

    // Generator Custom GIS Icon with halo pulse for ALL statuses
    function createGisMarkerIcon(status) {
        let pinClass = 'pin-menunggu';
        let iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';

        if (status === 'DIVERIFIKASI') {
            pinClass = 'pin-diverifikasi';
            iconHtml = '<i class="fa-solid fa-clipboard-check"></i>';
        } else if (status === 'DIPERBAIKI') {
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
    
    // Carousel Foto Popup
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
    
    // Status Badge Popup
    function createStatusBadge(status) {
        if (status === 'SELESAI') {
            return `<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i> Selesai</span>`;
        } else if (status === 'DIPERBAIKI') {
            return `<span class="badge bg-warning text-dark"><i class="fa-solid fa-wrench me-1"></i> Sedang Dikerjakan</span>`;
        } else if (status === 'DIVERIFIKASI') {
            return `<span class="badge bg-info text-white"><i class="fa-solid fa-clipboard-check me-1"></i> Terverifikasi</span>`;
        } else {
            return `<span class="badge bg-danger text-white"><i class="fa-solid fa-clock me-1"></i> Review Awal</span>`;
        }
    }

    // Render Drawer List of Reports
    function renderReportDrawer(features) {
        const container = document.getElementById('report-list-container');
        const countBadge = document.getElementById('visible-count');
        const offcanvasCount = document.getElementById('offcanvas-count');

        if (countBadge) countBadge.textContent = features.length;
        if (offcanvasCount) offcanvasCount.textContent = features.length;

        if (!container) return;

        if (!features || features.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                    <p class="small mb-0">Tidak ada titik laporan yang cocok dengan filter saat ini.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="d-flex flex-column gap-2">';
        features.forEach(f => {
            const p = f.properties;
            const id = f.id;
            const photoUrl = (p.foto_urls && p.foto_urls.length > 0) ? p.foto_urls[0] : null;

            html += `
                <div class="card p-2 border card-hover cursor-pointer drawer-report-item" data-id="${id}" style="cursor: pointer; border-radius: var(--radius-sm);">
                    <div class="d-flex gap-2 align-items-center">
                        ${photoUrl ? 
                            `<div class="rounded overflow-hidden flex-shrink-0" style="width: 54px; height: 54px;">
                                <img src="${photoUrl}" class="w-100 h-100 object-fit-cover" alt="Foto">
                            </div>` :
                            `<div class="rounded bg-card-subtle d-flex align-items-center justify-content-center flex-shrink-0 text-muted" style="width: 54px; height: 54px;">
                                <i class="fas fa-road"></i>
                            </div>`
                        }
                        <div class="overflow-hidden flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="fw-bold text-primary small">#${id}</span>
                                ${createStatusBadge(p.status)}
                            </div>
                            <strong class="d-block small text-truncate text-main">${p.jenis_kerusakan || 'Kerusakan Jalan'}</strong>
                            <p class="text-muted small text-truncate mb-0" style="font-size: 0.72rem;">${p.deskripsi || '-'}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        // Click on item inside drawer -> Fly to marker & open popup
        container.querySelectorAll('.drawer-report-item').forEach(item => {
            item.addEventListener('click', function() {
                const targetId = this.dataset.id;
                const marker = markerMapById[targetId];
                if (marker) {
                    const offcanvasEl = document.getElementById('offcanvasReportList');
                    if (offcanvasEl) {
                        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                        if (bsOffcanvas) bsOffcanvas.hide();
                    }
                    map.flyTo(marker.getLatLng(), 16, { duration: 1.2 });
                    setTimeout(() => {
                        marker.openPopup();
                    }, 1250);
                }
            });
        });
    }

    // Update active filter badge on the Filter button
    function updateActiveFilterBadge() {
        const badge = document.getElementById('active-filter-badge');
        if (!badge) return;

        let activeCount = 0;
        const sVal = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';
        const jVal = document.getElementById('filter-jenis') ? document.getElementById('filter-jenis').value : '';
        const tVal = document.getElementById('filter-tingkat') ? document.getElementById('filter-tingkat').value : '';
        const qVal = document.getElementById('filter-search') ? document.getElementById('filter-search').value.trim() : '';

        if (sVal) activeCount++;
        if (jVal) activeCount++;
        if (tVal) activeCount++;
        if (qVal) activeCount++;

        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }

    // --- 3. Fetch Data GeoJSON & Ensure All Markers Render ---
    function loadGeoJson(fitBoundsImmediately = false) {
        updateActiveFilterBadge();

        const statusVal = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';
        const jenisVal = document.getElementById('filter-jenis') ? document.getElementById('filter-jenis').value : '';
        const tingkatVal = document.getElementById('filter-tingkat') ? document.getElementById('filter-tingkat').value : '';
        const searchVal = document.getElementById('filter-search') ? document.getElementById('filter-search').value.trim() : '';

        const params = new URLSearchParams();
        if (statusVal) params.append('status', statusVal);
        if (jenisVal) params.append('jenis', jenisVal);
        if (tingkatVal) params.append('tingkat', tingkatVal);
        if (searchVal) params.append('search', searchVal);

        const fetchUrl = baseUrl + (params.toString() ? ('?' + params.toString()) : '');

        fetch(fetchUrl)
            .then(response => response.json()) 
            .then(data => {
                markersLayer.clearLayers();
                markerMapById = {};
                currentFeatures = (data && data.features) ? data.features : [];

                renderReportDrawer(currentFeatures);

                if (!data || !data.features || data.features.length === 0) return;

                const geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        const marker = L.marker(latlng, {
                            icon: createGisMarkerIcon(feature.properties.status),
                            title: feature.properties.jenis_kerusakan || 'Laporan Kerusakan'
                        });
                        markerMapById[feature.id] = marker;
                        return marker;
                    },
                    onEachFeature: function (feature, layer) {
                        const props = feature.properties;
                        const id = feature.id;
                        const lat = feature.geometry.coordinates[1];
                        const lng = feature.geometry.coordinates[0];

                        const popupContent = `
                            <div class="popup-card border-0" style="min-width: 250px; font-family: var(--font-sans);">
                                ${createCarousel(id, props.foto_urls)}
                                <div class="p-2">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="fw-bold small text-primary">Laporan #${id}</span>
                                        ${createStatusBadge(props.status)}
                                    </div>
                                    <p class="small text-muted mb-1"><strong>Jenis:</strong> ${props.jenis_kerusakan || '-'}</p>
                                    <p class="small text-muted mb-1"><strong>Tingkat:</strong> ${props.tingkat_kerusakan || '-'}</p>
                                    <p class="card-text small mb-2 text-secondary">${props.deskripsi || '<em>Tidak ada deskripsi</em>'}</p>
                                    
                                    <div class="d-flex gap-1 mb-2 pt-1">
                                        <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-outline-success btn-sm py-1 px-2 flex-grow-1" style="font-size: 0.72rem;">
                                            <i class="fas fa-location-arrow me-1"></i> Rute Maps
                                        </a>
                                        <button type="button" class="btn btn-outline-secondary btn-sm py-1 px-2 btn-popup-copy" data-coords="${lat.toFixed(5)}, ${lng.toFixed(5)}" style="font-size: 0.72rem;" title="Salin Koordinat">
                                            <i class="far fa-copy"></i>
                                        </button>
                                    </div>

                                    <div class="d-flex justify-content-between align-items-center pt-2 border-top border-color">
                                        <small class="text-muted" style="font-size: 0.72rem;">${props.tanggal_lapor || ''}</small>
                                        <a href="/laporan/${id}/" class="fw-bold text-primary small" style="text-decoration: none;">
                                            Lihat Detail <i class="fas fa-arrow-right ms-1"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                        layer.bindPopup(popupContent, { maxWidth: 290 });
                        layer.on('popupopen', function () {
                            const popupElement = layer.getPopup().getElement();
                            if (popupElement) {
                                // Zoomable image
                                if (modalElement && modalImage) {
                                    popupElement.querySelectorAll('.zoomable-image').forEach(image => {
                                        image.addEventListener('dblclick', function () {
                                            modalImage.src = this.dataset.imgUrl;
                                            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                                            modal.show();
                                        });
                                    });
                                }
                                // Copy coords button
                                const copyBtn = popupElement.querySelector('.btn-popup-copy');
                                if (copyBtn) {
                                    copyBtn.addEventListener('click', function() {
                                        navigator.clipboard.writeText(this.dataset.coords).then(() => {
                                            this.innerHTML = '<i class="fas fa-check text-success"></i>';
                                            setTimeout(() => { this.innerHTML = '<i class="far fa-copy"></i>'; }, 1500);
                                        });
                                    });
                                }
                            }
                        });
                    }
                });

                markersLayer.addLayer(geoJsonLayer);

                // Auto Fit Bounds so ALL reports are displayed within viewport on load or when filtered
                if ((!hasFittedInitialBounds || fitBoundsImmediately) && currentFeatures.length > 0) {
                    const bounds = geoJsonLayer.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds.pad(0.12));
                        hasFittedInitialBounds = true;
                    }
                }
            })
            .catch(error => { console.error('Error fetching GeoJSON:', error); });
    }

    // Initial load
    loadGeoJson(true);

    // Event listener dropdown filter
    ['filter-status', 'filter-jenis', 'filter-tingkat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => loadGeoJson(false));
    });

    // Debounced Search Input
    let searchTimeout = null;
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadGeoJson(false), 350);
        });
    }

    // Category Chips Filtering
    document.querySelectorAll('.chip-category-btn').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.chip-category-btn').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const jenisSelect = document.getElementById('filter-jenis');
            if (jenisSelect) {
                jenisSelect.value = this.dataset.jenis;
            }
            loadGeoJson(false);
        });
    });

    // Reset Filter Button
    const resetBtn = document.getElementById('btn-reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (document.getElementById('filter-status')) document.getElementById('filter-status').value = '';
            if (document.getElementById('filter-jenis')) document.getElementById('filter-jenis').value = '';
            if (document.getElementById('filter-tingkat')) document.getElementById('filter-tingkat').value = '';
            if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
            document.querySelectorAll('.chip-category-btn').forEach(c => {
                c.classList.toggle('active', c.dataset.jenis === '');
            });
            loadGeoJson(true);
        });
    }

    // Geolocation: My Location GPS Button with full feedback
    const myLocBtn = document.getElementById('btn-my-location');
    if (myLocBtn) {
        myLocBtn.addEventListener('click', function() {
            if (!navigator.geolocation) {
                alert('Perangkat atau browser Anda tidak mendukung fitur geolokasi GPS.');
                return;
            }

            myLocBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> <span>Mencari...</span>';
            myLocBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    myLocBtn.innerHTML = '<i class="fas fa-crosshairs"></i> <span>Lokasi Saya</span>';
                    myLocBtn.disabled = false;

                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    // Remove previous user location markers if any
                    if (userLocationMarker) map.removeLayer(userLocationMarker);
                    if (userLocationCircle) map.removeLayer(userLocationCircle);

                    // Add user location pulsing icon
                    const userIcon = L.divIcon({
                        className: 'user-gps-marker',
                        html: `
                            <div style="position: relative; width: 22px; height: 22px;">
                                <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #0284c7; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                                <div style="position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 0 8px rgba(2,132,199,0.8);"></div>
                            </div>
                        `,
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });

                    userLocationMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
                    userLocationMarker.bindPopup(`<strong>Lokasi Anda Saat Ini</strong><br><small class="text-muted">Akurasi GPS: &plusmn;${Math.round(accuracy)} meter</small>`).openPopup();

                    userLocationCircle = L.circle([userLat, userLng], {
                        radius: Math.max(accuracy, 60),
                        color: '#ea580c',
                        fillColor: '#f97316',
                        fillOpacity: 0.16,
                        weight: 1.5
                    }).addTo(map);

                    map.flyTo([userLat, userLng], 16, { duration: 1.5 });
                },
                function(error) {
                    myLocBtn.innerHTML = '<i class="fas fa-crosshairs"></i> <span>Lokasi Saya</span>';
                    myLocBtn.disabled = false;
                    let msg = 'Gagal mendeteksi lokasi GPS.';
                    if (error.code === 1) msg = 'Izin lokasi GPS ditolak oleh pengguna.';
                    else if (error.code === 2) msg = 'Posisi GPS tidak tersedia.';
                    else if (error.code === 3) msg = 'Batas waktu deteksi GPS terlampaui.';
                    alert(msg);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
            );
        });
    }

});