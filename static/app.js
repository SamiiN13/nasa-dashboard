// ── Starfield + Shooting Stars ─────────────────────────
const canvas = document.getElementById('starfield');
const ctx2 = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const stars = Array.from({ length: 280 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.3,
    alpha: Math.random(),
    speed: (Math.random() * 0.003) + 0.001
}));

const shootingStars = [];
function spawnShootingStar() {
    shootingStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        len: Math.random() * 120 + 60,
        speed: Math.random() * 8 + 6,
        alpha: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3
    });
    setTimeout(spawnShootingStar, Math.random() * 7000 + 3000);
}
spawnShootingStar();

function drawStars() {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.alpha))})`;
        ctx2.fill();
    });
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const grad = ctx2.createLinearGradient(
            s.x, s.y,
            s.x - Math.cos(s.angle) * s.len,
            s.y - Math.sin(s.angle) * s.len
        );
        grad.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx2.beginPath();
        ctx2.moveTo(s.x, s.y);
        ctx2.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
        ctx2.strokeStyle = grad;
        ctx2.lineWidth = 1.5;
        ctx2.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.018;
        if (s.alpha <= 0) shootingStars.splice(i, 1);
    }
    requestAnimationFrame(drawStars);
}
drawStars();

// ── Sound ──────────────────────────────────────────────
const soundBtn = document.getElementById('sound-toggle');
const ambient = document.getElementById('ambient-sound');
let soundOn = false;

soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn) {
        ambient.volume = 0.3;
        ambient.play().catch(() => {});
        soundBtn.classList.add('playing');
        soundBtn.textContent = '♫';
    } else {
        ambient.pause();
        soundBtn.classList.remove('playing');
        soundBtn.textContent = '♪';
    }
});

// ── Nav Tabs ───────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
});

// ── Helpers ────────────────────────────────────────────
function sizeDescription(m) {
    if (m < 10)  return "smaller than a car";
    if (m < 25)  return "about the size of a house";
    if (m < 80)  return "about the size of a city block";
    if (m < 200) return "roughly the size of a stadium";
    if (m < 500) return "taller than the Eiffel Tower";
    if (m < 900) return "larger than the Burj Khalifa";
    return "the size of a small mountain";
}

function cardProse(ast) {
    const m = Math.round(ast.estimated_diameter.meters.estimated_diameter_max);
    const lunar = parseFloat(ast.close_approach_data[0].miss_distance.lunar).toFixed(1);
    const spd = Math.round(parseFloat(ast.close_approach_data[0].relative_velocity.kilometers_per_hour)).toLocaleString();
    const cap = sizeDescription(m);
    const c = cap.charAt(0).toUpperCase() + cap.slice(1);
    if (ast.is_potentially_hazardous_asteroid) {
        return `${c}, moving at ${spd} km/h. It passed within ${lunar} lunar distances — close enough to be on NASA's watch list.`;
    }
    return `${c}, traveling at ${spd} km/h. It passed at ${lunar} lunar distances without incident.`;
}

function proximityPct(km) {
    return Math.max(5, Math.min(92, 100 - (km / (384400 * 2.5)) * 100));
}

function formatNum(n) { return Math.round(n).toLocaleString(); }

function countUp(el, target, duration = 1400) {
    const start = performance.now();
    const update = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = formatNum(Math.floor(ease * target));
        if (p < 1) requestAnimationFrame(update);
        else el.textContent = formatNum(target);
    };
    requestAnimationFrame(update);
}

// ── Solar System ───────────────────────────────────────
const solarCanvas = document.getElementById('solar-canvas');
const sc = solarCanvas.getContext('2d');
let simTime = Date.now();
let hoveredAsteroid = null;
let asteroidPositions = [];
let solarRunning = false;

function resizeSolar() {
    const size = solarCanvas.parentElement.clientWidth - 48;
    solarCanvas.width = size;
    solarCanvas.height = size;
}

function drawSolarFrame(asteroids, cvs, context, wide) {
    const w = cvs.width;
    const h = cvs.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * (wide ? 0.42 : 0.4);
    const t = simTime / 1000;

    context.clearRect(0, 0, w, h);

    // Sun glow layers
    [
        { r: scale * 0.18, color: [255, 200, 80], alpha: 0.06 },
        { r: scale * 0.10, color: [255, 220, 120], alpha: 0.12 },
        { r: scale * 0.055, color: [255, 240, 160], alpha: 0.25 },
    ].forEach(g => {
        const grd = context.createRadialGradient(cx, cy, 0, cx, cy, g.r);
        grd.addColorStop(0, `rgba(${g.color.join(',')},${g.alpha})`);
        grd.addColorStop(1, 'rgba(255,150,0,0)');
        context.beginPath();
        context.arc(cx, cy, g.r, 0, Math.PI * 2);
        context.fillStyle = grd;
        context.fill();
    });

    // Sun core
    const sunCore = context.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.032);
    sunCore.addColorStop(0, '#fffde0');
    sunCore.addColorStop(0.4, '#ffe080');
    sunCore.addColorStop(1, '#ff9900');
    context.beginPath();
    context.arc(cx, cy, scale * 0.032, 0, Math.PI * 2);
    context.fillStyle = sunCore;
    context.fill();

    // Earth orbit ring
    const earthR = scale * 0.58;
    context.beginPath();
    context.arc(cx, cy, earthR, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(99,179,237,0.07)';
    context.lineWidth = 1;
    context.stroke();

    // Earth
    const ea = (t / 365.25) * Math.PI * 2;
    const ex = cx + Math.cos(ea) * earthR;
    const ey = cy + Math.sin(ea) * earthR;

    const eg = context.createRadialGradient(ex, ey, 0, ex, ey, scale * 0.03);
    eg.addColorStop(0, 'rgba(99,179,237,0.5)');
    eg.addColorStop(1, 'rgba(99,179,237,0)');
    context.beginPath();
    context.arc(ex, ey, scale * 0.03, 0, Math.PI * 2);
    context.fillStyle = eg;
    context.fill();

    context.beginPath();
    context.arc(ex, ey, scale * 0.013, 0, Math.PI * 2);
    context.fillStyle = '#4a90d9';
    context.fill();

    context.fillStyle = 'rgba(99,179,237,0.55)';
    context.font = `${Math.max(9, w * 0.018)}px Inter`;
    context.fillText('Earth', ex + scale * 0.018, ey - scale * 0.018);

    // Asteroids with trails
    const positions = [];
    asteroids.forEach((ast, i) => {
        const seed = parseInt(ast.id) % 1000 / 1000;
        const orbitR = earthR * (0.55 + seed * 0.7);
        const speed = 0.4 + seed * 1.8;
        const offset = seed * Math.PI * 2;
        const angle = offset + (t / (365.25 / speed)) * Math.PI * 2;

        // Trail
        const trailSteps = 18;
        for (let j = trailSteps; j >= 1; j--) {
            const ta = offset + ((t - j * 1.2) / (365.25 / speed)) * Math.PI * 2;
            const tx = cx + Math.cos(ta) * orbitR;
            const ty = cy + Math.sin(ta) * orbitR;
            const alpha = (1 - j / trailSteps) * 0.25;
            context.beginPath();
            context.arc(tx, ty, scale * 0.004, 0, Math.PI * 2);
            context.fillStyle = ast.is_potentially_hazardous_asteroid
                ? `rgba(252,129,129,${alpha})`
                : `rgba(180,210,255,${alpha})`;
            context.fill();
        }

        // Orbit ring
        context.beginPath();
        context.arc(cx, cy, orbitR, 0, Math.PI * 2);
        context.strokeStyle = ast.is_potentially_hazardous_asteroid
            ? 'rgba(252,129,129,0.06)'
            : 'rgba(255,255,255,0.03)';
        context.lineWidth = 0.5;
        context.stroke();

        const ax = cx + Math.cos(angle) * orbitR;
        const ay = cy + Math.sin(angle) * orbitR;
        const r = scale * 0.009;
        const hz = ast.is_potentially_hazardous_asteroid;
        const isHovered = hoveredAsteroid === i && cvs === solarCanvas;

        positions.push({ x: ax, y: ay, r: r * 3, ast, i });

        // Glow for hazardous
        if (hz) {
            const hg = context.createRadialGradient(ax, ay, 0, ax, ay, r * 4);
            hg.addColorStop(0, 'rgba(252,129,129,0.6)');
            hg.addColorStop(1, 'rgba(252,129,129,0)');
            context.beginPath();
            context.arc(ax, ay, r * 4, 0, Math.PI * 2);
            context.fillStyle = hg;
            context.fill();
        }

        context.beginPath();
        context.arc(ax, ay, isHovered ? r * 1.6 : r, 0, Math.PI * 2);
        context.fillStyle = hz
            ? `rgba(252,129,129,${isHovered ? 1 : 0.85})`
            : `rgba(200,220,255,${isHovered ? 1 : 0.55})`;
        context.fill();

        if (isHovered) {
            context.fillStyle = hz ? '#fc8181' : '#90cdf4';
            context.font = `${Math.max(9, w * 0.016)}px Inter`;
            context.fillText(ast.name, ax + r * 2.5, ay - r * 2);
        }
    });

    if (cvs === solarCanvas) asteroidPositions = positions;
}

function solarLoop(asteroids) {
    simTime += 16 * 50;
    resizeSolar();
    drawSolarFrame(asteroids, solarCanvas, sc, false);

    if (miniSolarOpen) {
        const mc = document.getElementById('mini-solar-canvas');
        const mctx = mc.getContext('2d');
        mc.width = mc.parentElement.clientWidth;
        mc.height = mc.parentElement.clientWidth * 0.5;
        drawSolarFrame(asteroids, mc, mctx, true);
    }

    requestAnimationFrame(() => solarLoop(asteroids));
}

solarCanvas.addEventListener('mousemove', (e) => {
    const rect = solarCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (solarCanvas.width / rect.width);
    const my = (e.clientY - rect.top) * (solarCanvas.height / rect.height);
    hoveredAsteroid = null;
    for (const p of asteroidPositions) {
        const dx = mx - p.x;
        const dy = my - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.r * 3) {
            hoveredAsteroid = p.i;
            break;
        }
    }
    solarCanvas.style.cursor = hoveredAsteroid !== null ? 'pointer' : 'crosshair';
});

solarCanvas.addEventListener('click', () => {
    if (hoveredAsteroid !== null) {
        document.querySelector('[data-tab="asteroids"]').click();
        setTimeout(() => {
            const cards = document.querySelectorAll('.asteroid-card');
            if (cards[hoveredAsteroid]) {
                cards[hoveredAsteroid].scrollIntoView({ behavior: 'smooth', block: 'center' });
                cards[hoveredAsteroid].style.borderColor = '#63b3ed';
                setTimeout(() => cards[hoveredAsteroid].style.borderColor = '', 2000);
            }
        }, 300);
    }
});

// ── Mini Solar Toggle ──────────────────────────────────
let miniSolarOpen = false;
document.getElementById('mini-solar-toggle').addEventListener('click', () => {
    miniSolarOpen = !miniSolarOpen;
    document.getElementById('mini-solar-wrap').style.display = miniSolarOpen ? 'block' : 'none';
    document.getElementById('mini-solar-toggle').classList.toggle('active', miniSolarOpen);
});

// ── ISS Globe ──────────────────────────────────────────
const globeCanvas = document.getElementById('globe-canvas');
const gc = globeCanvas.getContext('2d');
let issLat = 0, issLng = 0;
const issTrack = [];

function resizeGlobe() {
    const size = globeCanvas.parentElement.clientWidth - 48;
    globeCanvas.width = size;
    globeCanvas.height = size;
}

function drawGlobe() {
    resizeGlobe();
    const w = globeCanvas.width;
    const h = globeCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = w * 0.44;

    gc.clearRect(0, 0, w, h);

    // Space glow behind globe
    const spaceGlow = gc.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.3);
    spaceGlow.addColorStop(0, 'rgba(30,60,120,0.15)');
    spaceGlow.addColorStop(1, 'rgba(0,0,0,0)');
    gc.beginPath();
    gc.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
    gc.fillStyle = spaceGlow;
    gc.fill();

    // Earth base
    const earthGrad = gc.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
    earthGrad.addColorStop(0, '#1a3a5c');
    earthGrad.addColorStop(0.4, '#0f2540');
    earthGrad.addColorStop(0.8, '#071628');
    earthGrad.addColorStop(1, '#030d1a');
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.fillStyle = earthGrad;
    gc.fill();

    // Continent-like shapes (simplified)
    gc.save();
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.clip();

    const continents = [
        { x: 0.38, y: 0.3, w: 0.12, h: 0.18 },
        { x: 0.42, y: 0.52, w: 0.08, h: 0.14 },
        { x: 0.54, y: 0.28, w: 0.18, h: 0.22 },
        { x: 0.6, y: 0.52, w: 0.14, h: 0.16 },
        { x: 0.72, y: 0.3, w: 0.1, h: 0.12 },
        { x: 0.18, y: 0.35, w: 0.09, h: 0.1 },
        { x: 0.78, y: 0.45, w: 0.12, h: 0.1 },
    ];

    continents.forEach(c => {
        gc.beginPath();
        gc.ellipse(
            cx - R + c.x * R * 2,
            cy - R + c.y * R * 2,
            c.w * R, c.h * R, 0, 0, Math.PI * 2
        );
        gc.fillStyle = 'rgba(34,85,60,0.55)';
        gc.fill();
    });

    // Atmosphere rim
    const atmo = gc.createRadialGradient(cx, cy, R * 0.88, cx, cy, R);
    atmo.addColorStop(0, 'rgba(99,179,237,0)');
    atmo.addColorStop(0.6, 'rgba(99,179,237,0.08)');
    atmo.addColorStop(1, 'rgba(99,179,237,0.25)');
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.fillStyle = atmo;
    gc.fill();

    gc.restore();

    // Globe border
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.strokeStyle = 'rgba(99,179,237,0.2)';
    gc.lineWidth = 1;
    gc.stroke();

    // Grid lines
    gc.save();
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.clip();
    gc.strokeStyle = 'rgba(99,179,237,0.06)';
    gc.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
        const y = cy + (lat / 90) * R;
        const hw = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
        gc.beginPath();
        gc.moveTo(cx - hw, y);
        gc.lineTo(cx + hw, y);
        gc.stroke();
    }
    for (let lng = 0; lng < 360; lng += 45) {
        const angle = (lng / 180) * Math.PI;
        gc.beginPath();
        gc.moveTo(cx + Math.cos(angle) * R * 0.01, cy - R);
        gc.bezierCurveTo(
            cx + Math.cos(angle) * R, cy - R * 0.5,
            cx + Math.cos(angle) * R, cy + R * 0.5,
            cx + Math.cos(angle) * R * 0.01, cy + R
        );
        gc.stroke();
    }
    gc.restore();

    // ISS track
    if (issTrack.length > 1) {
        gc.save();
        gc.beginPath();
        gc.arc(cx, cy, R, 0, Math.PI * 2);
        gc.clip();
        gc.beginPath();
        issTrack.forEach((pt, i) => {
            const px = cx + (pt.lng / 180) * R;
            const py = cy - (pt.lat / 90) * R;
            if (i === 0) gc.moveTo(px, py);
            else gc.lineTo(px, py);
        });
        gc.strokeStyle = 'rgba(252,129,129,0.3)';
        gc.lineWidth = 1;
        gc.setLineDash([3, 4]);
        gc.stroke();
        gc.setLineDash([]);
        gc.restore();
    }

    // ISS position
    const issX = cx + (issLng / 180) * R;
    const issY = cy - (issLat / 90) * R;

    const issGlow = gc.createRadialGradient(issX, issY, 0, issX, issY, R * 0.06);
    issGlow.addColorStop(0, 'rgba(252,129,129,0.8)');
    issGlow.addColorStop(1, 'rgba(252,129,129,0)');
    gc.beginPath();
    gc.arc(issX, issY, R * 0.06, 0, Math.PI * 2);
    gc.fillStyle = issGlow;
    gc.fill();

    gc.beginPath();
    gc.arc(issX, issY, R * 0.018, 0, Math.PI * 2);
    gc.fillStyle = '#fc8181';
    gc.fill();

    // ISS label
    gc.fillStyle = 'rgba(252,129,129,0.8)';
    gc.font = `${Math.max(9, w * 0.028)}px Inter`;
    gc.fillText('ISS', issX + R * 0.025, issY - R * 0.025);

    // Highlight ring
    const highlight = gc.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
    highlight.addColorStop(0, 'rgba(255,255,255,0.07)');
    highlight.addColorStop(0.5, 'rgba(255,255,255,0)');
    gc.beginPath();
    gc.arc(cx, cy, R, 0, Math.PI * 2);
    gc.fillStyle = highlight;
    gc.fill();
}

function updateISS() {
    fetch('/iss')
        .then(r => r.json())
        .then(data => {
            if (data.iss_position) {
                issLat = parseFloat(data.iss_position.latitude);
                issLng = parseFloat(data.iss_position.longitude);
                issTrack.push({ lat: issLat, lng: issLng });
                if (issTrack.length > 40) issTrack.shift();
                document.getElementById('iss-lat').textContent = issLat.toFixed(2) + '°';
                document.getElementById('iss-lng').textContent = issLng.toFixed(2) + '°';
                drawGlobe();
            }
        });
}

updateISS();
setInterval(updateISS, 5000);
setInterval(drawGlobe, 100);

// ── APOD ───────────────────────────────────────────────
function renderAPOD(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.error) {
        container.innerHTML = `<p style="color:var(--muted);font-size:0.85rem">No image available for that date.</p>`;
        return;
    }

    const sentences = data.explanation.split('. ');
    const pullquote = sentences.find(s => s.length > 60 && s.length < 200) || sentences[0];
    const isRealPhoto = data.url && data.url.includes('/image/');

    if (data.media_type === 'image') {
        container.innerHTML = `
            <p class="apod-title">${data.title}</p>
            <p class="apod-date">${data.date}</p>
            ${isRealPhoto ? `<img src="${data.url}" alt="${data.title}" />` : ''}
            <p class="apod-pullquote">"${pullquote}."</p>
            <p class="apod-body">${data.explanation}</p>
        `;
    } else {
        container.innerHTML = `
            <p class="apod-title">${data.title}</p>
            <p class="apod-date">${data.date}</p>
            <p class="apod-pullquote">"${pullquote}."</p>
            <p class="apod-body">${data.explanation}</p>
            <p style="margin-top:1rem;font-size:0.82rem;color:#4a5568">
                This feature is a video —
                <a href="${data.url}" target="_blank" style="color:#63b3ed">watch it here →</a>
            </p>
        `;
    }
}

// Load today's APOD
fetch('/apod')
    .then(r => r.json())
    .then(data => renderAPOD(data, 'apod-container'));

// Set max date on picker to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('apod-date-picker').max = today;

// Historical APOD lookup
document.getElementById('apod-date-btn').addEventListener('click', () => {
    const date = document.getElementById('apod-date-picker').value;
    if (!date) return;
    const container = document.getElementById('apod-historical-container');
    container.innerHTML = '<div class="loading">Looking up...</div>';
    fetch(`/apod?date=${date}`)
        .then(r => r.json())
        .then(data => renderAPOD(data, 'apod-historical-container'));
});

// ── Asteroids ──────────────────────────────────────────
let allAsteroids = [];
let currentFilter = 'all';
let currentView = 'simple';
let chart = null;

function loadAsteroids(startDate) {
    const url = startDate ? `/asteroids?start_date=${startDate}` : '/asteroids';
    document.getElementById('asteroid-cards').innerHTML = '<div class="loading">scanning the sky...</div>';

    fetch(url)
        .then(r => r.json())
        .then(data => {
            allAsteroids = Object.values(data.near_earth_objects).flat();
            updateStats();
            renderSpotlight();
            renderChart();
            renderCards();
            resizeSolar();
            if (!solarRunning) {
                solarRunning = true;
                solarLoop(allAsteroids);
            }
        });
}

function updateStats() {
    const hazardous = allAsteroids.filter(a => a.is_potentially_hazardous_asteroid);
    const closest = allAsteroids.reduce((min, a) => {
        const d = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
        return d < min ? d : min;
    }, Infinity);
    countUp(document.getElementById('total-count'), allAsteroids.length);
    countUp(document.getElementById('hazard-count'), hazardous.length);
    countUp(document.getElementById('closest'), closest);
}

function renderSpotlight() {
    const sorted = [...allAsteroids].sort((a, b) =>
        parseFloat(a.close_approach_data[0].miss_distance.kilometers) -
        parseFloat(b.close_approach_data[0].miss_distance.kilometers)
    );
    const ast = sorted[0];
    if (!ast) return;

    const dist = parseFloat(ast.close_approach_data[0].miss_distance.kilometers);
    const lunar = parseFloat(ast.close_approach_data[0].miss_distance.lunar).toFixed(1);
    const spd = formatNum(parseFloat(ast.close_approach_data[0].relative_velocity.kilometers_per_hour));
    const m = Math.round(ast.estimated_diameter.meters.estimated_diameter_max);

    document.getElementById('spotlight-section').style.display = 'block';
    document.getElementById('spotlight-card').innerHTML = `
        <p class="spotlight-name">${ast.name}</p>
        <p class="spotlight-prose">
            ${sizeDescription(m).charAt(0).toUpperCase() + sizeDescription(m).slice(1)},
            traveling at ${spd} km/h. It passed within ${formatNum(dist)} km of Earth —
            ${lunar} times the distance to the Moon.
            ${ast.is_potentially_hazardous_asteroid
                ? 'NASA classifies it as potentially hazardous.'
                : 'It passed without incident.'}
        </p>
        <div class="spotlight-stats">
            <div class="spotlight-stat">
                <span class="spotlight-stat-val">${formatNum(dist)} km</span>
                <span class="spotlight-stat-label">miss distance</span>
            </div>
            <div class="spotlight-stat">
                <span class="spotlight-stat-val">${lunar}</span>
                <span class="spotlight-stat-label">lunar distances</span>
            </div>
            <div class="spotlight-stat">
                <span class="spotlight-stat-val">${m} m</span>
                <span class="spotlight-stat-label">diameter</span>
            </div>
            <div class="spotlight-stat">
                <span class="spotlight-stat-val">${spd} km/h</span>
                <span class="spotlight-stat-label">speed</span>
            </div>
        </div>
    `;
}

function renderChart() {
    const filtered = currentFilter === 'hazardous'
        ? allAsteroids.filter(a => a.is_potentially_hazardous_asteroid)
        : allAsteroids;

    const top12 = [...filtered]
        .sort((a, b) => b.estimated_diameter.meters.estimated_diameter_max - a.estimated_diameter.meters.estimated_diameter_max)
        .slice(0, 12);

    const labels = top12.map(a => a.name);
    const sizes = top12.map(a => Math.round(a.estimated_diameter.meters.estimated_diameter_max));
    const colors = top12.map(a => a.is_potentially_hazardous_asteroid
        ? 'rgba(252,129,129,0.7)' : 'rgba(99,179,237,0.55)');

    if (chart) chart.destroy();
    const ctx = document.getElementById('asteroidChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Max diameter (m)', data: sizes, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#718096', font: { family: 'Inter', size: 11 } } },
                tooltip: { callbacks: { afterLabel: (item) => sizeDescription(top12[item.dataIndex].estimated_diameter.meters.estimated_diameter_max) } }
            },
            scales: {
                x: { ticks: { color: '#4a5568', maxRotation: 45, font: { size: 10 } }, grid: { color: 'transparent' } },
                y: { ticks: { color: '#4a5568', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' }, title: { display: true, text: 'diameter (m)', color: '#4a5568', font: { size: 10 } } }
            }
        }
    });
}

function renderCards() {
    const filtered = currentFilter === 'hazardous'
        ? allAsteroids.filter(a => a.is_potentially_hazardous_asteroid)
        : allAsteroids;

    const sorted = [...filtered].sort((a, b) =>
        parseFloat(a.close_approach_data[0].miss_distance.kilometers) -
        parseFloat(b.close_approach_data[0].miss_distance.kilometers)
    );

    const container = document.getElementById('asteroid-cards');
    container.innerHTML = sorted.map((ast, i) => {
        const approach = ast.close_approach_data[0];
        const distKm = parseFloat(approach.miss_distance.kilometers);
        const distLunar = parseFloat(approach.miss_distance.lunar).toFixed(1);
        const spd = formatNum(parseFloat(approach.relative_velocity.kilometers_per_hour));
        const m = Math.round(ast.estimated_diameter.meters.estimated_diameter_max);
        const minM = Math.round(ast.estimated_diameter.meters.estimated_diameter_min);
        const hz = ast.is_potentially_hazardous_asteroid;
        const pct = proximityPct(distKm);

        return `
        <div class="asteroid-card ${hz ? 'hazardous' : ''}" onclick="toggleTech(${i})">
            <div class="orbit-ring">
                <div class="orbit-path"></div>
                <div class="orbit-planet"></div>
                <div class="orbit-dot"></div>
            </div>
            ${hz ? '<span class="hazard-badge">⚠ potentially hazardous</span>' : ''}
            <p class="card-name">${ast.name}</p>
            <p class="card-date">${approach.close_approach_date}</p>
            <p class="card-prose">${cardProse(ast)}</p>
            <div class="proximity-wrap">
                <div class="proximity-label">proximity to earth</div>
                <div class="proximity-track">
                    <div class="proximity-fill" style="width:${pct}%"></div>
                </div>
                <div class="proximity-val">${formatNum(distKm)} km · ${distLunar} lunar distances</div>
            </div>
            <div class="tech-panel ${currentView === 'technical' ? 'open' : ''}" id="tech-${i}">
                <div class="tech-row"><span>diameter</span><span>${minM}–${m} m</span></div>
                <div class="tech-row"><span>speed</span><span>${spd} km/h</span></div>
                <div class="tech-row"><span>miss distance</span><span>${formatNum(distKm)} km</span></div>
                <div class="tech-row"><span>lunar distances</span><span>${distLunar}</span></div>
                <div class="tech-row"><span>orbiting</span><span>${approach.orbiting_body}</span></div>
                <div class="tech-row"><span>sentry object</span><span>${ast.is_sentry_object ? 'yes' : 'no'}</span></div>
                <a class="jpl-link" href="${ast.nasa_jpl_url}" target="_blank">View on NASA JPL →</a>
            </div>
        </div>`;
    }).join('');
}

function toggleTech(i) {
    if (currentView !== 'technical') return;
    document.getElementById(`tech-${i}`).classList.toggle('open');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderChart();
        renderCards();
    });
});

document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        document.querySelectorAll('.tech-panel').forEach(el => {
            if (currentView === 'technical') el.classList.add('open');
            else el.classList.remove('open');
        });
    });
});

document.getElementById('date-picker').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) loadAsteroids(val);
});

loadAsteroids();