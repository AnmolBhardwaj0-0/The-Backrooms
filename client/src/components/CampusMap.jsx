import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './CampusMap.css';
import { sounds } from '../utils/sound';

// Strict Campus Boundaries (PDPM IIITDM Jabalpur)
export const CAMPUS_CENTER = [23.1768, 80.0245];
export const CAMPUS_BOUNDS = [
  [23.1670, 80.0135], // Southwest
  [23.1835, 80.0355]  // Northeast
];
export const DEFAULT_ZOOM = 16.5;

// Strict Geofencing: checks whether coordinates are inside campus bounds
export function isWithinCampus(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  return (
    numLat >= CAMPUS_BOUNDS[0][0] &&
    numLat <= CAMPUS_BOUNDS[1][0] &&
    numLng >= CAMPUS_BOUNDS[0][1] &&
    numLng <= CAMPUS_BOUNDS[1][1]
  );
}

// Master Identified Campus Landmarks
export const CAMPUS_LANDMARKS = [
  {
    id: 'lhc',
    name: 'Lecture Hall Complex (LHC)',
    shortName: 'LHC',
    code: 'LHC',
    category: 'Academic',
    emoji: '🎓',
    coords: [23.178567, 80.025767],
    desc: 'Main Lecture Theatres (LHC 101 - 106), Seminar Halls & Smart Classrooms'
  },
  {
    id: 'cclab',
    name: 'Computer Centre (CC Lab)',
    shortName: 'CC Lab',
    code: 'CC',
    category: 'Academic',
    emoji: '💻',
    coords: [23.178351, 80.026301],
    desc: 'Central High Performance Computing Facility, AI Research Labs & CC3 Coding Lab'
  },
  {
    id: 'corelab',
    name: 'Core Lab Complex (CLC)',
    shortName: 'Core Lab',
    code: 'CLC',
    category: 'Academic',
    emoji: '⚡',
    coords: [23.177962, 80.025842],
    desc: 'Electronics, VLSI, Embedded Systems, Mechatronics & Signal Processing Labs'
  },
  {
    id: 'library',
    name: 'Central Library & Resource Centre',
    shortName: 'Central Library',
    code: 'LIB',
    category: 'Academic',
    emoji: '📚',
    coords: [23.178722, 80.026001],
    desc: 'Central Campus Library, Quiet Reading Wings, Digital Archives & e-Resource Centre'
  },
  {
    id: 'hall1',
    name: 'Hall of Residence 1 (Ashoka)',
    shortName: 'Hall 1',
    code: 'H1',
    category: 'Hostel',
    emoji: '🛏️',
    coords: [23.176758, 80.019951],
    desc: "Undergraduate Men's Hostel (Blocks A & B), Quadrangle & Common Rooms"
  },
  {
    id: 'hall2',
    name: 'Hall of Residence 2 (Maa Saraswati)',
    shortName: 'Hall 2',
    code: 'H2',
    category: 'Hostel',
    emoji: '🛏️',
    coords: [23.174989, 80.022292],
    desc: "Women's Hall of Residence, Dining Hall & Garden Courtyard"
  },
  {
    id: 'hall3',
    name: 'Hall of Residence 3 (Nagarjuna)',
    shortName: 'Hall 3',
    code: 'H3',
    category: 'Hostel',
    emoji: '🛏️',
    coords: [23.175262, 80.020591],
    desc: 'Postgraduate & Senior Student Residence, Dining Hall & Courts'
  },
  {
    id: 'hall4',
    name: 'Hall of Residence 4 (Panini)',
    shortName: 'Hall 4',
    code: 'H4',
    category: 'Hostel',
    emoji: '🛏️',
    coords: [23.178226, 80.022843],
    desc: "Men's Hall of Residence 4, Indoor Games Room & Single Rooms"
  },
  {
    id: 'centralmess',
    name: 'Central Mess & Dining Arena',
    shortName: 'Central Mess',
    code: 'MESS',
    category: 'Dining',
    emoji: '🍽️',
    coords: [23.177354, 80.021291],
    desc: 'Main Student Mess 1 & 2 serving daily breakfast, lunch, snacks & dinner'
  },
  {
    id: 'hexagon',
    name: 'Hexagon Canteen & Food Court',
    shortName: 'Hexagon Canteen',
    code: 'HEX',
    category: 'Dining',
    emoji: '☕',
    coords: [23.178085, 80.024558],
    desc: 'Hyderabad Fried Chicken (HFC), Nescafé Coffee Kiosk, Juice Bar & Night Canteen'
  },
  {
    id: 'sac',
    name: 'Student Activity Centre (SAC)',
    shortName: 'SAC',
    code: 'SAC',
    category: 'Student Hub',
    emoji: '🎭',
    coords: [23.176400, 80.023060],
    desc: 'Gym, Dance, Music Studios, Robotics, Table Tennis & Multipurpose Arena'
  },
  {
    id: 'oat',
    name: 'Open Air Theatre (OAT)',
    shortName: 'OAT',
    code: 'OAT',
    category: 'Cultural',
    emoji: '🎪',
    coords: [23.176798, 80.023609],
    desc: 'Grand Open-Air Amphitheatre for Tarang Cultural Fest & Live Concerts'
  },
  {
    id: 'admin',
    name: 'Administrative Block',
    shortName: 'Admin Block',
    code: 'ADMIN',
    category: 'Administration',
    emoji: '🏢',
    coords: [23.179545, 80.027431],
    desc: "Director's Office, Dean of Academic Affairs, Registrar & Administration"
  },
  {
    id: 'phc',
    name: 'Primary Health Centre (PHC)',
    shortName: 'PHC Dispensary',
    code: 'PHC',
    category: 'Healthcare',
    emoji: '🏥',
    coords: [23.176072, 80.027872],
    desc: '24/7 Campus Medical Dispensary, Qualified Doctors & Emergency Ambulance'
  },
  {
    id: 'sports',
    name: 'Main Sports Arena & Grounds',
    shortName: 'Sports Ground',
    code: 'SPORTS',
    category: 'Sports',
    emoji: '⚽',
    coords: [23.176357, 80.021896],
    desc: 'Full-size Cricket Ground, Football Field, Floodlit Basketball & Tennis Courts'
  },
  {
    id: 'vgh',
    name: 'Visitors Guest House (VGH)',
    shortName: 'Guest House',
    code: 'VGH',
    category: 'Hospitality',
    emoji: '🏡',
    coords: [23.174789, 80.028062],
    desc: 'Executive Campus Guest House & VIP Accommodations'
  }
];

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function CampusMap({
  pins = [],
  userProfile,
  theme = 'dark',
  onOpenRoom,
  onOpenMarketplace,
  onOpenLostFound,
  isPlacingPin = false,
  onCancelPlacingPin,
  onMapClickToPlace
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const landmarksLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const collegeMarkerRef = useRef(null);
  const currentTileLayerRef = useRef(null);

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'room' | 'marketplace' | 'lostfound'
  const [geojsonData, setGeojsonData] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemapProvider, setBasemapProvider] = useState('carto'); // 'carto' | 'esri'
  const [selectedLandmarkId, setSelectedLandmarkId] = useState(null);
  const [outOfBoundsError, setOutOfBoundsError] = useState(false);

  // 1. Fetch enriched map.geojson once
  useEffect(() => {
    let isMounted = true;
    fetch('/map.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load map.geojson');
        return res.json();
      })
      .then(data => {
        if (isMounted) setGeojsonData(data);
      })
      .catch(err => {
        console.warn('Could not load /map.geojson:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // 2. Initialize Static Bounded Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const leafletBounds = L.latLngBounds(CAMPUS_BOUNDS);

    const map = L.map(mapContainerRef.current, {
      center: CAMPUS_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 15.5,
      maxZoom: 19.5,
      maxBounds: leafletBounds,
      maxBoundsViscosity: 1.0, // Strictly locks map to campus bounds
      zoomControl: false,
      attributionControl: true,
      inertia: true,
      inertiaDeceleration: 4500,
      wheelDebounceTime: 25,
      zoomSnap: 0.25,
      zoomDelta: 0.5
    });

    // Helper to get tile URL matching theme and provider
    const tileUrl = theme === 'light'
      ? (basemapProvider === 'esri'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')
      : (basemapProvider === 'esri'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

    const attribution = basemapProvider === 'esri'
      ? '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19.5,
      subdomains: 'abcd',
      attribution
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Permanent College Master Landmark Center Badge
    const collegeIcon = L.divIcon({
      html: `
        <div class="college-master-landmark ${theme === 'light' ? 'landmark-light' : 'landmark-dark'}">
          <div class="college-landmark-glow"></div>
          <div class="college-landmark-card">
            <span class="college-landmark-icon">🏛️</span>
            <div class="college-landmark-info">
              <span class="college-landmark-name">PDPM IIITDM Jabalpur</span>
              <span class="college-landmark-coords">23.1768° N, 80.0245° E &bull; Main Campus</span>
            </div>
          </div>
        </div>
      `,
      className: 'custom-college-landmark-wrap',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const collegeMarker = L.marker(CAMPUS_CENTER, {
      icon: collegeIcon,
      zIndexOffset: 600,
      interactive: true
    }).addTo(map);

    collegeMarker.bindTooltip('🏛️ PDPM IIITDM Jabalpur Campus Centre', {
      className: theme === 'light' ? 'geojson-feature-tooltip tooltip-light' : 'geojson-feature-tooltip tooltip-dark',
      direction: 'top',
      offset: [0, -28]
    });

    collegeMarkerRef.current = collegeMarker;

    // Layer Group for Permanent Campus Building Badges
    const landmarksLayer = L.layerGroup().addTo(map);
    landmarksLayerRef.current = landmarksLayer;

    // Initialize Marker Cluster Group for user pins
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 36,
      spiderfyOnMaxZoom: true,
      animate: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const badgeClass = theme === 'light' ? 'custom-cluster-badge cluster-light' : 'custom-cluster-badge cluster-dark';
        return L.divIcon({
          html: `<div class="${badgeClass}" style="width: 36px; height: 36px;"><span>${count}</span></div>`,
          className: 'cluster-marker-wrap',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
    mapRef.current = map;
    setMapReady(true);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. Render Permanent Campus Building Landmark Markers
  useEffect(() => {
    const map = mapRef.current;
    const landmarksLayer = landmarksLayerRef.current;
    if (!map || !landmarksLayer) return;

    landmarksLayer.clearLayers();
    const isLight = theme === 'light';

    CAMPUS_LANDMARKS.forEach(lm => {
      const isSelected = selectedLandmarkId === lm.id;

      let categoryClass = 'cat-academic';
      if (lm.category === 'Hostel') categoryClass = 'cat-hostel';
      else if (lm.category === 'Dining') categoryClass = 'cat-dining';
      else if (lm.category === 'Student Hub' || lm.category === 'Cultural') categoryClass = 'cat-student';
      else if (lm.category === 'Sports') categoryClass = 'cat-sports';
      else if (lm.category === 'Healthcare') categoryClass = 'cat-health';
      else if (lm.category === 'Administration') categoryClass = 'cat-admin';

      const iconHtml = `
        <div class="building-map-pin ${isLight ? 'bldg-light' : 'bldg-dark'} ${categoryClass} ${isSelected ? 'selected-landmark' : ''}">
          <div class="bldg-pin-icon">${lm.emoji}</div>
          <div class="bldg-pin-label">
            <span class="bldg-pin-title">${escapeHtml(lm.shortName)}</span>
            <span class="bldg-pin-code">${escapeHtml(lm.code)}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-building-landmark-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -22]
      });

      const marker = L.marker(lm.coords, {
        icon: customIcon,
        zIndexOffset: 300
      });

      // Building popup card
      const popupCard = document.createElement('div');
      popupCard.className = `pin-popup-card ${isLight ? 'popup-light' : 'popup-dark'}`;
      popupCard.innerHTML = `
        <div class="pin-popup-header">
          <div class="pin-popup-icon-box" style="background: var(--accent-subtle, rgba(255, 59, 59, 0.15)); font-size: 1.25rem;">
            ${lm.emoji}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h4 class="pin-popup-title" style="font-size: 0.95rem;">${escapeHtml(lm.name)}</h4>
            <span style="font-size: 0.72rem; color: var(--accent, #ff3b3b); font-weight: 700; text-transform: uppercase;">
              ${escapeHtml(lm.category)} &bull; ${escapeHtml(lm.code)}
            </span>
          </div>
        </div>
        <p class="pin-popup-desc" style="font-size: 0.82rem; margin-top: 4px;">
          ${escapeHtml(lm.desc)}
        </p>
        <div class="pin-popup-meta" style="font-size: 0.72rem; margin-top: 4px;">
          <span>📍 ${lm.coords[0].toFixed(5)}° N, ${lm.coords[1].toFixed(5)}° E</span>
        </div>
        <div class="pin-popup-actions" style="margin-top: 10px;">
          <button class="btn-pill-primary pin-popup-cta-btn" style="width: 100%; justify-content: center; padding: 8px 12px; font-size: 0.82rem;" id="btn-drop-at-${lm.id}">
            📍 Create Event / Lounge Here ➔
          </button>
        </div>
      `;

      marker.bindPopup(popupCard);

      marker.on('click', () => {
        sounds.playPop();
        setSelectedLandmarkId(lm.id);
        map.flyTo(lm.coords, Math.max(map.getZoom(), 17.5), { duration: 0.5, easeLinearity: 0.25 });
      });

      marker.on('popupopen', () => {
        const btnDrop = document.getElementById(`btn-drop-at-${lm.id}`);
        if (btnDrop) {
          btnDrop.onclick = () => {
            marker.closePopup();
            sounds.playSuccess();
            if (typeof onMapClickToPlace === 'function') {
              onMapClickToPlace({ lat: lm.coords[0], lng: lm.coords[1] });
            }
          };
        }
      });

      landmarksLayer.addLayer(marker);
    });
  }, [theme, selectedLandmarkId, onMapClickToPlace]);

  // 4. Update Basemap Tile
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileUrl = theme === 'light'
      ? (basemapProvider === 'esri'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')
      : (basemapProvider === 'esri'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

    const attribution = basemapProvider === 'esri'
      ? '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19.5,
      subdomains: 'abcd',
      attribution
    }).addTo(map);

    currentTileLayerRef.current = newTileLayer;

    // Update college marker theme
    if (collegeMarkerRef.current) {
      const collegeIcon = L.divIcon({
        html: `
          <div class="college-master-landmark ${theme === 'light' ? 'landmark-light' : 'landmark-dark'}">
            <div class="college-landmark-glow"></div>
            <div class="college-landmark-card">
              <span class="college-landmark-icon">🏛️</span>
              <div class="college-landmark-info">
                <span class="college-landmark-name">PDPM IIITDM Jabalpur</span>
                <span class="college-landmark-coords">23.1768° N, 80.0245° E &bull; Main Campus</span>
              </div>
            </div>
          </div>
        `,
        className: 'custom-college-landmark-wrap',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      collegeMarkerRef.current.setIcon(collegeIcon);
    }
  }, [basemapProvider, theme]);

  // 5. Render GeoJSON Vector Polygons with Category Highlights
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojsonData) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    const isLight = theme === 'light';

    const geojsonLayer = L.geoJSON(geojsonData, {
      style: (feature) => {
        const geomType = feature.geometry?.type;
        const props = feature.properties || {};
        const cat = props.category || '';

        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          let fillCol = isLight ? '#eae4d6' : '#181114';
          let borderCol = isLight ? 'rgba(26, 26, 26, 0.4)' : 'rgba(255, 59, 59, 0.4)';

          if (cat === 'Academic') {
            fillCol = isLight ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.26)';
            borderCol = isLight ? '#2563eb' : '#60a5fa';
          } else if (cat === 'Hostel') {
            fillCol = isLight ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.26)';
            borderCol = isLight ? '#d97706' : '#fbbf24';
          } else if (cat === 'Dining') {
            fillCol = isLight ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.26)';
            borderCol = isLight ? '#059669' : '#34d399';
          } else if (cat === 'Sports') {
            fillCol = isLight ? 'rgba(168, 85, 247, 0.22)' : 'rgba(168, 85, 247, 0.26)';
            borderCol = isLight ? '#9333ea' : '#c084fc';
          } else if (cat === 'Student Hub' || cat === 'Cultural') {
            fillCol = isLight ? 'rgba(236, 72, 153, 0.22)' : 'rgba(236, 72, 153, 0.26)';
            borderCol = isLight ? '#db2777' : '#f472b6';
          }

          return {
            fillColor: fillCol,
            fillOpacity: 0.85,
            color: borderCol,
            weight: 1.8,
            opacity: 0.95
          };
        }

        if (geomType === 'LineString' || geomType === 'MultiLineString') {
          const isFootway = props.highway === 'footway' || props.highway === 'path';
          return {
            color: isLight
              ? (isFootway ? 'rgba(26, 26, 26, 0.3)' : 'rgba(26, 26, 26, 0.7)')
              : (isFootway ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 59, 59, 0.7)'),
            weight: isFootway ? 2 : 3.2,
            opacity: 0.9,
            dashArray: isFootway ? '4, 4' : null
          };
        }

        return {
          color: isLight ? '#a31d24' : '#ff3b3b',
          weight: 2
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const title = props.name || 'Campus Building';
        const desc = props.description ? `<br/><span style="font-size: 0.72rem; opacity: 0.85; font-weight: normal;">${escapeHtml(props.description)}</span>` : '';
        const categoryBadge = props.category ? `<span class="building-cat-badge">${escapeHtml(props.category)}</span> ` : '';

        layer.bindTooltip(`<div>${categoryBadge}<strong>${escapeHtml(title)}</strong>${desc}</div>`, {
          className: isLight ? 'geojson-feature-tooltip tooltip-light' : 'geojson-feature-tooltip tooltip-dark',
          direction: 'center',
          permanent: false
        });

        layer.on({
          click: (e) => {
            if (e.latlng) {
              sounds.playPop();
              map.flyTo(e.latlng, Math.max(map.getZoom(), 17.5), { duration: 0.5, easeLinearity: 0.25 });
            }
          },
          mouseover: (e) => {
            const l = e.target;
            if (l.setStyle) {
              l.setStyle({
                fillColor: isLight ? '#ded5c2' : '#3d1d23',
                fillOpacity: 0.95,
                color: isLight ? '#18181b' : '#ff3b3b',
                weight: 2.6
              });
            }
          },
          mouseout: (e) => {
            geojsonLayer.resetStyle(e.target);
          }
        });
      }
    });

    geojsonLayer.addTo(map);
    geojsonLayerRef.current = geojsonLayer;
  }, [geojsonData, theme]);

  // 6. STRICT GEOFENCING: Click to place pin on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isPlacingPin) return;

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // STRICT CHECK: Reject any point outside campus boundary
      if (!isWithinCampus(clickLat, clickLng)) {
        sounds.playBoing();
        setOutOfBoundsError(true);
        setTimeout(() => setOutOfBoundsError(false), 3600);
        return;
      }

      sounds.playSuccess();
      if (typeof onMapClickToPlace === 'function') {
        onMapClickToPlace({ lat: clickLat, lng: clickLng });
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPlacingPin, onMapClickToPlace]);

  // 7. Filter pins based on active tab
  const filteredPins = useMemo(() => {
    if (activeFilter === 'all') return pins;
    return pins.filter(p => p.type === activeFilter);
  }, [pins, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: pins.length,
      room: pins.filter(p => p.type === 'room').length,
      marketplace: pins.filter(p => p.type === 'marketplace').length,
      lostfound: pins.filter(p => p.type === 'lostfound').length
    };
  }, [pins]);

  // 8. Render User Pins in Cluster Group
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();
    const isLight = theme === 'light';

    filteredPins.forEach(pin => {
      let lat = Number(pin.lat);
      let lng = Number(pin.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      if (!isWithinCampus(lat, lng)) {
        lat = CAMPUS_CENTER[0];
        lng = CAMPUS_CENTER[1];
      }

      let iconInnerHtml = '';
      if (pin.type === 'room') {
        iconInnerHtml = `
          <div class="pin-marker-pill pin-type-room ${isLight ? 'pin-light-room' : 'pin-dark-room'}">
            <div class="pin-icon-avatar">🗣️</div>
            <span class="pin-label-title">${escapeHtml(pin.title)}</span>
            <span class="pin-pulse-dot" title="Live lounge"></span>
          </div>
        `;
      } else if (pin.type === 'marketplace') {
        const price = pin.marketData?.price ? String(pin.marketData.price) : '$0';
        iconInnerHtml = `
          <div class="pin-marker-pill pin-type-marketplace ${isLight ? 'pin-light-market' : 'pin-dark-market'}">
            <div class="pin-icon-avatar">🏷️</div>
            <span class="pin-label-title">${escapeHtml(pin.title)}</span>
            <span class="pin-price-chip-tag">${escapeHtml(price)}</span>
          </div>
        `;
      } else if (pin.type === 'lostfound') {
        const cat = (pin.lostFoundData?.category || 'lost').toUpperCase();
        iconInnerHtml = `
          <div class="pin-marker-pill pin-type-lostfound ${isLight ? 'pin-light-lf' : 'pin-dark-lf'}">
            <div class="pin-icon-avatar">📝</div>
            <span class="pin-label-title">${escapeHtml(pin.title)}</span>
            <span class="pin-lf-status-chip">${cat}</span>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: iconInnerHtml,
        className: 'custom-map-pin',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        sounds.playPop();
        map.flyTo([lat, lng], Math.max(map.getZoom(), 17.5), { duration: 0.5, easeLinearity: 0.25 });
      });

      const popupContainer = document.createElement('div');
      popupContainer.className = `pin-popup-card ${isLight ? 'popup-light' : 'popup-dark'}`;

      let headerIconBg = isLight ? 'rgba(24, 24, 27, 0.08)' : 'rgba(255, 59, 59, 0.15)';
      let headerIconColor = isLight ? '#18181b' : '#ff3b3b';
      let emoji = '🗣️';

      if (pin.type === 'marketplace') {
        headerIconBg = isLight ? 'rgba(5, 150, 105, 0.12)' : 'rgba(16, 185, 129, 0.15)';
        headerIconColor = isLight ? '#059669' : '#10b981';
        emoji = '🏷️';
      } else if (pin.type === 'lostfound') {
        headerIconBg = isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)';
        headerIconColor = isLight ? '#d97706' : '#f59e0b';
        emoji = '📝';
      }

      let extraContentHtml = '';
      let ctaBtnHtml = '';

      if (pin.type === 'room') {
        const catBadge = pin.category || 'General';
        extraContentHtml = `
          <p class="pin-popup-desc">${escapeHtml(pin.description || 'A cozy campus lounge pin.')}</p>
          <div class="pin-popup-meta">
            <span>🏷️ ${escapeHtml(catBadge)}</span>
            <span>•</span>
            <span>By ${escapeHtml(pin.createdBy?.name || 'Student')}</span>
          </div>
        `;
        ctaBtnHtml = `<button class="btn-pill-primary pin-popup-cta-btn" style="width: 100%; justify-content: center; padding: 8px 14px; font-size: 0.84rem;" id="btn-open-room-${pin.id}">Step Inside ➔</button>`;
      } else if (pin.type === 'marketplace') {
        const price = pin.marketData?.price || '$0';
        const mktType = (pin.marketData?.listingType || 'sell').toUpperCase();
        const commentsCount = pin.marketData?.comments ? pin.marketData.comments.length : 0;
        const photo = pin.marketData?.photoUrl ? `<img src="${escapeHtml(pin.marketData.photoUrl)}" alt="${escapeHtml(pin.title)}" class="pin-popup-img-thumb" />` : '';
        extraContentHtml = `
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="pin-popup-price-tag">${escapeHtml(price)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">(${mktType})</span>
          </div>
          ${photo}
          <p class="pin-popup-desc" style="font-size: 0.8rem;">${escapeHtml(pin.description || 'Listed on campus market.')}</p>
          <div class="pin-popup-meta">
            <span>💬 ${commentsCount} offers / comments</span>
            <span>•</span>
            <span>By ${escapeHtml(pin.createdBy?.name || 'Student')}</span>
          </div>
        `;
        ctaBtnHtml = `
          <button class="btn-pill-primary pin-popup-cta-btn" style="width: 100%; justify-content: center; padding: 8px 14px; font-size: 0.84rem;" id="btn-open-mkt-${pin.id}">Trade Comments & Offers (${commentsCount}) 💬</button>
          ${pin.roomId ? `<button class="btn-pill-secondary pin-popup-cta-btn" style="width: 100%; justify-content: center; padding: 6px 12px; font-size: 0.78rem; margin-top: 6px;" id="btn-room-mkt-${pin.id}">🚪 Negotiation Room</button>` : ''}
        `;
      } else if (pin.type === 'lostfound') {
        const lfCat = (pin.lostFoundData?.category || 'lost').toUpperCase();
        const commentCount = pin.lostFoundData?.comments ? pin.lostFoundData.comments.length : 0;
        const photo = pin.lostFoundData?.photoUrl ? `<img src="${escapeHtml(pin.lostFoundData.photoUrl)}" alt="${escapeHtml(pin.title)}" class="pin-popup-img-thumb" />` : '';
        extraContentHtml = `
          <div>
            <span class="pin-popup-lf-tag">${lfCat} ITEM</span>
          </div>
          ${photo}
          <p class="pin-popup-desc" style="font-size: 0.8rem;">${escapeHtml(pin.lostFoundData?.description || pin.description || 'Lost & Found post on campus.')}</p>
          <div class="pin-popup-meta">
            <span>💬 ${commentCount} comments</span>
            <span>•</span>
            <span>By ${escapeHtml(pin.createdBy?.name || 'Student')}</span>
          </div>
        `;
        ctaBtnHtml = `<button class="btn-pill-primary pin-popup-cta-btn" style="width: 100%; justify-content: center; padding: 8px 14px; font-size: 0.84rem;" id="btn-open-lf-${pin.id}">View Post & Comments (${commentCount}) 📝</button>`;
      }

      popupContainer.innerHTML = `
        <div class="pin-popup-header">
          <div class="pin-popup-icon-box" style="background: ${headerIconBg}; color: ${headerIconColor};">
            ${emoji}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h4 class="pin-popup-title">${escapeHtml(pin.title)}</h4>
          </div>
        </div>
        ${extraContentHtml}
        <div class="pin-popup-actions" style="margin-top: 10px;">
          ${ctaBtnHtml}
        </div>
      `;

      marker.bindPopup(popupContainer);

      marker.on('popupopen', () => {
        const btnRoom = document.getElementById(`btn-open-room-${pin.id}`);
        if (btnRoom) {
          btnRoom.onclick = () => {
            marker.closePopup();
            if (typeof onOpenRoom === 'function') {
              onOpenRoom(pin.roomId || pin.id);
            }
          };
        }

        const btnMkt = document.getElementById(`btn-open-mkt-${pin.id}`);
        if (btnMkt) {
          btnMkt.onclick = () => {
            marker.closePopup();
            if (typeof onOpenMarketplace === 'function') {
              onOpenMarketplace(pin);
            }
          };
        }

        const btnMktRoom = document.getElementById(`btn-room-mkt-${pin.id}`);
        if (btnMktRoom) {
          btnMktRoom.onclick = () => {
            marker.closePopup();
            if (typeof onOpenRoom === 'function' && pin.roomId) {
              onOpenRoom(pin.roomId);
            }
          };
        }

        const btnLf = document.getElementById(`btn-open-lf-${pin.id}`);
        if (btnLf) {
          btnLf.onclick = () => {
            marker.closePopup();
            if (typeof onOpenLostFound === 'function') {
              onOpenLostFound(pin);
            }
          };
        }
      });

      clusterGroup.addLayer(marker);
    });
  }, [filteredPins, theme, onOpenRoom, onOpenMarketplace, onOpenLostFound]);

  // Jump to specific building landmark
  const handleJumpToLandmark = (landmark) => {
    sounds.playPop();
    setSelectedLandmarkId(landmark.id);
    if (mapRef.current) {
      mapRef.current.flyTo(landmark.coords, 18, { duration: 0.6, easeLinearity: 0.25 });
    }
  };

  const handleRecenter = () => {
    sounds.playPop();
    setSelectedLandmarkId(null);
    if (mapRef.current) {
      mapRef.current.flyTo(CAMPUS_CENTER, DEFAULT_ZOOM, { duration: 0.6, easeLinearity: 0.25 });
    }
  };

  const handleZoomIn = () => {
    sounds.playPop();
    if (mapRef.current) mapRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    sounds.playPop();
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const toggleBasemap = () => {
    sounds.playBoing();
    setBasemapProvider(prev => prev === 'carto' ? 'esri' : 'carto');
  };

  return (
    <div className={`campus-map-wrapper ${isPlacingPin ? 'placing-mode' : ''}`} data-theme={theme}>
      {/* Top Filter Chips */}
      <div className="map-overlay-topbar">
        <div className="map-filter-chips">
          <button
            type="button"
            className={`map-chip-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>🌐 All Campus Pins</span>
            <span className="map-chip-count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`map-chip-btn chip-room ${activeFilter === 'room' ? 'active' : ''}`}
            onClick={() => setActiveFilter('room')}
          >
            <span>🗣️ Social Lounges</span>
            <span className="map-chip-count">{counts.room}</span>
          </button>
          <button
            type="button"
            className={`map-chip-btn chip-market ${activeFilter === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveFilter('marketplace')}
          >
            <span>🏷️ Campus Market</span>
            <span className="map-chip-count">{counts.marketplace}</span>
          </button>
          <button
            type="button"
            className={`map-chip-btn chip-lostfound ${activeFilter === 'lostfound' ? 'active' : ''}`}
            onClick={() => setActiveFilter('lostfound')}
          >
            <span>📝 Lost & Found</span>
            <span className="map-chip-count">{counts.lostfound}</span>
          </button>
        </div>
      </div>

      {/* Building Landmarks Quick Jump Navigator */}
      <div className="landmark-quick-navigator">
        <span className="nav-strip-label">🏛️ Buildings:</span>
        <div className="landmark-pills-row">
          {CAMPUS_LANDMARKS.map(lm => (
            <button
              key={lm.id}
              type="button"
              className={`landmark-quick-pill ${selectedLandmarkId === lm.id ? 'active' : ''}`}
              onClick={() => handleJumpToLandmark(lm)}
              title={`${lm.name} (${lm.category})`}
            >
              <span>{lm.emoji}</span>
              <span>{lm.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Placing Pin Active Banner */}
      {isPlacingPin && (
        <div className="map-placing-banner">
          <span>📍 Click on any building or lawn inside campus to drop your pin</span>
          <button
            type="button"
            className="map-placing-cancel-btn"
            onClick={onCancelPlacingPin}
          >
            Cancel
          </button>
        </div>
      )}

      {/* STRICT GEOFENCE OUT OF BOUNDS ERROR BANNER */}
      {outOfBoundsError && (
        <div className="map-geofence-alert">
          <div className="geofence-alert-badge">⛔ OUT OF CAMPUS BOUNDARY</div>
          <span>Events, lounges, and pins can ONLY be created inside PDPM IIITDMJ campus grounds!</span>
        </div>
      )}

      {/* Static Campus Watermark Badge */}
      <div className="campus-locked-badge">
        <span className="campus-lock-dot"></span>
        <span>PDPM IIITDM Jabalpur &bull; Static Bounded Campus</span>
      </div>

      {/* Floating HUD Controls */}
      <div className="map-floating-hud">
        <button
          type="button"
          className="map-hud-btn"
          onClick={toggleBasemap}
          title={basemapProvider === 'carto' ? 'Switch to Satellite / Topo View' : 'Switch to Clean Carto View'}
        >
          {basemapProvider === 'carto' ? '🗺️' : '🛰️'}
        </button>
        <button
          type="button"
          className="map-hud-btn"
          onClick={handleRecenter}
          title="Recenter Campus Map"
        >
          🎯
        </button>
        <div className="map-hud-group">
          <button
            type="button"
            className="map-hud-btn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="map-hud-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>

      {/* Main Leaflet Container */}
      <div ref={mapContainerRef} className="campus-leaflet-container" />
    </div>
  );
}
