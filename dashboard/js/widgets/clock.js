/**
 * Clock Widget
 * Displays current time in digital or analog format with timezone support
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Clock',
        format: '24h', // '12h' or '24h'
        showAnalog: false,
        timezone: 'local',
        showDate: true,
        showSeconds: true
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let updateInterval = null;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'clock-widget';
        
        updateDisplay();
        startTimer();
        
        return element;
    }

    /**
     * Update clock display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        const now = new Date();
        const timeString = formatTime(now);
        const dateString = formatDate(now);

        if (config.showAnalog) {
            element.innerHTML = `
                <div class="clock-analog" role="img" aria-label="Analog clock showing ${timeString}">
                    <div class="clock-hand clock-hand-hour" style="transform: rotate(${getHourAngle(now)}deg)"></div>
                    <div class="clock-hand clock-hand-minute" style="transform: rotate(${getMinuteAngle(now)}deg)"></div>
                    ${config.showSeconds ? `<div class="clock-hand clock-hand-second" style="transform: rotate(${getSecondAngle(now)}deg)"></div>` : ''}
                    <div class="clock-center"></div>
                </div>
                ${config.showDate ? `<div class="clock-date">${dateString}</div>` : ''}
                <div class="clock-controls">
                    <button type="button" class="secondary-button" onclick="this.closest('.clock-widget')._widget.toggleFormat()">
                        Digital
                    </button>
                    <button type="button" class="secondary-button" onclick="this.closest('.clock-widget')._widget.openSettings()">
                        Settings
                    </button>
                </div>
            `;
        } else {
            element.innerHTML = `
                <div class="clock-digital" aria-live="polite" aria-atomic="true">${timeString}</div>
                ${config.showDate ? `<div class="clock-date">${dateString}</div>` : ''}
                <div class="clock-controls">
                    <button type="button" class="secondary-button" onclick="this.closest('.clock-widget')._widget.toggleFormat()">
                        Analog
                    </button>
                    <button type="button" class="secondary-button" onclick="this.closest('.clock-widget')._widget.openSettings()">
                        Settings
                    </button>
                </div>
            `;
        }

        // Store widget instance for access from buttons
        element._widget = {
            toggleFormat,
            openSettings
        };
    }

    /**
     * Format time string
     * @param {Date} date - Date object
     * @returns {string} Formatted time string
     */
    function formatTime(date) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: config.format === '12h',
            timeZone: config.timezone === 'local' ? undefined : config.timezone
        };

        if (config.showSeconds && !config.showAnalog) {
            options.second = '2-digit';
        }

        return date.toLocaleTimeString(undefined, options);
    }

    /**
     * Format date string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: config.timezone === 'local' ? undefined : config.timezone
        };

        return date.toLocaleDateString(undefined, options);
    }

    /**
     * Get hour hand angle
     * @param {Date} date - Date object
     * @returns {number} Angle in degrees
     */
    function getHourAngle(date) {
        const hours = date.getHours() % 12;
        const minutes = date.getMinutes();
        return (hours * 30) + (minutes * 0.5) - 90; // -90 to start from 12 o'clock
    }

    /**
     * Get minute hand angle
     * @param {Date} date - Date object
     * @returns {number} Angle in degrees
     */
    function getMinuteAngle(date) {
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return (minutes * 6) + (seconds * 0.1) - 90; // -90 to start from 12 o'clock
    }

    /**
     * Get second hand angle
     * @param {Date} date - Date object
     * @returns {number} Angle in degrees
     */
    function getSecondAngle(date) {
        const seconds = date.getSeconds();
        return (seconds * 6) - 90; // -90 to start from 12 o'clock
    }

    /**
     * Start update timer
     */
    function startTimer() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        const interval = config.showSeconds ? 1000 : 60000; // 1 second or 1 minute
        updateInterval = setInterval(updateDisplay, interval);
    }

    /**
     * Stop update timer
     */
    function stopTimer() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    /**
     * Toggle between analog and digital format
     */
    function toggleFormat() {
        config.showAnalog = !config.showAnalog;
        updateDisplay();
        emitConfigChange();
    }

    /**
     * Open settings modal
     */
    function openSettings() {
        // Import UI manager and show settings modal
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            ui.showModal('widget-settings-modal', {
                title: 'Clock Settings',
                content: settingsForm
            });

            // Handle form submission
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    format: formData.get('format'),
                    showAnalog: formData.get('showAnalog') === 'on',
                    timezone: formData.get('timezone'),
                    showDate: formData.get('showDate') === 'on',
                    showSeconds: formData.get('showSeconds') === 'on'
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
                <label class="form-label" for="clock-format">Time Format</label>
                <select id="clock-format" name="format" class="input">
                    <option value="12h" ${config.format === '12h' ? 'selected' : ''}>12 Hour</option>
                    <option value="24h" ${config.format === '24h' ? 'selected' : ''}>24 Hour</option>
                </select>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showAnalog" ${config.showAnalog ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Analog Clock
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showDate" ${config.showDate ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Date
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showSeconds" ${config.showSeconds ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Seconds
                </label>
            </div>

            <div class="form-group">
                <label class="form-label" for="clock-timezone">Timezone</label>
                <select id="clock-timezone" name="timezone" class="input">
                    <option value="local" ${config.timezone === 'local' ? 'selected' : ''}>Local Time</option>
                    <option value="UTC" ${config.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                    <option value="America/New_York" ${config.timezone === 'America/New_York' ? 'selected' : ''}>New York</option>
                    <option value="America/Los_Angeles" ${config.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Los Angeles</option>
                    <option value="Europe/London" ${config.timezone === 'Europe/London' ? 'selected' : ''}>London</option>
                    <option value="Europe/Paris" ${config.timezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                    <option value="Asia/Tokyo" ${config.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                    <option value="Asia/Shanghai" ${config.timezone === 'Asia/Shanghai' ? 'selected' : ''}>Shanghai</option>
                    <option value="Australia/Sydney" ${config.timezone === 'Australia/Sydney' ? 'selected' : ''}>Sydney</option>
                </select>
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
        
        // Restart timer if interval changed
        if (oldConfig.showSeconds !== config.showSeconds) {
            stopTimer();
            startTimer();
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
        stopTimer();
        
        if (element) {
            element._widget = null;
            element = null;
        }
    }

    // Initialize
    const el = createElement();

    // Return widget interface
    return {
        el,
        getConfig,
        setConfig,
        destroy
    };
}