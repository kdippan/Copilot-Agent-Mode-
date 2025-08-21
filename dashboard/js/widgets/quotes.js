/**
 * Quotes Widget
 * Displays inspirational quotes with categories
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Quotes',
        category: 'inspirational',
        autoRefresh: false,
        refreshInterval: 300000 // 5 minutes
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let currentQuote = null;
    let refreshInterval = null;
    let destroyed = false;

    // Sample quotes database
    const quotes = {
        inspirational: [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
            { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" }
        ],
        motivational: [
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { text: "Your limitation—it's only your imagination.", author: "Unknown" },
            { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" }
        ],
        technology: [
            { text: "Technology is a word that describes something that doesn't work yet.", author: "Douglas Adams" },
            { text: "The computer was born to solve problems that did not exist before.", author: "Bill Gates" },
            { text: "Technology is best when it brings people together.", author: "Matt Mullenweg" },
            { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
            { text: "The real problem is not whether machines think but whether men do.", author: "B.F. Skinner" }
        ]
    };

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'quotes-widget';
        
        loadRandomQuote();
        updateDisplay();
        
        if (config.autoRefresh) {
            startAutoRefresh();
        }
        
        return element;
    }

    /**
     * Load random quote
     */
    function loadRandomQuote() {
        const categoryQuotes = quotes[config.category] || quotes.inspirational;
        const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
        currentQuote = categoryQuotes[randomIndex];
    }

    /**
     * Update display
     */
    function updateDisplay() {
        if (destroyed || !element || !currentQuote) return;

        element.innerHTML = `
            <div class="quote-text">"${currentQuote.text}"</div>
            <div class="quote-author">— ${currentQuote.author}</div>
            
            <div class="quote-controls">
                <button type="button" class="secondary-button" onclick="this.closest('.quotes-widget')._widget.newQuote()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#refresh"></use>
                    </svg>
                    New Quote
                </button>
                <button type="button" class="secondary-button" onclick="this.closest('.quotes-widget')._widget.copyQuote()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#copy"></use>
                    </svg>
                    Copy
                </button>
                <button type="button" class="secondary-button" onclick="this.closest('.quotes-widget')._widget.openSettings()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#settings"></use>
                    </svg>
                </button>
            </div>
        `;

        // Store widget instance
        element._widget = {
            newQuote,
            copyQuote,
            openSettings
        };
    }

    /**
     * Get new quote
     */
    function newQuote() {
        loadRandomQuote();
        updateDisplay();
        
        // Add animation
        element.classList.add('animate-fadeIn');
        setTimeout(() => {
            element.classList.remove('animate-fadeIn');
        }, 500);
    }

    /**
     * Copy quote to clipboard
     */
    async function copyQuote() {
        if (!currentQuote) return;

        const text = `"${currentQuote.text}" — ${currentQuote.author}`;
        
        try {
            await navigator.clipboard.writeText(text);
            
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Quote copied to clipboard', {
                    type: 'success',
                    duration: 2000
                });
            });
        } catch (error) {
            console.error('Failed to copy quote:', error);
            
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Failed to copy quote', {
                    type: 'error',
                    duration: 2000
                });
            });
        }
    }

    /**
     * Open settings
     */
    function openSettings() {
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            
            ui.showModal('widget-settings-modal', {
                title: 'Quote Settings',
                content: settingsForm
            });

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    category: formData.get('category'),
                    autoRefresh: formData.get('autoRefresh') === 'on',
                    refreshInterval: parseInt(formData.get('refreshInterval')) * 60000
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
                <label class="form-label" for="quote-category">Category</label>
                <select id="quote-category" name="category" class="input">
                    <option value="inspirational" ${config.category === 'inspirational' ? 'selected' : ''}>Inspirational</option>
                    <option value="motivational" ${config.category === 'motivational' ? 'selected' : ''}>Motivational</option>
                    <option value="technology" ${config.category === 'technology' ? 'selected' : ''}>Technology</option>
                </select>
            </div>

            <div class="form-group">
                <label class="checkbox">
                    <input type="checkbox" name="autoRefresh" ${config.autoRefresh ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Auto-refresh quotes
                </label>
            </div>

            <div class="form-group">
                <label class="form-label" for="quote-refresh-interval">Refresh Interval (minutes)</label>
                <select id="quote-refresh-interval" name="refreshInterval" class="input">
                    <option value="5" ${config.refreshInterval === 300000 ? 'selected' : ''}>5 minutes</option>
                    <option value="10" ${config.refreshInterval === 600000 ? 'selected' : ''}>10 minutes</option>
                    <option value="30" ${config.refreshInterval === 1800000 ? 'selected' : ''}>30 minutes</option>
                    <option value="60" ${config.refreshInterval === 3600000 ? 'selected' : ''}>1 hour</option>
                </select>
            </div>
        `;
        return form;
    }

    /**
     * Start auto refresh
     */
    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        refreshInterval = setInterval(() => {
            newQuote();
        }, config.refreshInterval);
    }

    /**
     * Stop auto refresh
     */
    function stopAutoRefresh() {
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
        
        // Handle category change
        if (oldConfig.category !== config.category) {
            loadRandomQuote();
        }
        
        // Handle auto-refresh changes
        if (oldConfig.autoRefresh !== config.autoRefresh || 
            oldConfig.refreshInterval !== config.refreshInterval) {
            stopAutoRefresh();
            if (config.autoRefresh) {
                startAutoRefresh();
            }
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
        stopAutoRefresh();
        
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