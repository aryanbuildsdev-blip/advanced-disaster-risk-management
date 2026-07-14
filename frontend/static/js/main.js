/* main.js — Next-Gen 3D WebGL Dashboard Logic & Simulations */
let currentDisaster = 'flood';
let confidenceChart = null;

// RECOMMENDATIONS (enhanced warning texts)
const RECOMMENDATIONS = {
  flood: {
    Low:    '✅ Safe conditions. No immediate flood threat. Drainage systems functioning optimally. Keep monitoring local forecasts.',
    Medium: '⚠️ Moderate risk. Drainage capacity saturated. Rivers near critical levels. Avoid basement storage. Secure emergency supplies.',
    High:   '🚨 FLASH FLOOD EMERGENCY! Structural inundation imminent. Evacuate low-lying areas immediately. Do not drive or walk through floodwaters!'
  },
  wildfire: {
    Low:    '✅ Safe parameters. Undergrowth moisture levels high. Open fires permitted with standard safety guidelines.',
    Medium: '⚠️ Moderate combustion index. High dry fuel density. Clear deadwood around buildings. Open fire bans active in forest areas.',
    High:   '🚨 EXTREME FIRE EMERGENCY! Fuel dryness critical. High speed fire fronts spreading. Pack emergency kits. Standby for immediate evacuation order.'
  },
  heatwave: {
    Low:    '✅ Normal thermal zone. Safe relative humidity. Maintain standard hydration during outdoor excursions.',
    Medium: '⚠️ Heat exhaustion warning. Body evaporative cooling efficiency degraded. Limit strenuous outdoor work between 11 AM and 4 PM.',
    High:   '🚨 HEATSTROKE CRITICAL ZONE! Apparent temp exceeding danger threshold. Core metabolic heat dissipation failure. Seek air-conditioned shelter.'
  }
};

const RISK_SUBS = {
  Low:    'Conditions are within normal physiological and meteorological parameters.',
  Medium: 'Heightened hazard parameters. Monitor telemetry logs.',
  High:   'Hazard threshold crossed. Implement active emergency safeguards.'
};

// Dynamic slider badge updates
function updateVal(id, val) {
  document.getElementById(id).textContent = val;
  // Automatically trigger sync calculations when sliders change for a cohesive workflow
  triggerSyncPhysicalMetrics();
}

// ── Open-Meteo API Integration (Live Data Sync) ──────────────────────────
async function detectUserLocation() {
  const statusEl = document.getElementById('weather-sync-status');
  statusEl.innerHTML = '<i class="fa-solid fa-spinner spinning text-info"></i> Querying GPS…';
  
  if (!navigator.geolocation) {
    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> GPS not supported';
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(4);
      const lng = position.coords.longitude.toFixed(4);
      await fetchWeatherData(lat, lng, `GPS Coord (${lat}, ${lng})`);
    },
    (error) => {
      statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> GPS access denied';
    }
  );
}

async function syncWeatherByCity() {
  const cityInput = document.getElementById('weather-city-input').value.trim();
  const statusEl = document.getElementById('weather-sync-status');
  const btn = document.getElementById('city-sync-btn');
  
  if (!cityInput) {
    alert('Please enter a location name.');
    return;
  }
  
  statusEl.innerHTML = '<i class="fa-solid fa-spinner spinning text-info"></i> Locating city…';
  btn.disabled = true;
  
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> Location not found';
      btn.disabled = false;
      return;
    }
    
    const city = geoData.results[0];
    const locationStr = `${city.name}, ${city.admin1 || ''} (${city.country})`;
    await fetchWeatherData(city.latitude, city.longitude, locationStr);
  } catch (err) {
    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i> Connection failed';
  } finally {
    btn.disabled = false;
  }
}

async function fetchWeatherData(lat, lng, locationLabel) {
  const statusEl = document.getElementById('weather-sync-status');
  statusEl.innerHTML = '<i class="fa-solid fa-satellite fa-fade text-info"></i> Querying satellites…';
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&past_days=7&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.current) {
      statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> Satellites returned null';
      return;
    }
    
    const currentTemp = data.current.temperature_2m;
    const currentHum = data.current.relative_humidity_2m;
    const currentWind = data.current.wind_speed_10m;
    const soilMoisture = data.current.soil_moisture_0_to_7cm || 0.25;
    const elevation = data.elevation || 120;
    
    const dailyRain = data.daily.precipitation_sum || [];
    const rainfall7d = dailyRain.reduce((a, b) => a + b, 0).toFixed(1);
    const rainfall24h = (dailyRain[dailyRain.length - 1] || 0).toFixed(1);
    
    const scaledSoilSat = Math.min(100, Math.max(0, ((soilMoisture - 0.05) / 0.4) * 100)).toFixed(1);
    const nightTemp = (data.daily.temperature_2m_min[data.daily.temperature_2m_min.length - 2] || currentTemp - 6).toFixed(1);
    
    let hotDaysCount = 0;
    const maxTemps = data.daily.temperature_2m_max || [];
    for (let i = maxTemps.length - 1; i >= 0; i--) {
      if (maxTemps[i] > 35) hotDaysCount++;
      else break;
    }
    
    updateSliders({
      rainfall_mm: rainfall24h,
      soil_saturation: scaledSoilSat,
      elevation_m: elevation.toFixed(0),
      temperature_c: currentTemp.toFixed(1),
      humidity_pct: currentHum,
      wind_speed_kmh: currentWind.toFixed(1),
      rainfall_mm_7d: rainfall7d,
      consecutive_hot_days: hotDaysCount,
      night_temperature_c: nightTemp
    });
    
    statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Synced: ${lat}, ${lng}`;
    document.getElementById('location-name-badge').textContent = locationLabel;
    
    const badge = document.getElementById('location-name-badge');
    badge.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.7)';
    setTimeout(() => badge.style.boxShadow = 'none', 1000);
    
    // Automatically trigger run prediction on sync
    runPrediction();
    
  } catch (err) {
    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i> Sync failed';
  }
}

function updateSliders(vals) {
  if (vals.rainfall_mm !== undefined) {
    setSlider('rainfall_mm', vals.rainfall_mm);
    setSlider('soil_saturation', vals.soil_saturation);
    setSlider('elevation_m', vals.elevation_m);
    const riverEst = Math.min(12, 1.0 + (vals.rainfall_mm * 0.04) + (vals.soil_saturation * 0.02)).toFixed(1);
    setSlider('river_level_m', riverEst);
  }
  
  if (vals.temperature_c !== undefined) {
    setSlider('temperature_c_wf', vals.temperature_c);
    setSlider('humidity_pct_wf', vals.humidity_pct);
    setSlider('wind_speed_kmh_wf', vals.wind_speed_kmh);
    setSlider('rainfall_mm_7d', vals.rainfall_mm_7d);
    const drynessEst = Math.min(10, Math.max(1, (vals.temperature_c - 15) * 0.15 + (100 - vals.humidity_pct) * 0.07)).toFixed(1);
    setSlider('vegetation_dryness', drynessEst);
  }
  
  if (vals.temperature_c !== undefined) {
    setSlider('temperature_c_hw', vals.temperature_c);
    setSlider('humidity_pct_hw', vals.humidity_pct);
    setSlider('wind_speed_kmh_hw', vals.wind_speed_kmh);
    setSlider('consecutive_hot_days', vals.consecutive_hot_days);
    setSlider('night_temperature_c', vals.night_temperature_c);
  }
}

function setSlider(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.value = val;
    updateVal(id + '_val', val);
  }
}

// ── Tabs controller ────────────────────────────────────────────────────────
function selectDisaster(type) {
  currentDisaster = type;
  ['flood','wildfire','heatwave'].forEach(t => {
    document.getElementById('form-' + t).classList.toggle('d-none', t !== type);
    document.getElementById('tab-' + t).classList.toggle('active', t === type);
  });
  
  document.getElementById('result-placeholder').classList.remove('d-none');
  document.getElementById('result-panel').classList.add('d-none');
  
  init3DScene(type);
}

function getInputs() {
  const v = id => parseFloat(document.getElementById(id).value);
  const loc = document.getElementById('location-name-badge').textContent;
  
  if (currentDisaster === 'flood') return {
    rainfall_mm:      v('rainfall_mm'),
    soil_saturation:  v('soil_saturation'),
    river_level_m:    v('river_level_m'),
    elevation_m:      v('elevation_m'),
    drainage_quality: v('drainage_quality'),
    location_name:    loc
  };
  if (currentDisaster === 'wildfire') return {
    temperature_c:      v('temperature_c_wf'),
    humidity_pct:       v('humidity_pct_wf'),
    wind_speed_kmh:     v('wind_speed_kmh_wf'),
    vegetation_dryness: v('vegetation_dryness'),
    rainfall_mm_7d:     v('rainfall_mm_7d'),
    location_name:    loc
  };
  if (currentDisaster === 'heatwave') return {
    temperature_c:        v('temperature_c_hw'),
    humidity_pct:         v('humidity_pct_hw'),
    wind_speed_kmh:       v('wind_speed_kmh_hw'),
    consecutive_hot_days: v('consecutive_hot_days'),
    night_temperature_c:  v('night_temperature_c'),
    location_name:    loc
  };
}

// Run ML server prediction
async function runPrediction() {
  const btn = document.getElementById('predict-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner spinning me-2"></i> Computing Neural Models…';

  try {
    const inputs = getInputs();
    const res  = await fetch('/api/predict/' + currentDisaster, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    const data = await res.json();
    if (data.error) { alert('Prediction error: ' + data.error); return; }
    
    showResult(data);
    updateStatCard(currentDisaster, data.risk_level);
    if (document.getElementById('recent-tbody')) loadRecentPredictions();
  } catch(e) {
    alert('Server endpoint error. Please check Flask logs.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-microchip me-2"></i> Compute Prediction & Physics Model';
  }
}

// Show neural network result
function showResult(data) {
  document.getElementById('result-placeholder').classList.add('d-none');
  document.getElementById('result-panel').classList.remove('d-none');

  const risk = data.risk_level;
  const typeLabel = currentDisaster.charAt(0).toUpperCase() + currentDisaster.slice(1);

  document.getElementById('result-type').textContent = typeLabel.toUpperCase() + ' RISK';
  const badge = document.getElementById('result-badge');
  badge.textContent = risk.toUpperCase() + ' RISK';
  badge.className = 'risk-badge risk-' + risk.toLowerCase();

  const wrapper = document.querySelector('.risk-badge-wrapper');
  wrapper.className = 'risk-badge-wrapper risk-' + risk.toLowerCase();

  document.getElementById('result-sub').textContent = RISK_SUBS[risk] || '';

  const rec = document.getElementById('recommendation');
  rec.innerHTML = RECOMMENDATIONS[currentDisaster][risk] || '';
  rec.className = 'recommendation rec-' + risk.toLowerCase();

  drawChart(data.confidence);
}

// Render ChartJS Horizontal bar graph
function drawChart(confidence) {
  const ctxChart = document.getElementById('confidenceChart').getContext('2d');
  const labels = ['Low', 'Medium', 'High'];
  const values = labels.map(l => confidence[l] || 0);
  const colors = ['#00ff87', '#ff7b00', '#ff2a5f'];

  if (confidenceChart) confidenceChart.destroy();
  confidenceChart = new Chart(ctxChart, {
    type: 'bar',
    data: {
      labels: labels.map(l => l + ' Risk'),
      datasets: [{
        label: 'Probability %',
        data: values,
        backgroundColor: colors.map(c => c + '22'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { 
          min: 0, max: 100, 
          ticks: { color: '#94a3b8', callback: v => v + '%' }, 
          grid: { color: 'rgba(255,255,255,0.05)' } 
        },
        y: { 
          ticks: { color: '#f1f5f9', font: { weight: 'bold' } }, 
          grid: { display: false } 
        }
      }
    }
  });
}

function updateStatCard(type, risk) {
  const el = document.getElementById('stat-' + type);
  if (!el) return;
  const colors = { Low: '#00ff87', Medium: '#ff7b00', High: '#ff2a5f' };
  el.textContent = risk.toUpperCase();
  el.style.color = colors[risk] || '#94a3b8';
  
  const card = el.closest('.stat-card');
  if (card) {
    card.style.borderColor = (colors[risk] || '#94a3b8') + '44';
  }
}

async function loadRecentPredictions() {
  try {
    const res  = await fetch('/api/history?type=all');
    const data = await res.json();
    if (data.error || !data.predictions) return;

    const ICONS = { flood:'🌊', wildfire:'🔥', heatwave:'☀️' };
    const BADGE = { Low:'badge-risk-low', Medium:'badge-risk-medium', High:'badge-risk-high' };
    const rows  = data.predictions.slice(0, 4);
    const tbody = document.getElementById('recent-tbody');

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-3">No predictions saved in database log.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const dt = new Date(r.created_at + ' UTC');
      const dtStr = isNaN(dt) ? r.created_at :
        dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      return `<tr>
        <td class="text-white">${ICONS[r.disaster_type]||''} <span class="text-capitalize">${r.disaster_type}</span></td>
        <td><span class="badge ${BADGE[r.risk_level]||'bg-secondary'}">${r.risk_level} Risk</span></td>
        <td class="text-white small">${r.location_name||'Manual Input'}</td>
        <td class="text-secondary small font-monospace">${dtStr}</td>
      </tr>`;
    }).join('');
  } catch(e) {}
}

async function loadStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    const stats = data.stats || {};
    ['flood','wildfire','heatwave'].forEach(t => {
      if (stats[t]) updateStatCard(t, stats[t].last_risk);
    });
  } catch(e) {}
}


// ── THREE.JS WebGL 3D SIMULATION CORE (Advanced CDNs) ──────────────────────
let scene, camera, renderer, controls, animationId;
let threeObjects = {};

function init3DScene(type) {
  if (animationId) cancelAnimationFrame(animationId);
  
  const canvasEl = document.getElementById('physicsCanvas');
  if (!canvasEl) return;
  
  const typeBadge = document.getElementById('physics-type-badge');
  threeObjects = {};
  
  try {
    // Initialize WebGL Renderer on existing Canvas
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    
    camera = new THREE.PerspectiveCamera(45, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 100);
    camera.position.set(6, 6, 10);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Lock camera to stay above ground
    controls.minDistance = 3;
    controls.maxDistance = 20;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    
    if (type === 'flood') {
      typeBadge.textContent = "3D Green-Ampt Hydrology Terrain";
      setup3DFlood();
    } else if (type === 'wildfire') {
      typeBadge.textContent = "3D Voxel Forest Combustion Grid";
      setup3DWildfire();
    } else if (type === 'heatwave') {
      typeBadge.textContent = "3D Thermodynamic Sweat Comfort Model";
      setup3DHeatwave();
    }
    
    // WebGL loop
    const animate = () => {
      controls.update();
      render3DActiveEngine(type);
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();
    
  } catch (err) {
    console.error("Three.js Init failed: ", err);
  }
}

/* Resize handling */
window.addEventListener('resize', () => {
  const canvasEl = document.getElementById('physicsCanvas');
  if (!canvasEl || !renderer) return;
  camera.aspect = canvasEl.clientWidth / canvasEl.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false);
});


// ── 1. 3D FLOOD LANDSCAPE SYSTEM ───────────────────────────────────────────
function setup3DFlood() {
  // Create 3D Ground
  const groundGeo = new THREE.BoxGeometry(6, 1.2, 6);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d2723, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.6;
  scene.add(ground);
  
  // displacement mountains (sides)
  const mountain1Geo = new THREE.BoxGeometry(1.2, 2.5, 6);
  const mountain1 = new THREE.Mesh(mountain1Geo, groundMat);
  mountain1.position.set(-2.4, 0, 0);
  scene.add(mountain1);

  const mountain2Geo = new THREE.BoxGeometry(1.2, 2.5, 6);
  const mountain2 = new THREE.Mesh(mountain2Geo, groundMat);
  mountain2.position.set(2.4, 0, 0);
  scene.add(mountain2);

  // Translucent volumetric water box
  const waterGeo = new THREE.BoxGeometry(3.6, 1.0, 5.95);
  const waterMat = new THREE.MeshStandardMaterial({ 
    color: 0x00f0ff, 
    transparent: true, 
    opacity: 0.55, 
    roughness: 0.2 
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, 0, 0);
  scene.add(water);
  threeObjects.water = water;
  
  // Add a 3D house in the middle
  const houseGroup = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.25;
  houseGroup.add(base);
  
  const roofGeo = new THREE.ConeGeometry(0.5, 0.4, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xff2a5f });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 0.7;
  roof.rotation.y = Math.PI / 4;
  houseGroup.add(roof);
  
  houseGroup.position.set(0, 0.3, 0.5);
  scene.add(houseGroup);
  
  // Rain particle vectors
  const rainCount = 120;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount * 3; i += 3) {
    rainPositions[i] = (Math.random() - 0.5) * 5;
    rainPositions[i+1] = Math.random() * 5 + 1;
    rainPositions[i+2] = (Math.random() - 0.5) * 5;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.08, transparent: true, opacity: 0.7 });
  const rainParticles = new THREE.Points(rainGeo, rainMat);
  scene.add(rainParticles);
  threeObjects.rain = rainParticles;
  
  // Infiltration layer
  const infGeo = new THREE.BoxGeometry(5.9, 0.01, 5.9);
  const infMat = new THREE.MeshStandardMaterial({ color: 0x1d0c08 });
  const infLayer = new THREE.Mesh(infGeo, infMat);
  infLayer.position.set(0, 0.01, 0);
  scene.add(infLayer);
  threeObjects.infLayer = infLayer;
}

function render3DActiveEngine(type) {
  if (type === 'flood') {
    // Pull inputs
    const rainfall = parseFloat(document.getElementById('rainfall_mm').value);
    const saturation = parseFloat(document.getElementById('soil_saturation').value);
    const drainage = parseFloat(document.getElementById('drainage_quality').value);
    
    // Green-Ampt Math
    const infiltrationCapacity = (100 - saturation) * 0.05 * (drainage / 10 + 0.5);
    const runCoeff = (0.15 + (saturation / 100) * 0.65 - (drainage / 10) * 0.15);
    const peakRunoff = (runCoeff * (rainfall / 24) * 0.8).toFixed(2);
    
    // Run rain vectors down
    const positions = threeObjects.rain.geometry.attributes.position.array;
    const rainSpeed = 0.05 + (rainfall / 400) * 0.1;
    
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] -= rainSpeed;
      if (positions[i] < 0.1) {
        positions[i] = Math.random() * 5 + 1; // Respawn cloud height
      }
    }
    threeObjects.rain.geometry.attributes.position.needsUpdate = true;
    
    // Scale volumetric water block
    const targetHeight = Math.min(2.5, 0.1 + (rainfall * 0.005) + (saturation * 0.008) - (drainage * 0.04));
    threeObjects.water.scale.y = THREE.MathUtils.lerp(threeObjects.water.scale.y, targetHeight, 0.05);
    threeObjects.water.position.y = (threeObjects.water.scale.y * 1.0) / 2;
    
    // Darken wet soil base
    const infTargetScale = Math.min(20, (rainfall * 0.08));
    threeObjects.infLayer.scale.y = THREE.MathUtils.lerp(threeObjects.infLayer.scale.y, infTargetScale, 0.05);
    threeObjects.infLayer.position.y = - (threeObjects.infLayer.scale.y * 0.01) / 2;
    
    updatePhysicalReadouts(`
      <div class="col-6"><span class="text-secondary small">Runoff Coeff (C):</span> <strong class="text-info font-monospace">${runCoeff.toFixed(2)}</strong></div>
      <div class="col-6"><span class="text-secondary small">Rain Intensity:</span> <strong class="text-info font-monospace">${(rainfall / 24).toFixed(1)} mm/h</strong></div>
      <div class="col-6"><span class="text-secondary small">Peak Runoff (Q):</span> <strong class="text-danger font-monospace">${peakRunoff} m³/s</strong></div>
      <div class="col-6"><span class="text-secondary small">Soil Infiltration Capacity:</span> <strong class="text-success font-monospace">${(infiltrationCapacity * 10).toFixed(1)} mm/h</strong></div>
    `);
  }
  
  if (type === 'wildfire') {
    const temp = parseFloat(document.getElementById('temperature_c_wf').value);
    const hum = parseFloat(document.getElementById('humidity_pct_wf').value);
    const wind = parseFloat(document.getElementById('wind_speed_kmh_wf').value);
    const dryness = parseFloat(document.getElementById('vegetation_dryness').value);
    
    // McArthur FFDI
    const ffdi = Math.min(100, Math.max(1, 1.25 * dryness * Math.exp((0.0338 * temp - 0.045 * hum + 0.0234 * wind)))).toFixed(0);
    const ros = (0.015 * ffdi * (1 + wind * 0.04)).toFixed(1);
    const flameHeight = (0.5 * Math.pow(ros, 0.46) * (dryness / 5)).toFixed(1);
    const fireIntensity = (300 * Math.pow(flameHeight, 2)).toFixed(0);
    
    // Propagate fire grid cell colors
    const baseIgnite = 0.005 + (dryness / 10) * 0.04 - (hum / 100) * 0.03;
    const windEffect = wind * 0.02;
    
    // Update CA logic on tree meshes
    const cols = 8;
    const rows = 8;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tree = threeObjects.grid[`${r}_${c}`];
        if (!tree) continue;
        
        if (tree.state === 2) { // Burning
          if (Math.random() < 0.008) {
            tree.state = 3; // Burnt stump
            tree.mesh.children[0].material.color.setHex(0x334155); // Gray ash color
            tree.mesh.children[0].scale.set(0.4, 0.4, 0.4); // collapse
          }
          
          // Animate fire scaling (flicker)
          const scaleVal = 0.9 + Math.sin(Date.now() * 0.02 + r + c) * 0.2;
          tree.mesh.children[1].scale.set(scaleVal, scaleVal, scaleVal);
          
          // Spark chances to neighbors
          const offsetNeighbors = [[-1,0],[1,0],[0,-1],[0,1]];
          offsetNeighbors.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            const neighborTree = threeObjects.grid[`${nr}_${nc}`];
            if (neighborTree && neighborTree.state === 1) {
              const prob = baseIgnite * (dc > 0 ? (1.0 + windEffect) : 0.8);
              if (Math.random() < prob) {
                neighborTree.state = 2; // Catch fire
                neighborTree.mesh.children[1].visible = true; // Show fire cone overlay
                neighborTree.mesh.children[0].material.color.setHex(0xff7b00); // Emissive foliage
              }
            }
          });
        }
      }
    }
    
    updatePhysicalReadouts(`
      <div class="col-6"><span class="text-secondary small">Danger Index (FFDI):</span> <strong class="text-danger font-monospace">${ffdi}</strong></div>
      <div class="col-6"><span class="text-secondary small">Spread Speed (ROS):</span> <strong class="text-warning font-monospace">${ros} m/min</strong></div>
      <div class="col-6"><span class="text-secondary small">Flame Height:</span> <strong class="text-warning font-monospace">${flameHeight} m</strong></div>
      <div class="col-6"><span class="text-secondary small">Fireline Intensity:</span> <strong class="text-danger font-monospace">${fireIntensity} kW/m</strong></div>
    `);
  }
  
  if (type === 'heatwave') {
    const temp = parseFloat(document.getElementById('temperature_c_hw').value);
    const hum = parseFloat(document.getElementById('humidity_pct_hw').value);
    const wind = parseFloat(document.getElementById('wind_speed_kmh_hw').value);
    
    // Thermodynamic equations
    const expTerm = (17.27 * temp) / (237.7 + temp);
    const vapPressure = (hum / 100) * 6.105 * Math.exp(expTerm);
    const apparentTemp = (temp + 0.33 * vapPressure - 0.70 * (wind / 3.6) - 4.0).toFixed(1);
    
    const evapEfficiency = Math.max(5, 100 - hum * 0.85);
    const wbgt = (0.567 * temp + 0.393 * vapPressure + 3.94).toFixed(1);
    const coolingRate = ((evapEfficiency / 100) * 350 * (1 + wind * 0.02)).toFixed(0);
    
    // Shift color of mannequin base
    const lerpColor = new THREE.Color();
    if (apparentTemp > 42) {
      lerpColor.setHex(0xff2a5f); // Crimson hot
    } else if (apparentTemp > 34) {
      lerpColor.setHex(0xff7b00); // Orange heat
    } else {
      lerpColor.setHex(0x00ff87); // Safe green-blue
    }
    
    threeObjects.mannequin.children.forEach(mesh => {
      mesh.material.color.lerp(lerpColor, 0.05);
    });
    
    // Float sweat particles in 3D
    const sweatParticles = threeObjects.sweat.geometry.attributes.position.array;
    const sweatSpeed = 0.02 * (evapEfficiency / 100);
    
    for (let i = 1; i < sweatParticles.length; i += 3) {
      sweatParticles[i] += sweatSpeed;
      if (sweatParticles[i] > 2.0) {
        sweatParticles[i] = -0.5 + Math.random() * 0.5; // Reset near torso height
      }
    }
    threeObjects.sweat.geometry.attributes.position.needsUpdate = true;
    
    updatePhysicalReadouts(`
      <div class="col-6"><span class="text-secondary small">Apparent Temp (AT):</span> <strong class="text-danger font-monospace">${apparentTemp} °C</strong></div>
      <div class="col-6"><span class="text-secondary small">Wet Bulb (WBGT):</span> <strong class="text-warning font-monospace">${wbgt} °C</strong></div>
      <div class="col-6"><span class="text-secondary small">Sweat Efficiency:</span> <strong class="text-info font-monospace">${evapEfficiency.toFixed(0)}%</strong></div>
      <div class="col-6"><span class="text-secondary small">Latent Heat Loss:</span> <strong class="text-success font-monospace">${coolingRate} Watts</strong></div>
    `);
  }
}

// ── 2. 3D WILDFIRE CA VOXEL FOREST SYSTEM ──────────────────────────────────
function setup3DWildfire() {
  const cols = 8;
  const rows = 8;
  threeObjects.grid = {};
  
  // Forest ground plane
  const forestGroundGeo = new THREE.BoxGeometry(6.2, 0.2, 6.2);
  const forestGroundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const ground = new THREE.Mesh(forestGroundGeo, forestGroundMat);
  ground.position.y = -0.1;
  scene.add(ground);
  
  const startX = -2.4;
  const startZ = -2.4;
  const spacing = 0.7;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const treeGroup = new THREE.Group();
      
      // trunk
      const trunkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2723 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.15;
      treeGroup.add(trunk);
      
      // leaves (conical)
      const leavesGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x00ff87, roughness: 0.8 });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 0.5;
      treeGroup.add(leaves);
      
      // fire mesh overlay (invisible initially)
      const fireGeo = new THREE.ConeGeometry(0.25, 0.6, 4);
      const fireMat = new THREE.MeshStandardMaterial({ 
        color: 0xff7b00, 
        emissive: 0xff3300, 
        transparent: true, 
        opacity: 0.85 
      });
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.y = 0.5;
      fire.visible = false;
      treeGroup.add(fire);
      
      // Position on forest grid
      treeGroup.position.set(startX + c * spacing, 0, startZ + r * spacing);
      scene.add(treeGroup);
      
      // CA State: 1=healthy green, 2=burning, 3=charcoal ash
      threeObjects.grid[`${r}_${c}`] = {
        mesh: treeGroup,
        state: 1
      };
    }
  }
  
  // Ignite center tree to start CA chain
  threeObjects.grid[`3_3`].state = 2;
  threeObjects.grid[`3_3`].mesh.children[2].visible = true;
  threeObjects.grid[`3_3`].mesh.children[1].material.color.setHex(0xff7b00);
  
  // Auto restart if forest burns down
  canvas.onclick = (e) => {
    // Click on 3D forest ignites random trees
    const randomR = Math.floor(Math.random() * rows);
    const randomC = Math.floor(Math.random() * cols);
    const selectedTree = threeObjects.grid[`${randomR}_${randomC}`];
    if (selectedTree && selectedTree.state === 1) {
      selectedTree.state = 2;
      selectedTree.mesh.children[2].visible = true;
    }
  };
}


// ── 3. 3D THERMODYNAMIC MANNEQUIN SYSTEM ──────────────────────────────────
function setup3DHeatwave() {
  const mannequinGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ff87, roughness: 0.4 });
  
  // Head
  const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 1.35;
  mannequinGroup.add(head);
  
  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.25, 0.18, 0.8, 12);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 0.75;
  mannequinGroup.add(torso);
  
  // Limbs (Arms & Legs)
  const limbGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.6, 8);
  
  const leftArm = new THREE.Mesh(limbGeo, mat);
  leftArm.position.set(-0.35, 0.75, 0);
  leftArm.rotation.z = Math.PI / 8;
  mannequinGroup.add(leftArm);

  const rightArm = new THREE.Mesh(limbGeo, mat);
  rightArm.position.set(0.35, 0.75, 0);
  rightArm.rotation.z = -Math.PI / 8;
  mannequinGroup.add(rightArm);
  
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8);
  
  const leftLeg = new THREE.Mesh(legGeo, mat);
  leftLeg.position.set(-0.12, 0.1, 0);
  mannequinGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, mat);
  rightLeg.position.set(0.12, 0.1, 0);
  mannequinGroup.add(rightLeg);
  
  mannequinGroup.position.set(0, -0.6, 0);
  scene.add(mannequinGroup);
  threeObjects.mannequin = mannequinGroup;
  
  // 3D Sun solar ray cylinders
  const raysGroup = new THREE.Group();
  const rayGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.0);
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.25 });
  
  for (let i = 0; i < 6; i++) {
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3);
    ray.rotation.x = Math.PI / 6;
    raysGroup.add(ray);
  }
  scene.add(raysGroup);
  
  // 3D sweat evaporation particles
  const sweatCount = 40;
  const sweatGeo = new THREE.BufferGeometry();
  const sweatPos = new Float32Array(sweatCount * 3);
  for (let i = 0; i < sweatCount * 3; i += 3) {
    sweatPos[i] = (Math.random() - 0.5) * 0.6;
    sweatPos[i+1] = -0.5 + Math.random() * 2.0; // height distribution
    sweatPos[i+2] = (Math.random() - 0.5) * 0.6;
  }
  sweatGeo.setAttribute('position', new THREE.BufferAttribute(sweatPos, 3));
  const sweatMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.08, transparent: true, opacity: 0.8 });
  const sweatParticles = new THREE.Points(sweatGeo, sweatMat);
  scene.add(sweatParticles);
  threeObjects.sweat = sweatParticles;
}


// ── Utilities ──────────────────────────────────────────────────────────────
function updatePhysicalReadouts(html) {
  const readout = document.getElementById('physics-readouts');
  if (readout) readout.innerHTML = html;
}

// Automatically sync the readouts for the selected tab
function triggerSyncPhysicalMetrics() {
  if (renderer && scene && camera) {
    render3DActiveEngine(currentDisaster);
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  if (document.getElementById('recent-tbody')) loadRecentPredictions();
  
  // Initialize default 3D canvas
  init3DScene('flood');
});
