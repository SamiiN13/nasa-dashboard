// ── Starfield ──────────────────────────────────────────
const canvas = document.getElementById('starfield');
const ctx2 = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5,
    alpha: Math.random(),
    speed: Math.random() * 0.005
}));

function drawStars() {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx2.fill();
    });
    requestAnimationFrame(drawStars);
}
drawStars();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ── Helpers ────────────────────────────────────────────
function sizeDescription(meters) {
    if (meters < 10) return "smaller than a car";
    if (meters < 50) return "about the size of a house";
    if (meters < 100) return "about the size of an office building";
    if (meters < 300) return "about the size of a football stadium";
    if (meters < 600) return "larger than the Eiffel Tower";
    if (meters < 1000) return "larger than the Burj Khalifa";
    return "larger than a small mountain";
}

function proximityPercent(km) {
    const lunar = 384400;
    const pct = Math.max(5, Math.min(95, 100 - (km / (lunar * 3)) * 100));
    return pct;
}

function formatNum(n) {
    return Math.round(n).toLocaleString();
}

// ── State ──────────────────────────────────────────────
let allAsteroids = [];
let currentFilter = 'all';
let currentView = 'simple';
let chart = null;

// ── APOD ───────────────────────────────────────────────
fetch('/apod')
    .then(r => r.json())
    .then(data => {
        const container = document.getElementById('apod-container');
        if (data.media_type === 'image') {
            container.innerHTML = `
                <h3>${data.title}</h3>
                <img src="${data.url}" alt="${data.title}" />
                <p class="apod-date">${data.date}</p>
                <p class="apod-explanation">${data.explanation}</p>
            `;
        } else {
            container.innerHTML = `
                <h3>${data.title}</h3>
                <p class="apod-date">${data.date}</p>
                <p class="apod-explanation">${data.explanation}</p>
                <p style="color:#718096;margin-top:1rem">Today's APOD is a video — <a href="${data.url}" target="_blank" style="color:#63b3ed">watch it here</a>.</p>
            `;
        }
    });

// ── Asteroids ──────────────────────────────────────────
function loadAsteroids(startDate) {
    const url = startDate ? `/asteroids?start_date=${startDate}` : '/asteroids';
    document.getElementById('asteroid-cards').innerHTML = '<div class="loading">Loading asteroids...</div>';

    fetch(url)
        .then(r => r.json())
        .then(data => {
            allAsteroids = Object.values(data.near_earth_objects).flat();
            updateStats();
            renderChart();
            renderCards();
        });
}

function updateStats() {
    const hazardous = allAsteroids.filter(a => a.is_potentially_hazardous_asteroid);
    const closest = allAsteroids.reduce((min, a) => {
        const dist = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
        return dist < min ? dist : min;
    }, Infinity);

    document.getElementById('total-count').textContent = allAsteroids.length;
    document.getElementById('hazard-count').textContent = hazardous.length;
    document.getElementById('closest').textContent = formatNum(closest);
}

function renderChart() {
    const filtered = currentFilter === 'hazardous'
        ? allAsteroids.filter(a => a.is_potentially_hazardous_asteroid)
        : allAsteroids;

    const top15 = [...filtered]
        .sort((a, b) => b.estimated_diameter.meters.estimated_diameter_max - a.estimated_diameter.meters.estimated_diameter_max)
        .slice(0, 15);

    const labels = top15.map(a => a.name);
    const sizes = top15.map(a => Math.round(a.estimated_diameter.meters.estimated_diameter_max));
    const colors = top15.map(a => a.is_potentially_hazardous_asteroid ? '#fc8181' : '#63b3ed');

    if (chart) chart.destroy();

    const ctx = document.getElementById('asteroidChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Max Diameter (meters)',
                data: sizes,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#e0e0e0' } },
                tooltip: {
                    callbacks: {
                        afterLabel: (item) => {
                            const ast = top15[item.dataIndex];
                            const m = ast.estimated_diameter.meters.estimated_diameter_max;
                            return sizeDescription(m);
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#90cdf4', maxRotation: 45 } },
                y: {
                    ticks: { color: '#90cdf4' },
                    grid: { color: '#1e3a5f' },
                    title: { display: true, text: 'Diameter (m)', color: '#718096' }
                }
            }
        }
    });
}

function renderCards() {
    const filtered = currentFilter === 'hazardous'
        ? allAsteroids.filter(a => a.is_potentially_hazardous_asteroid)
        : allAsteroids;

    const sorted = [...filtered].sort((a, b) => {
        const da = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
        const db = parseFloat(b.close_approach_data[0].miss_distance.kilometers);
        return da - db;
    });

    const container = document.getElementById('asteroid-cards');
    container.innerHTML = sorted.map((ast, i) => {
        const diameter = ast.estimated_diameter.meters.estimated_diameter_max;
        const approach = ast.close_approach_data[0];
        const distKm = parseFloat(approach.miss_distance.kilometers);
        const distLunar = parseFloat(approach.miss_distance.lunar);
        const speedKph = parseFloat(approach.relative_velocity.kilometers_per_hour);
        const hazardous = ast.is_potentially_hazardous_asteroid;
        const pct = proximityPercent(distKm);

        return `
        <div class="asteroid-card ${hazardous ? 'hazardous' : ''}" onclick="toggleTech(${i})">
            <div class="card-header">
                <span class="asteroid-name">${ast.name}</span>
                ${hazardous ? '<span class="hazard-badge">⚠️ Hazardous</span>' : ''}
            </div>

            <p class="plain-english">
                ${sizeDescription(Math.round(diameter))} — passed Earth on ${approach.close_approach_date}
            </p>

            <div class="proximity-bar-container">
                <div class="proximity-label">Proximity to Earth</div>
                <div class="proximity-bar">
                    <div class="proximity-fill" style="width:${pct}%"></div>
                </div>
                <div class="proximity-distance">${formatNum(distKm)} km · ${distLunar.toFixed(1)} lunar distances</div>
            </div>

            <div class="technical-data ${currentView === 'technical' ? 'visible' : ''}" id="tech-${i}">
                <div class="tech-row"><span>Min diameter</span><span>${Math.round(ast.estimated_diameter.meters.estimated_diameter_min)} m</span></div>
                <div class="tech-row"><span>Max diameter</span><span>${Math.round(diameter)} m</span></div>
                <div class="tech-row"><span>Speed</span><span>${formatNum(speedKph)} km/h</span></div>
                <div class="tech-row"><span>Miss distance</span><span>${formatNum(distKm)} km</span></div>
                <div class="tech-row"><span>Orbiting</span><span>${approach.orbiting_body}</span></div>
                <div class="tech-row"><span>Sentry object</span><span>${ast.is_sentry_object ? 'Yes' : 'No'}</span></div>
                <a class="jpl-link" href="${ast.nasa_jpl_url}" target="_blank">View on NASA JPL →</a>
            </div>
        </div>
        `;
    }).join('');
}

function toggleTech(i) {
    if (currentView !== 'technical') return;
    const el = document.getElementById(`tech-${i}`);
    el.classList.toggle('visible');
}

// ── Controls ───────────────────────────────────────────
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
        document.querySelectorAll('.technical-data').forEach(el => {
            if (currentView === 'technical') el.classList.add('visible');
            else el.classList.remove('visible');
        });
    });
});

document.getElementById('date-picker').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) loadAsteroids(val);
});

// ── Init ───────────────────────────────────────────────
loadAsteroids();