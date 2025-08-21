/**
 * State Management System
 * Handles application state, persistence, and pub/sub events
 */

class StateManager {
    constructor() {
        this.state = this.getDefaultState();
        this.listeners = new Map();
        this.debounceTimeout = null;
        
        // Load saved state
        this.loadState();
        
        // Auto-save state changes
        this.subscribe('*', () => {
            this.debouncedSave();
        });
    }

    /**
     * Get default application state
     */
    getDefaultState() {
        return {
            grid: {
                cols: 12,
                rowHeight: 60,
                gap: 8
            },
            widgets: this.getDefaultWidgets(),
            theme: 'system',
            settings: {
                autoSave: true,
                animations: true,
                notifications: true
            },
            version: '1.0.0'
        };
    }

    /**
     * Get default widget layout
     */
    getDefaultWidgets() {
        return [
            // Row 1
            { 
                id: 'clock-1', 
                type: 'clock', 
                x: 0, y: 0, w: 3, h: 2, 
                minimized: false,
                config: { 
                    title: 'Clock',
                    format: '24h',
                    showAnalog: false,
                    timezone: 'local'
                }
            },
            { 
                id: 'weather-1', 
                type: 'weather', 
                x: 3, y: 0, w: 3, h: 2,
                minimized: false,
                config: { 
                    title: 'Weather',
                    city: 'New York',
                    units: 'metric'
                }
            },
            { 
                id: 'pomodoro-1', 
                type: 'pomodoro', 
                x: 6, y: 0, w: 3, h: 2,
                minimized: false,
                config: { 
                    title: 'Pomodoro',
                    workDuration: 25,
                    breakDuration: 5
                }
            },
            { 
                id: 'todo-1', 
                type: 'todo', 
                x: 9, y: 0, w: 3, h: 2,
                minimized: false,
                config: { 
                    title: 'Todo List'
                }
            },
            
            // Row 2
            { 
                id: 'calendar-1', 
                type: 'calendar', 
                x: 0, y: 2, w: 4, h: 3,
                minimized: false,
                config: { 
                    title: 'Calendar'
                }
            },
            { 
                id: 'notes-1', 
                type: 'notes', 
                x: 4, y: 2, w: 4, h: 3,
                minimized: false,
                config: { 
                    title: 'Notes'
                }
            },
            { 
                id: 'stocks-1', 
                type: 'stocks', 
                x: 8, y: 2, w: 4, h: 3,
                minimized: false,
                config: { 
                    title: 'Stocks',
                    symbol: 'AAPL'
                }
            },
            
            // Row 3
            { 
                id: 'links-1', 
                type: 'links', 
                x: 0, y: 5, w: 6, h: 2,
                minimized: false,
                config: { 
                    title: 'Quick Links'
                }
            },
            { 
                id: 'quotes-1', 
                type: 'quotes', 
                x: 6, y: 5, w: 3, h: 2,
                minimized: false,
                config: { 
                    title: 'Quotes'
                }
            },
            { 
                id: 'system-1', 
                type: 'system', 
                x: 9, y: 5, w: 3, h: 2,
                minimized: false,
                config: { 
                    title: 'System'
                }
            }
        ];
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     * @param {string} event - Event name or '*' for all events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.delete(callback);
                if (eventListeners.size === 0) {
                    this.listeners.delete(event);
                }
            }
        };
    }

    /**
     * Emit state change event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        // Emit specific event
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(data, event));
        }

        // Emit wildcard event
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => callback(data, event));
        }
    }

    /**
     * Add a new widget
     * @param {Object} widgetData - Widget configuration
     */
    addWidget(widgetData) {
        const widget = {
            id: this.generateWidgetId(widgetData.type),
            ...widgetData,
            x: widgetData.x || 0,
            y: widgetData.y || 0,
            w: widgetData.w || 3,
            h: widgetData.h || 2,
            minimized: false
        };

        // Find empty position if not specified
        if (!widgetData.x && !widgetData.y) {
            const position = this.findEmptyPosition(widget.w, widget.h);
            widget.x = position.x;
            widget.y = position.y;
        }

        this.state.widgets.push(widget);
        this.emit('widget-added', widget);
        return widget;
    }

    /**
     * Update widget configuration
     * @param {string} widgetId - Widget ID
     * @param {Object} updates - Updates to apply
     */
    updateWidget(widgetId, updates) {
        const widgetIndex = this.state.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) return false;

        const oldWidget = { ...this.state.widgets[widgetIndex] };
        this.state.widgets[widgetIndex] = { ...oldWidget, ...updates };
        
        this.emit('widget-updated', {
            widget: this.state.widgets[widgetIndex],
            old: oldWidget,
            updates
        });
        
        return true;
    }

    /**
     * Move widget to new position
     * @param {string} widgetId - Widget ID
     * @param {Object} position - New position {x, y, w, h}
     */
    moveWidget(widgetId, position) {
        return this.updateWidget(widgetId, position);
    }

    /**
     * Resize widget
     * @param {string} widgetId - Widget ID
     * @param {Object} size - New size {w, h}
     */
    resizeWidget(widgetId, size) {
        return this.updateWidget(widgetId, size);
    }

    /**
     * Remove widget
     * @param {string} widgetId - Widget ID
     */
    removeWidget(widgetId) {
        const widgetIndex = this.state.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) return false;

        const widget = this.state.widgets[widgetIndex];
        this.state.widgets.splice(widgetIndex, 1);
        this.emit('widget-removed', widget);
        return true;
    }

    /**
     * Duplicate widget
     * @param {string} widgetId - Widget ID to duplicate
     */
    duplicateWidget(widgetId) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget) return null;

        const duplicate = {
            ...widget,
            id: this.generateWidgetId(widget.type),
            x: widget.x + widget.w,
            y: widget.y
        };

        // Adjust position if it goes out of bounds
        if (duplicate.x + duplicate.w > this.state.grid.cols) {
            const position = this.findEmptyPosition(duplicate.w, duplicate.h);
            duplicate.x = position.x;
            duplicate.y = position.y;
        }

        this.state.widgets.push(duplicate);
        this.emit('widget-added', duplicate);
        return duplicate;
    }

    /**
     * Set theme
     * @param {string} theme - Theme name ('light', 'dark', 'amoled', 'system')
     */
    setTheme(theme) {
        const oldTheme = this.state.theme;
        this.state.theme = theme;
        this.emit('theme-changed', { theme, oldTheme });
    }

    /**
     * Update settings
     * @param {Object} settings - Settings to update
     */
    updateSettings(settings) {
        const oldSettings = { ...this.state.settings };
        this.state.settings = { ...this.state.settings, ...settings };
        this.emit('settings-updated', { settings: this.state.settings, old: oldSettings });
    }

    /**
     * Import layout from JSON
     * @param {Object} layoutData - Layout data to import
     */
    importLayout(layoutData) {
        try {
            // Validate layout data
            if (!layoutData.widgets || !Array.isArray(layoutData.widgets)) {
                throw new Error('Invalid layout data: missing widgets array');
            }

            // Backup current state
            const backup = { ...this.state };

            // Apply imported layout
            this.state = {
                ...this.state,
                ...layoutData,
                widgets: layoutData.widgets.map(widget => ({
                    ...widget,
                    id: widget.id || this.generateWidgetId(widget.type)
                }))
            };

            this.emit('layout-imported', { layout: layoutData, backup });
            return true;
        } catch (error) {
            console.error('Failed to import layout:', error);
            this.emit('import-error', error);
            return false;
        }
    }

    /**
     * Export current layout as JSON
     * @returns {Object} Layout data
     */
    exportLayout() {
        const layout = {
            grid: this.state.grid,
            widgets: this.state.widgets,
            theme: this.state.theme,
            settings: this.state.settings,
            version: this.state.version,
            exportedAt: new Date().toISOString()
        };

        this.emit('layout-exported', layout);
        return layout;
    }

    /**
     * Reset to default layout
     */
    resetToDefault() {
        const backup = { ...this.state };
        this.state = this.getDefaultState();
        this.emit('layout-reset', { backup });
        this.saveState();
    }

    /**
     * Find empty position for widget
     * @param {number} width - Widget width
     * @param {number} height - Widget height
     * @returns {Object} Position {x, y}
     */
    findEmptyPosition(width, height) {
        const { cols } = this.state.grid;
        
        // Create grid map
        const gridMap = new Map();
        this.state.widgets.forEach(widget => {
            for (let x = widget.x; x < widget.x + widget.w; x++) {
                for (let y = widget.y; y < widget.y + widget.h; y++) {
                    gridMap.set(`${x}-${y}`, true);
                }
            }
        });

        // Find empty position
        for (let y = 0; y < 100; y++) { // Max 100 rows
            for (let x = 0; x <= cols - width; x++) {
                let canPlace = true;
                
                // Check if area is free
                for (let dx = 0; dx < width && canPlace; dx++) {
                    for (let dy = 0; dy < height && canPlace; dy++) {
                        if (gridMap.has(`${x + dx}-${y + dy}`)) {
                            canPlace = false;
                        }
                    }
                }
                
                if (canPlace) {
                    return { x, y };
                }
            }
        }

        // Fallback to bottom
        const maxY = Math.max(...this.state.widgets.map(w => w.y + w.h), 0);
        return { x: 0, y: maxY };
    }

    /**
     * Generate unique widget ID
     * @param {string} type - Widget type
     * @returns {string} Unique ID
     */
    generateWidgetId(type) {
        const existingIds = this.state.widgets.map(w => w.id);
        let counter = 1;
        let id = `${type}-${counter}`;
        
        while (existingIds.includes(id)) {
            counter++;
            id = `${type}-${counter}`;
        }
        
        return id;
    }

    /**
     * Save state to localStorage with debouncing
     */
    debouncedSave() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.debounceTimeout = setTimeout(() => {
            this.saveState();
        }, 500);
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            const stateToSave = {
                ...this.state,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('dashboard-state', JSON.stringify(stateToSave));
            this.emit('state-saved', stateToSave);
        } catch (error) {
            console.error('Failed to save state:', error);
            this.emit('save-error', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem('dashboard-state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                
                // Validate loaded state
                if (parsed.widgets && Array.isArray(parsed.widgets)) {
                    this.state = {
                        ...this.state,
                        ...parsed,
                        widgets: parsed.widgets.map(widget => ({
                            ...widget,
                            id: widget.id || this.generateWidgetId(widget.type)
                        }))
                    };
                    
                    this.emit('state-loaded', this.state);
                }
            }
        } catch (error) {
            console.error('Failed to load state:', error);
            this.emit('load-error', error);
        }
    }

    /**
     * Clear all saved data
     */
    clearState() {
        try {
            localStorage.removeItem('dashboard-state');
            this.state = this.getDefaultState();
            this.emit('state-cleared');
        } catch (error) {
            console.error('Failed to clear state:', error);
            this.emit('clear-error', error);
        }
    }
}

// Create and export global state manager instance
const state = new StateManager();

export default state;