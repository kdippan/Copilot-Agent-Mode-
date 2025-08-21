/**
 * System Monitor Widget
 * Displays system information and performance metrics
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'System Monitor',
        refreshInterval: 5000, // 5 seconds
        showBattery: true,
        showMemory: true,
        showNetwork: true
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let refreshInterval = null;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'system-widget';
        
        updateDisplay();
        startRefreshTimer();
        
        return element;
    }

    /**
     * Update display
     */
    async function updateDisplay() {
        if (destroyed || !element) return;

        const systemInfo = await getSystemInfo();

        element.innerHTML = `
            <div class="system-stats">
                ${config.showMemory ? createMemorystat(systemInfo.memory) : ''}
                ${config.showBattery && systemInfo.battery ? createBatteryStat(systemInfo.battery) : ''}
                ${config.showNetwork ? createNetworkStat(systemInfo.network) : ''}
                ${createBrowserStat(systemInfo.browser)}
            </div>
            
            <div class="system-info">
                <div><strong>Platform:</strong> ${systemInfo.platform}</div>
                <div><strong>User Agent:</strong> ${systemInfo.userAgent}</div>
                <div><strong>Screen:</strong> ${systemInfo.screen}</div>
                <div><strong>Timezone:</strong> ${systemInfo.timezone}</div>
            </div>
        `;
    }

    /**
     * Create memory stat HTML
     */
    function createMemorystat(memory) {
        if (!memory) return '';

        const usedPercent = memory.used ? (memory.used / memory.total) * 100 : 0;
        
        return `
            <div class="system-stat">
                <div class="system-stat-header">
                    <span class="system-stat-label">Memory</span>
                    <span class="system-stat-value">${formatBytes(memory.used)} / ${formatBytes(memory.total)}</span>
                </div>
                <div class="system-stat-bar">
                    <div class="system-stat-progress" style="width: ${usedPercent}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Create battery stat HTML
     */
    function createBatteryStat(battery) {
        if (!battery) return '';

        const level = Math.round(battery.level * 100);
        const charging = battery.charging ? ' (Charging)' : '';
        
        return `
            <div class="system-stat">
                <div class="system-stat-header">
                    <span class="system-stat-label">Battery</span>
                    <span class="system-stat-value">${level}%${charging}</span>
                </div>
                <div class="system-stat-bar">
                    <div class="system-stat-progress" style="width: ${level}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Create network stat HTML
     */
    function createNetworkStat(network) {
        const status = network.online ? 'Online' : 'Offline';
        const connection = network.connection || 'Unknown';
        
        return `
            <div class="system-stat">
                <div class="system-stat-header">
                    <span class="system-stat-label">Network</span>
                    <span class="system-stat-value">${status}</span>
                </div>
                <div class="system-stat-header" style="margin-top: 4px;">
                    <span class="system-stat-label">Connection</span>
                    <span class="system-stat-value">${connection}</span>
                </div>
            </div>
        `;
    }

    /**
     * Create browser stat HTML
     */
    function createBrowserStat(browser) {
        return `
            <div class="system-stat">
                <div class="system-stat-header">
                    <span class="system-stat-label">Browser</span>
                    <span class="system-stat-value">${browser.name}</span>
                </div>
                <div class="system-stat-header" style="margin-top: 4px;">
                    <span class="system-stat-label">Version</span>
                    <span class="system-stat-value">${browser.version}</span>
                </div>
            </div>
        `;
    }

    /**
     * Get system information
     */
    async function getSystemInfo() {
        const info = {
            platform: navigator.platform || 'Unknown',
            userAgent: getBrowserInfo().name,
            screen: `${screen.width}×${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            browser: getBrowserInfo(),
            memory: getMemoryInfo(),
            battery: await getBatteryInfo(),
            network: getNetworkInfo()
        };

        return info;
    }

    /**
     * Get browser information
     */
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = { name: 'Unknown', version: 'Unknown' };

        if (ua.includes('Chrome')) {
            const match = ua.match(/Chrome\/([0-9.]+)/);
            browser = { name: 'Chrome', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Firefox')) {
            const match = ua.match(/Firefox\/([0-9.]+)/);
            browser = { name: 'Firefox', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/([0-9.]+)/);
            browser = { name: 'Safari', version: match ? match[1] : 'Unknown' };
        } else if (ua.includes('Edge')) {
            const match = ua.match(/Edge\/([0-9.]+)/);
            browser = { name: 'Edge', version: match ? match[1] : 'Unknown' };
        }

        return browser;
    }

    /**
     * Get memory information
     */
    function getMemoryInfo() {
        if (!navigator.deviceMemory && !performance.memory) {
            return null;
        }

        // Use performance.memory if available (Chrome/Edge)
        if (performance.memory) {
            return {
                total: performance.memory.jsHeapSizeLimit,
                used: performance.memory.usedJSHeapSize,
                allocated: performance.memory.totalJSHeapSize
            };
        }

        // Fallback to device memory
        if (navigator.deviceMemory) {
            const totalGB = navigator.deviceMemory;
            const totalBytes = totalGB * 1024 * 1024 * 1024;
            // Estimate 60% usage
            const usedBytes = totalBytes * 0.6;
            
            return {
                total: totalBytes,
                used: usedBytes
            };
        }

        return null;
    }

    /**
     * Get battery information
     */
    async function getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
            }
        } catch (error) {
            console.log('Battery API not available');
        }
        return null;
    }

    /**
     * Get network information
     */
    function getNetworkInfo() {
        const online = navigator.onLine;
        let connection = 'Unknown';

        if ('connection' in navigator) {
            const conn = navigator.connection;
            connection = conn.effectiveType || conn.type || 'Unknown';
        }

        return { online, connection };
    }

    /**
     * Format bytes to human readable
     */
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
     * Open settings
     */
    function openSettings() {
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            
            ui.showModal('widget-settings-modal', {
                title: 'System Monitor Settings',
                content: settingsForm
            });

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    refreshInterval: parseInt(formData.get('refreshInterval')) * 1000,
                    showBattery: formData.get('showBattery') === 'on',
                    showMemory: formData.get('showMemory') === 'on',
                    showNetwork: formData.get('showNetwork') === 'on'
                };

                setConfig(newConfig);
                ui.closeModal('widget-settings-modal');
            });
        });
    }

    /**
     * Create settings form
     */
    function createSettingsForm() {
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="system-refresh">Refresh Interval</label>
                <select id="system-refresh" name="refreshInterval" class="input">
                    <option value="1" ${config.refreshInterval === 1000 ? 'selected' : ''}>1 second</option>
                    <option value="5" ${config.refreshInterval === 5000 ? 'selected' : ''}>5 seconds</option>
                    <option value="10" ${config.refreshInterval === 10000 ? 'selected' : ''}>10 seconds</option>
                    <option value="30" ${config.refreshInterval === 30000 ? 'selected' : ''}>30 seconds</option>
                </select>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showMemory" ${config.showMemory ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Memory Usage
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showBattery" ${config.showBattery ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Battery Status
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="showNetwork" ${config.showNetwork ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Show Network Status
                </label>
            </div>
        `;
        return form;
    }

    /**
     * Set widget configuration
     */
    function setConfig(newConfig) {
        const oldConfig = { ...config };
        config = { ...config, ...newConfig };
        
        if (oldConfig.refreshInterval !== config.refreshInterval) {
            stopRefreshTimer();
            startRefreshTimer();
        }
        
        updateDisplay();
        emitConfigChange();
    }

    /**
     * Get current configuration
     */
    function getConfig() {
        return { ...config };
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
     * Destroy widget
     */
    function destroy() {
        destroyed = true;
        stopRefreshTimer();
        
        if (element) {
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