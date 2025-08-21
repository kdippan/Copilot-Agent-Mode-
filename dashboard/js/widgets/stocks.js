/**
 * Stocks Widget
 * Simple stock price display with mock data
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Stocks',
        symbol: 'AAPL',
        refreshInterval: 60000 // 1 minute
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let refreshInterval = null;
    let destroyed = false;

    // Mock stock data
    const mockStocks = {
        'AAPL': { name: 'Apple Inc.', price: 175.25, change: 2.15, changePercent: 1.24 },
        'GOOGL': { name: 'Alphabet Inc.', price: 2750.50, change: -15.75, changePercent: -0.57 },
        'MSFT': { name: 'Microsoft Corp.', price: 335.80, change: 5.60, changePercent: 1.70 },
        'AMZN': { name: 'Amazon.com Inc.', price: 3245.25, change: 45.30, changePercent: 1.42 },
        'TSLA': { name: 'Tesla Inc.', price: 875.90, change: -12.15, changePercent: -1.37 }
    };

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'stocks-widget';
        
        updateDisplay();
        startRefreshTimer();
        
        return element;
    }

    /**
     * Update display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        const stockData = getStockData();
        if (!stockData) {
            element.innerHTML = `
                <div class="error">
                    Stock symbol "${config.symbol}" not found
                    <button type="button" class="secondary-button" onclick="this.closest('.stocks-widget')._widget.openSettings()">
                        Change Symbol
                    </button>
                </div>
            `;
            return;
        }

        const isPositive = stockData.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';

        element.innerHTML = `
            <div class="stocks-header">
                <div class="stock-symbol">${config.symbol}</div>
                <button type="button" class="icon-button" onclick="this.closest('.stocks-widget')._widget.openSettings()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#settings"></use>
                    </svg>
                </button>
            </div>
            
            <div class="stock-price ${changeClass}">$${stockData.price.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                ${isPositive ? '+' : ''}${stockData.change.toFixed(2)} (${isPositive ? '+' : ''}${stockData.changePercent.toFixed(2)}%)
            </div>
            
            <canvas class="stock-chart" width="200" height="60" aria-label="Stock price chart"></canvas>
            
            <div class="stock-details">
                <div class="stock-detail">
                    <span>High</span>
                    <span>$${(stockData.price + Math.random() * 10).toFixed(2)}</span>
                </div>
                <div class="stock-detail">
                    <span>Low</span>
                    <span>$${(stockData.price - Math.random() * 10).toFixed(2)}</span>
                </div>
                <div class="stock-detail">
                    <span>Volume</span>
                    <span>${(Math.random() * 1000 + 100).toFixed(0)}M</span>
                </div>
                <div class="stock-detail">
                    <span>Mkt Cap</span>
                    <span>${(Math.random() * 1000 + 500).toFixed(0)}B</span>
                </div>
            </div>
        `;

        // Store widget instance
        element._widget = {
            openSettings,
            refresh: updateDisplay
        };

        // Draw simple chart
        drawChart(stockData);
    }

    /**
     * Get stock data (mock)
     */
    function getStockData() {
        const stock = mockStocks[config.symbol.toUpperCase()];
        if (!stock) return null;

        // Add some random variation to simulate live data
        const variation = (Math.random() - 0.5) * 2;
        return {
            ...stock,
            price: stock.price + variation,
            change: stock.change + (variation * 0.5),
            changePercent: stock.changePercent + (variation * 0.1)
        };
    }

    /**
     * Draw simple chart
     */
    function drawChart(stockData) {
        const canvas = element.querySelector('.stock-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Generate sample data points
        const points = [];
        const basePrice = stockData.price;
        
        for (let i = 0; i < 20; i++) {
            const variation = (Math.random() - 0.5) * (basePrice * 0.05);
            points.push(basePrice + variation);
        }

        // Find min/max for scaling
        const minPrice = Math.min(...points);
        const maxPrice = Math.max(...points);
        const priceRange = maxPrice - minPrice || 1;

        // Draw line chart
        ctx.strokeStyle = stockData.change >= 0 ? '#10b981' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();

        points.forEach((price, index) => {
            const x = (index / (points.length - 1)) * width;
            const y = height - ((price - minPrice) / priceRange) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Fill area under line
        ctx.fillStyle = stockData.change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Open settings
     */
    function openSettings() {
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            
            ui.showModal('widget-settings-modal', {
                title: 'Stock Settings',
                content: settingsForm
            });

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    symbol: formData.get('symbol').toUpperCase(),
                    refreshInterval: parseInt(formData.get('refreshInterval')) * 1000
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
                <label class="form-label" for="stock-symbol">Stock Symbol</label>
                <select id="stock-symbol" name="symbol" class="input">
                    <option value="AAPL" ${config.symbol === 'AAPL' ? 'selected' : ''}>AAPL - Apple Inc.</option>
                    <option value="GOOGL" ${config.symbol === 'GOOGL' ? 'selected' : ''}>GOOGL - Alphabet Inc.</option>
                    <option value="MSFT" ${config.symbol === 'MSFT' ? 'selected' : ''}>MSFT - Microsoft Corp.</option>
                    <option value="AMZN" ${config.symbol === 'AMZN' ? 'selected' : ''}>AMZN - Amazon.com Inc.</option>
                    <option value="TSLA" ${config.symbol === 'TSLA' ? 'selected' : ''}>TSLA - Tesla Inc.</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label" for="stock-refresh">Refresh Interval</label>
                <select id="stock-refresh" name="refreshInterval" class="input">
                    <option value="30" ${config.refreshInterval === 30000 ? 'selected' : ''}>30 seconds</option>
                    <option value="60" ${config.refreshInterval === 60000 ? 'selected' : ''}>1 minute</option>
                    <option value="300" ${config.refreshInterval === 300000 ? 'selected' : ''}>5 minutes</option>
                    <option value="900" ${config.refreshInterval === 900000 ? 'selected' : ''}>15 minutes</option>
                </select>
            </div>
        `;
        return form;
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