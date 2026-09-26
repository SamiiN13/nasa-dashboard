// Fetch and display APOD
fetch('/apod')
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById('apod-container');
        container.innerHTML = `
            <h3>${data.title}</h3>
            <img src="${data.url}" alt="${data.title}" />
            <p class="apod-date">${data.date}</p>
            <p class="apod-explanation">${data.explanation}</p>
        `;
    });

// Fetch and display Asteroids
fetch('/asteroids')
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById('asteroid-container');
        const allAsteroids = Object.values(data.near_earth_objects).flat();

        let html = '<table><thead><tr><th>Name</th><th>Diameter (m)</th><th>Miss Distance (km)</th><th>Hazardous</th></tr></thead><tbody>';

        allAsteroids.forEach(asteroid => {
            const diameter = Math.round(asteroid.estimated_diameter.meters.estimated_diameter_max);
            const distance = Math.round(parseFloat(asteroid.close_approach_data[0].miss_distance.kilometers)).toLocaleString();
            const hazardous = asteroid.is_potentially_hazardous_asteroid;

            html += `
                <tr class="${hazardous ? 'hazardous' : ''}">
                    <td>${asteroid.name}</td>
                    <td>${diameter}</td>
                    <td>${distance}</td>
                    <td>${hazardous ? '⚠️ Yes' : 'No'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    });

// Asteroid Size Chart
fetch('/asteroids')
    .then(response => response.json())
    .then(data => {
        const allAsteroids = Object.values(data.near_earth_objects).flat();
        
        // Take top 15 by size for readability
        const top15 = allAsteroids
            .sort((a, b) => b.estimated_diameter.meters.estimated_diameter_max - a.estimated_diameter.meters.estimated_diameter_max)
            .slice(0, 15);

        const labels = top15.map(a => a.name);
        const sizes = top15.map(a => Math.round(a.estimated_diameter.meters.estimated_diameter_max));
        const colors = top15.map(a => a.is_potentially_hazardous_asteroid ? '#fc8181' : '#63b3ed');

        const ctx = document.getElementById('asteroidChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
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
                    legend: { labels: { color: '#e0e0e0' } }
                },
                scales: {
                    x: { ticks: { color: '#90cdf4', maxRotation: 45 } },
                    y: { ticks: { color: '#90cdf4' }, grid: { color: '#1e3a5f' } }
                }
            }
        });
    });

// Stats bar
fetch('/asteroids')
    .then(response => response.json())
    .then(data => {
        const allAsteroids = Object.values(data.near_earth_objects).flat();
        const hazardous = allAsteroids.filter(a => a.is_potentially_hazardous_asteroid);
        const closest = allAsteroids.reduce((min, a) => {
            const dist = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
            return dist < min ? dist : min;
        }, Infinity);

        document.getElementById('total-count').textContent = allAsteroids.length;
        document.getElementById('hazard-count').textContent = hazardous.length;
        document.getElementById('closest').textContent = Math.round(closest).toLocaleString();
    });