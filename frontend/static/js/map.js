/* map.js — Redesigned Interactive Dark Map & Click-to-Predict Coordinate Engine */

const CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 }
];

const RISK_COLORS = { Low: '#00ff87', Medium: '#ff7b00', High: '#ff2a5f' };

function circleStyle(risk) {
  return {
    radius: 12,
    fillColor: RISK_COLORS[risk] || '#64748b',
    color: '#060913',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.85
  };
}

let map = null;
let markers = [];
let customMarker = null;
let weatherCache = {}; // Cache to prevent duplicate weather API hits

/* ── Translate Open-Meteo response to ML Features ────────────────── */
function parseWeatherData(data) {
  const currentTemp = data.current.temperature_2m;
  const currentHum = data.current.relative_humidity_2m;
  const currentWind = data.current.wind_speed_10m;
  const soilMoisture = data.current.soil_moisture_0_to_7cm || 0.25;
  const elevation = data.elevation || 100;
  
  const dailyRain = data.daily.precipitation_sum || [];
  const rainfall7d = dailyRain.reduce((a, b) => a + b, 0);
  const rainfall24h = dailyRain[dailyRain.length - 1] || 0;
  
  const scaledSoilSat = Math.min(100, Math.max(0, ((soilMoisture - 0.05) / 0.4) * 100));
  const nightTemp = dailyRain.length >= 2 ? (data.daily.temperature_2m_min[data.daily.temperature_2m_min.length - 2] || currentTemp - 5) : currentTemp - 5;
  
  let hotDaysCount = 0;
  const maxTemps = data.daily.temperature_2m_max || [];
  for (let i = maxTemps.length - 1; i >= 0; i--) {
    if (maxTemps[i] > 35) hotDaysCount++;
    else break;
  }
  
  // Custom estimations for unmeasured variables
  const riverEst = Math.min(12, 1.0 + (rainfall24h * 0.05) + (scaledSoilSat * 0.02));
  const drynessEst = Math.min(10, Math.max(1, (currentTemp - 15) * 0.15 + (100 - currentHum) * 0.07));
  
  return {
    flood: {
      rainfall_mm: parseFloat(rainfall24h.toFixed(1)),
      soil_saturation: parseFloat(scaledSoilSat.toFixed(1)),
      river_level_m: parseFloat(riverEst.toFixed(1)),
      elevation_m: parseFloat(elevation.toFixed(0)),
      drainage_quality: 5
    },
    wildfire: {
      temperature_c: parseFloat(currentTemp.toFixed(1)),
      humidity_pct: parseFloat(currentHum.toFixed(0)),
      wind_speed_kmh: parseFloat(currentWind.toFixed(1)),
      vegetation_dryness: parseFloat(drynessEst.toFixed(1)),
      rainfall_mm_7d: parseFloat(rainfall7d.toFixed(1))
    },
    heatwave: {
      temperature_c: parseFloat(currentTemp.toFixed(1)),
      humidity_pct: parseFloat(currentHum.toFixed(0)),
      wind_speed_kmh: parseFloat(currentWind.toFixed(1)),
      consecutive_hot_days: hotDaysCount,
      night_temperature_c: parseFloat(parseFloat(nightTemp).toFixed(1))
    }
  };
}

/* ── Fetch weather for coordinates ──────────────────────────────── */
async function getCoordinateFeatures(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&past_days=7&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  return parseWeatherData(data);
}

/* ── Initialize Map (Dark theme CartoDB) ────────────────────────── */
function initMap() {
  // Center map on India
  map = L.map('map', { center: [22.5, 78.5], zoom: 5 });

  // Sleek Dark Matter tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://openstreetmap.org">OSM</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Map click handler (Drop pin anywhere on Earth)
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    const type = document.getElementById('map-disaster-type').value;
    
    // Remove old pin
    if (customMarker) map.removeLayer(customMarker);
    
    // Drop custom pulsing marker
    customMarker = L.marker([lat, lng]).addTo(map);
    customMarker.bindPopup(`
      <div style="text-align:center; padding:10px;">
        <i class="fa-solid fa-satellite fa-spin text-info" style="font-size:1.5rem;"></i><br/>
        <span class="small text-muted" style="display:block; margin-top:5px;">Connecting to telemetry...</span>
      </div>
    `).openPopup();
    
    try {
      const weatherData = await getCoordinateFeatures(lat, lng);
      const features = weatherData[type];
      
      const res = await fetch('/api/predict/' + type, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...features, location_name: `Point [${lat.toFixed(3)}, ${lng.toFixed(3)}]` })
      });
      const data = await res.json();
      
      const risk = data.risk_level || 'Unknown';
      const conf = data.confidence || {};
      const confText = Object.entries(conf)
        .sort((a,b) => b[1] - a[1])
        .map(([k, v]) => `<span style="color:${RISK_COLORS[k]} font-weight:bold">${k}: ${v}%</span>`)
        .join(' &nbsp;·&nbsp; ');

      const disasterEmoji = { flood:'🌊', wildfire:'🔥', heatwave:'☀️' }[type] || '⚠️';

      const popupHTML = `
        <div class="city-popup" style="color:#fff; min-width:180px;">
          <h6 style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-bottom:5px;">
            ${disasterEmoji} Custom Location
          </h6>
          <span class="badge" style="background:${RISK_COLORS[risk]}; color:#000; font-weight:800; font-size:0.75rem; margin-bottom:8px;">
            ${risk.toUpperCase()} RISK
          </span>
          <div style="font-size:0.72rem; line-height:1.4; color:#94a3b8;">
            Lat: ${lat.toFixed(4)} · Lng: ${lng.toFixed(4)}<br/>
            Temp: ${features.temperature_c || features.rainfall_mm || 0} unit
          </div>
          <div style="font-size:0.75rem; margin-top:8px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
            ${confText}
          </div>
        </div>`;
      
      customMarker.setPopupContent(popupHTML);
      
    } catch(err) {
      customMarker.setPopupContent("⚠️ Failed to parse coordinates.");
    }
  });

  // Legend Control
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = `
      <strong style="display:block;margin-bottom:6px;font-size:0.78rem;letter-spacing:0.5px">RISK TELEMETRY</strong>
      <div class="legend-item"><div class="legend-dot" style="background:${RISK_COLORS.Low}"></div> Low Risk</div>
      <div class="legend-item"><div class="legend-dot" style="background:${RISK_COLORS.Medium}"></div> Medium Risk</div>
      <div class="legend-item"><div class="legend-dot" style="background:${RISK_COLORS.High}"></div> High Risk</div>`;
    return div;
  };
  legend.addTo(map);
}

/* ── Main Map Update Function ────────────────────────────────────── */
async function updateMap() {
  const type    = document.getElementById('map-disaster-type').value;
  const overlay = document.getElementById('loading-overlay');
  const status  = document.getElementById('map-status');

  overlay.style.display = 'flex';
  status.innerHTML      = '<i class="fa-solid fa-spinner spinning text-info me-2"></i>Loading live coordinates...';

  // Clear previous markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  // Query cities in parallel if not already cached
  const citiesToFetch = CITIES.filter(c => !weatherCache[c.name]);
  
  if (citiesToFetch.length > 0) {
    status.innerHTML = `<i class="fa-solid fa-satellite fa-fade text-info me-2"></i>Fetching Open-Meteo for ${citiesToFetch.length} stations...`;
    
    // Fetch coordinates parallelly
    await Promise.all(
      citiesToFetch.map(city => 
        getCoordinateFeatures(city.lat, city.lng)
          .then(data => {
            weatherCache[city.name] = data;
          })
          .catch(() => {
            console.warn("Could not fetch coordinates for: " + city.name);
          })
      )
    );
  }

  status.innerHTML = '<i class="fa-solid fa-brain fa-fade text-info me-2"></i>Running classification models...';

  // Compute predictions
  const results = await Promise.all(
    CITIES.map(async city => {
      const weather = weatherCache[city.name];
      if (!weather) return { city, risk: 'Unknown', confidence: {} };
      
      const features = weather[type];
      try {
        const res = await fetch('/api/predict/' + type, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...features, location_name: city.name })
        });
        const data = await res.json();
        return { city, risk: data.risk_level, confidence: data.confidence, features };
      } catch(e) {
        return { city, risk: 'Unknown', confidence: {} };
      }
    })
  );

  // Render glowing markers on map
  results.forEach(({ city, risk, confidence, features }) => {
    const conf = confidence || {};
    const confText = Object.entries(conf)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span style="color:${RISK_COLORS[k]}">${k}: ${v}%</span>`)
      .join(' &nbsp;·&nbsp; ');

    const disasterEmoji = { flood:'🌊', wildfire:'🔥', heatwave:'☀️' }[type] || '⚠️';

    const popupHTML = `
      <div class="city-popup" style="color:#fff;">
        <h6>${disasterEmoji} ${city.name} <small style="color:#94a3b8">${city.state || ''}</small></h6>
        <div style="margin:6px 0">
          <span class="badge" style="background:${RISK_COLORS[risk]}; color:#000; font-weight:800; font-size:0.75rem;">
            ${risk.toUpperCase()} RISK
          </span>
        </div>
        <div style="font-size:0.75rem; margin-top:6px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
          ${confText}
        </div>
      </div>`;

    const marker = L.circleMarker([city.lat, city.lng], circleStyle(risk))
      .addTo(map)
      .bindPopup(popupHTML);

    // Dynamic Small text labels underneath circles
    const label = L.divIcon({
      className: '',
      html: `<div style="
        background: rgba(13, 17, 33, 0.8);
        border: 1px solid var(--border-color);
        color: #f1f5f9; font-size: 8px; font-weight: 700;
        padding: 1px 4px; border-radius: 4px;
        white-space: nowrap; margin-top: 14px; margin-left: -12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4)">${city.name}</div>`,
      iconAnchor: [0, 0]
    });
    L.marker([city.lat, city.lng], { icon: label, interactive: false }).addTo(map);
    markers.push(marker);
  });

  overlay.style.display = 'none';
  const counts = { Low: 0, Medium: 0, High: 0 };
  results.forEach(r => { if (counts[r.risk] !== undefined) counts[r.risk]++; });
  status.innerHTML =
    `<i class="fa-solid fa-satellite-dish text-success me-1"></i> Telemetry active: ` +
    `<span style="color:${RISK_COLORS.Low}">Low: ${counts.Low}</span> &nbsp;` +
    `<span style="color:${RISK_COLORS.Medium}">Medium: ${counts.Medium}</span> &nbsp;` +
    `<span style="color:${RISK_COLORS.High}">High: ${counts.High}</span>`;
}

/* ── Initial Boot ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  updateMap();
});
