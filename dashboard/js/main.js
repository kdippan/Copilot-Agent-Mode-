/**
 * Main Application
 * Bootstraps the dashboard application and handles global interactions
 */

import state from './state.js';
import ui from './ui.js';
import GridManager from './grid.js';

class DashboardApp {
    constructor() {
        this.grid = null;
        this.currentTheme = 'system';
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize theme
            this.initTheme();
            
            // Initialize grid manager
            this.initGrid();
            
            // Setup global event listeners
            this.setupEventListeners();
            
            // Setup widget library
            this.setupWidgetLibrary();
            
            // Render initial widgets
            this.grid.renderAllWidgets();
            
            // Show page load animation
            document.body.classList.add('page-enter');
            
            console.log('Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            ui.showToast('Failed to initialize dashboard', { 
                type: 'error', 
                persistent: true 
            });
        }
    }

    /**
     * Initialize theme system
     */
    initTheme() {
        const { theme } = state.getState();
        this.setTheme(theme);
        
        // Listen for theme changes
        state.subscribe('theme-changed', (data) => {
            this.setTheme(data.theme);
        });
    }

    /**
     * Set application theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
        this.currentTheme = theme;
        
        // Remove existing theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        // Apply theme
        if (theme !== 'system') {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
        
        // Update theme toggle button
        this.updateThemeToggle();
    }

    /**
     * Update theme toggle button
     */
    updateThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            themeToggle.setAttribute('aria-label', `Switch to ${this.getNextTheme(currentTheme)} theme`);
        }
    }

    /**
     * Get next theme in cycle
     * @param {string} currentTheme - Current theme
     * @returns {string} Next theme
     */
    getNextTheme(currentTheme) {
        const themes = ['light', 'dark', 'amoled'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        return themes[nextIndex];
    }

    /**
     * Initialize grid manager
     */
    initGrid() {
        const gridContainer = document.getElementById('grid-container');
        if (!gridContainer) {
            throw new Error('Grid container not found');
        }

        this.grid = new GridManager(gridContainer, state);
        
        // Listen for grid events
        document.addEventListener('grid:widget-settings', (e) => {
            this.openWidgetSettings(e.detail.widgetId);
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.cycleTheme();
            });
        }

        // Add widget button
        const addWidgetBtn = document.getElementById('add-widget-btn');
        if (addWidgetBtn) {
            addWidgetBtn.addEventListener('click', () => {
                this.showAddWidgetModal();
            });
        }

        // Menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ui.showAppMenu(menuBtn);
            });
        }

        // App menu actions
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAppMenuAction(action);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('widget-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Widget configuration changes
        document.addEventListener('widget-config-changed', (e) => {
            const widgetElement = e.target.closest('.widget');
            if (widgetElement) {
                const widgetId = widgetElement.dataset.widgetId;
                const newConfig = e.detail.config;
                state.updateWidget(widgetId, { config: newConfig });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.setTheme('system');
            }
        });
    }

    /**
     * Cycle through themes
     */
    cycleTheme() {
        const themes = ['light', 'dark', 'amoled', 'system'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        state.setTheme(nextTheme);
        
        // Show toast
        ui.showToast(`Switched to ${nextTheme} theme`, { 
            type: 'info', 
            duration: 2000 
        });
    }

    /**
     * Show add widget modal
     */
    showAddWidgetModal() {
        ui.showModal('add-widget-modal');
    }

    /**
     * Setup widget library
     */
    setupWidgetLibrary() {
        const widgetLibrary = document.getElementById('widget-library');
        if (!widgetLibrary) return;

        const widgetTypes = [
            {
                type: 'clock',
                title: 'Clock',
                description: 'Digital and analog clock with timezone support',
                icon: 'clock'
            },
            {
                type: 'weather',
                title: 'Weather',
                description: 'Current weather conditions and forecast',
                icon: 'cloud'
            },
            {
                type: 'notes',
                title: 'Notes',
                description: 'Rich text note-taking with autosave',
                icon: 'notes'
            },
            {
                type: 'todo',
                title: 'Todo List',
                description: 'Task management with filters and priorities',
                icon: 'check'
            },
            {
                type: 'pomodoro',
                title: 'Pomodoro Timer',
                description: 'Focus timer with work and break cycles',
                icon: 'clock'
            },
            {
                type: 'calendar',
                title: 'Calendar',
                description: 'Mini calendar with event management',
                icon: 'calendar'
            },
            {
                type: 'quotes',
                title: 'Quotes',
                description: 'Inspirational quotes with categories',
                icon: 'quote'
            },
            {
                type: 'stocks',
                title: 'Stocks',
                description: 'Stock prices with charts and trends',
                icon: 'chart'
            },
            {
                type: 'links',
                title: 'Quick Links',
                description: 'Bookmarks and favorite websites',
                icon: 'link'
            },
            {
                type: 'system',
                title: 'System Monitor',
                description: 'System performance and resource usage',
                icon: 'monitor'
            }
        ];

        widgetLibrary.innerHTML = widgetTypes.map(widget => `
            <div class="widget-option" data-widget-type="${widget.type}">
                <svg class="widget-option-icon" aria-hidden="true">
                    <use href="assets/icons.svg#${widget.icon}"></use>
                </svg>
                <h3 class="widget-option-title">${widget.title}</h3>
                <p class="widget-option-description">${widget.description}</p>
            </div>
        `).join('');

        // Add click handlers
        widgetLibrary.addEventListener('click', (e) => {
            const option = e.target.closest('.widget-option');
            if (option) {
                const widgetType = option.dataset.widgetType;
                this.addWidget(widgetType);
                ui.closeModal('add-widget-modal');
            }
        });
    }

    /**
     * Add new widget
     * @param {string} type - Widget type
     */
    addWidget(type) {
        const widget = state.addWidget({
            type,
            config: { title: this.getWidgetTitle(type) }
        });

        // Show success toast
        ui.showToast(`${widget.config.title} widget added`, { 
            type: 'success', 
            duration: 3000 
        });
    }

    /**
     * Get default widget title
     * @param {string} type - Widget type
     * @returns {string} Default title
     */
    getWidgetTitle(type) {
        const titles = {
            clock: 'Clock',
            weather: 'Weather',
            notes: 'Notes',
            todo: 'Todo List',
            pomodoro: 'Pomodoro Timer',
            calendar: 'Calendar',
            quotes: 'Quotes',
            stocks: 'Stocks',
            links: 'Quick Links',
            system: 'System Monitor'
        };
        return titles[type] || type;
    }

    /**
     * Open widget settings
     * @param {string} widgetId - Widget ID
     */
    openWidgetSettings(widgetId) {
        const widget = state.getState().widgets.find(w => w.id === widgetId);
        if (!widget) return;

        // Create generic settings form
        const settingsForm = this.createGenericSettingsForm(widget);
        
        ui.showModal('widget-settings-modal', {
            title: `${widget.config.title || widget.type} Settings`,
            content: settingsForm
        });

        // Handle form submission
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(settingsForm);
            
            const newConfig = {
                ...widget.config,
                title: formData.get('title')
            };

            state.updateWidget(widgetId, { config: newConfig });
            ui.closeModal('widget-settings-modal');
            
            ui.showToast('Settings saved', { type: 'success', duration: 2000 });
        });
    }

    /**
     * Create generic settings form
     * @param {Object} widget - Widget data
     * @returns {Element} Settings form
     */
    createGenericSettingsForm(widget) {
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="widget-title">Widget Title</label>
                <input type="text" id="widget-title" name="title" class="input" value="${widget.config.title || ''}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Widget Type</label>
                <input type="text" class="input" value="${widget.type}" readonly disabled>
            </div>
            
            <div class="form-group">
                <label class="form-label">Widget ID</label>
                <input type="text" class="input" value="${widget.id}" readonly disabled>
            </div>
        `;
        return form;
    }

    /**
     * Handle app menu actions
     * @param {string} action - Action type
     */
    handleAppMenuAction(action) {
        switch (action) {
            case 'export':
                this.exportLayout();
                break;
            case 'import':
                this.showImportDialog();
                break;
            case 'reset':
                this.resetLayout();
                break;
        }
        
        ui.hideAppMenu();
    }

    /**
     * Export layout
     */
    exportLayout() {
        try {
            const layout = state.exportLayout();
            const blob = new Blob([JSON.stringify(layout, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-layout-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            ui.showToast('Layout exported successfully', { 
                type: 'success', 
                duration: 3000 
            });
        } catch (error) {
            console.error('Failed to export layout:', error);
            ui.showToast('Failed to export layout', { 
                type: 'error', 
                duration: 3000 
            });
        }
    }

    /**
     * Show import dialog
     */
    showImportDialog() {
        const input = document.getElementById('import-input');
        if (!input) return;

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layout = JSON.parse(e.target.result);
                    this.importLayout(layout);
                } catch (error) {
                    console.error('Failed to parse layout file:', error);
                    ui.showToast('Invalid layout file', { 
                        type: 'error', 
                        duration: 3000 
                    });
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Import layout
     * @param {Object} layout - Layout data
     */
    importLayout(layout) {
        if (confirm('This will replace your current layout. Continue?')) {
            const success = state.importLayout(layout);
            if (success) {
                this.grid.renderAllWidgets();
                ui.showToast('Layout imported successfully', { 
                    type: 'success', 
                    duration: 3000 
                });
            } else {
                ui.showToast('Failed to import layout', { 
                    type: 'error', 
                    duration: 3000 
                });
            }
        }
    }

    /**
     * Reset layout
     */
    resetLayout() {
        if (confirm('This will reset your dashboard to the default layout. Continue?')) {
            state.resetToDefault();
            this.grid.renderAllWidgets();
            ui.showToast('Layout reset to default', { 
                type: 'success', 
                duration: 3000 
            });
        }
    }

    /**
     * Handle search
     * @param {string} query - Search query
     */
    handleSearch(query) {
        const widgets = document.querySelectorAll('.widget');
        const lowerQuery = query.toLowerCase();

        widgets.forEach(widget => {
            const title = widget.querySelector('.widget-title')?.textContent.toLowerCase() || '';
            const type = widget.dataset.widgetType?.toLowerCase() || '';
            const matches = title.includes(lowerQuery) || type.includes(lowerQuery);
            
            widget.style.opacity = matches || !query ? '1' : '0.3';
        });
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N: Add new widget
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showAddWidgetModal();
        }

        // Ctrl/Cmd + E: Export layout
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.exportLayout();
        }

        // Ctrl/Cmd + I: Import layout
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            this.showImportDialog();
        }

        // Ctrl/Cmd + T: Toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            this.cycleTheme();
        }

        // F11: Toggle fullscreen (if supported)
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }
}

// Initialize the application
const app = new DashboardApp();

// Export for debugging
window.dashboard = {
    app,
    state,
    ui
};