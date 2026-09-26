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