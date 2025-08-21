/**
 * Weather Widget
 * Displays current weather conditions with city selection
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Weather',
        city: 'New York',
        units: 'metric', // 'metric', 'imperial', 'kelvin'
        apiKey: '', // Optional API key for real data
        refreshInterval: 600000 // 10 minutes
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let refreshInterval = null;
    let destroyed = false;

    // Mock weather data for demo purposes
    const mockWeatherData = {
        'New York': {
            location: 'New York, NY',
            temperature: 22,
            condition: 'Partly Cloudy',
            humidity: 65,
            windSpeed: 12,
            pressure: 1013,
            icon: 'cloud'
        },
        'London': {
            location: 'London, UK',
            temperature: 18,
            condition: 'Overcast',
            humidity: 78,
            windSpeed: 8,
            pressure: 1008,
            icon: 'cloud'
        },
        'Tokyo': {
            location: 'Tokyo, Japan',
            temperature: 26,
            condition: 'Sunny',
            humidity: 60,
            windSpeed: 5,
            pressure: 1020,
            icon: 'sun'
        },
        'Paris': {
            location: 'Paris, France',
            temperature: 20,
            condition: 'Light Rain',
            humidity: 82,
            windSpeed: 10,
            pressure: 1005,
            icon: 'cloud'
        }
    };

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'weather-widget';
        
        updateDisplay();
        startRefreshTimer();
        
        return element;
    }

    /**
     * Update weather display
     */
    async function updateDisplay() {
        if (destroyed || !element) return;

        try {
            element.innerHTML = '<div class="loading">Loading weather...</div>';
            
            const weatherData = await fetchWeatherData();
            
            if (destroyed || !element) return;

            element.innerHTML = `
                <div class="weather-location">${weatherData.location}</div>
                <div class="weather-icon">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#${weatherData.icon}"></use>
                    </svg>
                </div>
                <div class="weather-temp" aria-label="Temperature">${weatherData.temperature}°${getUnitSymbol()}</div>
                <div class="weather-condition">${weatherData.condition}</div>
                
                <div class="weather-details">
                    <div class="weather-detail">
                        <div class="weather-detail-label">Humidity</div>
                        <div class="weather-detail-value">${weatherData.humidity}%</div>
                    </div>
                    <div class="weather-detail">
                        <div class="weather-detail-label">Wind</div>
                        <div class="weather-detail-value">${weatherData.windSpeed} ${getWindUnit()}</div>
                    </div>
                    <div class="weather-detail">
                        <div class="weather-detail-label">Pressure</div>
                        <div class="weather-detail-value">${weatherData.pressure} hPa</div>
                    </div>
                </div>
                
                <div class="weather-controls">
                    <button type="button" class="secondary-button" onclick="this.closest('.weather-widget')._widget.refresh()">
                        Refresh
                    </button>
                    <button type="button" class="secondary-button" onclick="this.closest('.weather-widget')._widget.openSettings()">
                        Settings
                    </button>
                </div>
            `;

            // Store widget instance for access from buttons
            element._widget = {
                refresh: () => updateDisplay(),
                openSettings
            };

        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            if (destroyed || !element) return;

            element.innerHTML = `
                <div class="error">
                    <div>Weather data unavailable</div>
                    <button type="button" class="secondary-button" onclick="this.closest('.weather-widget')._widget.refresh()">
                        Retry
                    </button>
                </div>
            `;

            element._widget = {
                refresh: () => updateDisplay(),
                openSettings
            };
        }
    }

    /**
     * Fetch weather data
     * @returns {Promise<Object>} Weather data
     */
    async function fetchWeatherData() {
        // Try to fetch real weather data if API key is provided
        if (config.apiKey) {
            try {
                return await fetchRealWeatherData();
            } catch (error) {
                console.warn('Failed to fetch real weather data, using mock data:', error);
            }
        }

        // Use mock data
        const data = mockWeatherData[config.city] || mockWeatherData['New York'];
        
        // Add some randomness to make it feel more dynamic
        const variation = (Math.random() - 0.5) * 4;
        return {
            ...data,
            temperature: Math.round(data.temperature + variation),
            humidity: Math.max(0, Math.min(100, data.humidity + Math.round(variation))),
            windSpeed: Math.max(0, data.windSpeed + Math.round(variation / 2))
        };
    }

    /**
     * Fetch real weather data from API
     * @returns {Promise<Object>} Weather data
     */
    async function fetchRealWeatherData() {
        // Using Open-Meteo API (free, no API key required)
        // First get coordinates for the city
        const geocodeResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(config.city)}&count=1`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData.results || geocodeData.results.length === 0) {
            throw new Error('City not found');
        }

        const { latitude, longitude, name, country } = geocodeData.results[0];

        // Get weather data
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m,pressure_msl&forecast_days=1`
        );
        const weatherData = await weatherResponse.json();

        const current = weatherData.current_weather;
        const currentHour = new Date().getHours();
        const humidity = weatherData.hourly.relative_humidity_2m[currentHour];
        const pressure = weatherData.hourly.pressure_msl[currentHour];

        // Convert temperature based on units
        let temperature = current.temperature;
        if (config.units === 'imperial') {
            temperature = (temperature * 9/5) + 32;
        } else if (config.units === 'kelvin') {
            temperature = temperature + 273.15;
        }

        // Map weather codes to conditions and icons
        const condition = getWeatherCondition(current.weathercode);
        const icon = getWeatherIcon(current.weathercode);

        return {
            location: `${name}, ${country}`,
            temperature: Math.round(temperature),
            condition,
            humidity: Math.round(humidity),
            windSpeed: Math.round(current.windspeed),
            pressure: Math.round(pressure),
            icon
        };
    }

    /**
     * Get weather condition from weather code
     * @param {number} code - Weather code
     * @returns {string} Weather condition
     */
    function getWeatherCondition(code) {
        const conditions = {
            0: 'Clear Sky',
            1: 'Mainly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing Rime Fog',
            51: 'Light Drizzle',
            53: 'Moderate Drizzle',
            55: 'Dense Drizzle',
            61: 'Slight Rain',
            63: 'Moderate Rain',
            65: 'Heavy Rain',
            71: 'Slight Snow',
            73: 'Moderate Snow',
            75: 'Heavy Snow',
            80: 'Slight Rain Showers',
            81: 'Moderate Rain Showers',
            82: 'Violent Rain Showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with Hail',
            99: 'Thunderstorm with Heavy Hail'
        };
        return conditions[code] || 'Unknown';
    }

    /**
     * Get weather icon from weather code
     * @param {number} code - Weather code
     * @returns {string} Icon name
     */
    function getWeatherIcon(code) {
        if (code === 0 || code === 1) return 'sun';
        if (code >= 2 && code <= 3) return 'cloud';
        if (code >= 45 && code <= 48) return 'cloud';
        if (code >= 51 && code <= 82) return 'cloud';
        if (code >= 95) return 'cloud';
        return 'cloud';
    }

    /**
     * Get unit symbol for temperature
     * @returns {string} Unit symbol
     */
    function getUnitSymbol() {
        switch (config.units) {
            case 'imperial': return 'F';
            case 'kelvin': return 'K';
            default: return 'C';
        }
    }

    /**
     * Get wind unit
     * @returns {string} Wind unit
     */
    function getWindUnit() {
        return config.units === 'imperial' ? 'mph' : 'km/h';
    }

    /**
     * Start refresh timer
     */
    function startRefreshTimer() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        refreshInterval = setInterval(() => {
            updateDisplay();
        }, config.refreshInterval);
    }

    /**
     * Stop refresh timer
     */
    function stopRefreshTimer() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    /**
     * Open settings modal
     */
    function openSettings() {
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            ui.showModal('widget-settings-modal', {
                title: 'Weather Settings',
                content: settingsForm
            });

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    city: formData.get('city'),
                    units: formData.get('units'),
                    apiKey: formData.get('apiKey'),
                    refreshInterval: parseInt(formData.get('refreshInterval')) * 60000
                };

                setConfig(newConfig);
                ui.closeModal('widget-settings-modal');
            });
        });
    }

    /**
     * Create settings form
     * @returns {Element} Settings form element
     */
    function createSettingsForm() {
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="weather-city">City</label>
                <input type="text" id="weather-city" name="city" class="input" value="${config.city}" required>
            </div>

            <div class="form-group">
                <label class="form-label" for="weather-units">Units</label>
                <select id="weather-units" name="units" class="input">
                    <option value="metric" ${config.units === 'metric' ? 'selected' : ''}>Celsius</option>
                    <option value="imperial" ${config.units === 'imperial' ? 'selected' : ''}>Fahrenheit</option>
                    <option value="kelvin" ${config.units === 'kelvin' ? 'selected' : ''}>Kelvin</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label" for="weather-refresh">Refresh Interval (minutes)</label>
                <select id="weather-refresh" name="refreshInterval" class="input">
                    <option value="5" ${config.refreshInterval === 300000 ? 'selected' : ''}>5 minutes</option>
                    <option value="10" ${config.refreshInterval === 600000 ? 'selected' : ''}>10 minutes</option>
                    <option value="30" ${config.refreshInterval === 1800000 ? 'selected' : ''}>30 minutes</option>
                    <option value="60" ${config.refreshInterval === 3600000 ? 'selected' : ''}>1 hour</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label" for="weather-api-key">API Key (optional)</label>
                <input type="text" id="weather-api-key" name="apiKey" class="input" value="${config.apiKey}" placeholder="For real weather data">
                <div class="form-help">Leave empty to use mock data</div>
            </div>
        `;
        return form;
    }

    /**
     * Emit configuration change event
     */
    function emitConfigChange() {
        element.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: { config },
            bubbles: true
        }));
    }

    /**
     * Set widget configuration
     * @param {Object} newConfig - New configuration
     */
    function setConfig(newConfig) {
        const oldConfig = { ...config };
        config = { ...config, ...newConfig };
        
        // Restart refresh timer if interval changed
        if (oldConfig.refreshInterval !== config.refreshInterval) {
            stopRefreshTimer();
            startRefreshTimer();
        }
        
        updateDisplay();
        emitConfigChange();
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    function getConfig() {
        return { ...config };
    }

    /**
     * Destroy widget and cleanup
     */
    function destroy() {
        destroyed = true;
        stopRefreshTimer();
        
        if (element) {
            element._widget = null;
            element = null;
        }
    }

    // Initialize
    const el = createElement();

    return {
        el,
        getConfig,
        setConfig,
        destroy
    };
}