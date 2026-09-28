// ── Starfield ──────────────────────────────────────────
const canvas = document.getElementById('starfield');
const ctx2 = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const stars = Array.from({ length: 250 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2,
    alpha: Math.random(),
    speed: (Math.random() * 0.004) + 0.001
}));

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
    const size = sizeDescription(m);
    const cap = size.charAt(0).toUpperCase() + size.slice(1);

    if (ast.is_potentially_hazardous_asteroid) {
        return `${cap}, moving at ${spd} km/h. It passed within ${lunar} lunar distances — close enough to be on NASA's watch list.`;
    }
    return `${cap}, traveling at ${spd} km/h. It passed at ${lunar} lunar distances without incident.`;
}

function proximityPct(km) {
    const lunar = 384400;
    return Math.max(5, Math.min(92, 100 - (km / (lunar * 2.5)) * 100));
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

// ── APOD ───────────────────────────────────────────────
fetch('/apod')
    .then(r => r.json())
    .then(data => {
        const bg = document.getElementById('hero-bg');
        if (data.media_type === 'image' && data.url) {
            bg.style.backgroundImage = `url('${data.hdurl || data.url}')`;
        }

        const container = document.getElementById('apod-container');
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
                    Today's feature is a video — 
                    <a href="${data.url}" target="_blank" style="color:#63b3ed">watch it here →</a>
                </p>
            `;
        }
    });

// ── State ──────────────────────────────────────────────
let allAsteroids = [];
let currentFilter = 'all';
let currentView = 'simple';
let chart = null;

// ── Load Asteroids ─────────────────────────────────────
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

    if (hazardous.length > 0) {
        document.getElementById('hero').style.borderBottom = '1px solid rgba(252,129,129,0.2)';
    }
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
        data: {
            labels,
            datasets: [{
                label: 'Max diameter (m)',
                data: sizes,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#718096', font: { family: 'Inter', size: 11 } } },
                tooltip: {
                    callbacks: {
                        afterLabel: (item) => sizeDescription(top12[item.dataIndex].estimated_diameter.meters.estimated_diameter_max)
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#4a5568', maxRotation: 45, font: { size: 10 } },
                    grid: { color: 'transparent' }
                },
                y: {
                    ticks: { color: '#4a5568', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    title: { display: true, text: 'diameter (m)', color: '#4a5568', font: { size: 10 } }
                }
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

// ── Init ───────────────────────────────────────────────
loadAsteroids();