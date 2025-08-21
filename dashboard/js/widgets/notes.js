/**
 * Notes Widget
 * Rich text note-taking with autosave functionality
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Notes',
        content: '',
        autosave: true,
        autosaveDelay: 1000 // 1 second
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let editor = null;
    let autosaveTimeout = null;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'notes-widget';
        
        updateDisplay();
        
        return element;
    }

    /**
     * Update notes display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        element.innerHTML = `
            <div class="notes-toolbar">
                <button type="button" class="icon-button" data-action="bold" title="Bold" aria-label="Bold">
                    <strong>B</strong>
                </button>
                <button type="button" class="icon-button" data-action="italic" title="Italic" aria-label="Italic">
                    <em>I</em>
                </button>
                <button type="button" class="icon-button" data-action="underline" title="Underline" aria-label="Underline">
                    <u>U</u>
                </button>
                <div class="toolbar-separator"></div>
                <button type="button" class="icon-button" data-action="insertUnorderedList" title="Bullet List" aria-label="Bullet List">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#list"></use>
                    </svg>
                </button>
                <div class="toolbar-separator"></div>
                <button type="button" class="icon-button" data-action="clear" title="Clear All" aria-label="Clear All">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#trash"></use>
                    </svg>
                </button>
                <button type="button" class="icon-button" data-action="settings" title="Settings" aria-label="Settings">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#settings"></use>
                    </svg>
                </button>
            </div>
            <div 
                class="notes-editor" 
                contenteditable="true" 
                role="textbox"
                aria-multiline="true"
                aria-label="Notes editor"
                data-placeholder="Start typing your notes..."
            ></div>
        `;

        setupEditor();
        setupEventListeners();
    }

    /**
     * Setup editor
     */
    function setupEditor() {
        editor = element.querySelector('.notes-editor');
        if (!editor) return;

        // Set initial content
        editor.innerHTML = config.content || '';

        // Focus editor when empty and clicked
        if (!config.content) {
            editor.focus();
        }

        // Update placeholder visibility
        updatePlaceholder();
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (!element || !editor) return;

        // Toolbar actions
        element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                handleToolbarAction(action);
            }
        });

        // Editor input
        editor.addEventListener('input', () => {
            updatePlaceholder();
            if (config.autosave) {
                scheduleAutosave();
            }
        });

        // Editor paste
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Editor keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + B for bold
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                document.execCommand('bold');
            }
            
            // Ctrl/Cmd + I for italic
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                document.execCommand('italic');
            }
            
            // Ctrl/Cmd + U for underline
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                document.execCommand('underline');
            }

            // Ctrl/Cmd + S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveContent();
            }

            // Tab to indent (simple implementation)
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }
        });

        // Update toolbar state on selection change
        document.addEventListener('selectionchange', () => {
            if (editor && editor.contains(document.getSelection().anchorNode)) {
                updateToolbarState();
            }
        });
    }

    /**
     * Handle toolbar actions
     * @param {string} action - Action type
     */
    function handleToolbarAction(action) {
        if (!editor) return;

        switch (action) {
            case 'bold':
            case 'italic':
            case 'underline':
            case 'insertUnorderedList':
                document.execCommand(action);
                editor.focus();
                break;
                
            case 'clear':
                if (confirm('Are you sure you want to clear all notes?')) {
                    editor.innerHTML = '';
                    saveContent();
                    updatePlaceholder();
                    editor.focus();
                }
                break;
                
            case 'settings':
                openSettings();
                break;
        }

        updateToolbarState();
    }

    /**
     * Update toolbar button states
     */
    function updateToolbarState() {
        if (!element) return;

        // Update button active states
        const commands = ['bold', 'italic', 'underline', 'insertUnorderedList'];
        commands.forEach(command => {
            const button = element.querySelector(`[data-action="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });
    }

    /**
     * Update placeholder visibility
     */
    function updatePlaceholder() {
        if (!editor) return;

        const isEmpty = !editor.textContent.trim();
        editor.classList.toggle('empty', isEmpty);
    }

    /**
     * Schedule autosave
     */
    function scheduleAutosave() {
        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
        }

        autosaveTimeout = setTimeout(() => {
            saveContent();
        }, config.autosaveDelay);
    }

    /**
     * Save content
     */
    function saveContent() {
        if (!editor) return;

        const content = editor.innerHTML;
        if (config.content !== content) {
            config.content = content;
            emitConfigChange();
            
            // Show save indicator
            showSaveIndicator();
        }
    }

    /**
     * Show save indicator
     */
    function showSaveIndicator() {
        // Add a subtle save indicator
        const saveIndicator = document.createElement('div');
        saveIndicator.className = 'save-indicator';
        saveIndicator.textContent = 'Saved';
        saveIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--success);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
        `;

        element.appendChild(saveIndicator);
        
        // Animate in
        setTimeout(() => {
            saveIndicator.style.opacity = '1';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            saveIndicator.style.opacity = '0';
            setTimeout(() => {
                if (saveIndicator.parentNode) {
                    saveIndicator.parentNode.removeChild(saveIndicator);
                }
            }, 300);
        }, 2000);
    }

    /**
     * Open settings modal
     */
    function openSettings() {
        import('../ui.js').then(({ default: ui }) => {
            const settingsForm = createSettingsForm();
            ui.showModal('widget-settings-modal', {
                title: 'Notes Settings',
                content: settingsForm
            });

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                
                const newConfig = {
                    ...config,
                    autosave: formData.get('autosave') === 'on',
                    autosaveDelay: parseInt(formData.get('autosaveDelay'))
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
                <label class="checkbox">
                    <input type="checkbox" name="autosave" ${config.autosave ? 'checked' : ''}>
                    <span class="checkbox-indicator"></span>
                    Enable Autosave
                </label>
            </div>

            <div class="form-group">
                <label class="form-label" for="notes-autosave-delay">Autosave Delay (ms)</label>
                <select id="notes-autosave-delay" name="autosaveDelay" class="input">
                    <option value="500" ${config.autosaveDelay === 500 ? 'selected' : ''}>500ms</option>
                    <option value="1000" ${config.autosaveDelay === 1000 ? 'selected' : ''}>1 second</option>
                    <option value="2000" ${config.autosaveDelay === 2000 ? 'selected' : ''}>2 seconds</option>
                    <option value="5000" ${config.autosaveDelay === 5000 ? 'selected' : ''}>5 seconds</option>
                </select>
            </div>

            <div class="form-group">
                <button type="button" class="secondary-button" onclick="this.closest('.notes-widget').querySelector('.notes-editor').innerHTML = ''; this.closest('form').dispatchEvent(new Event('submit')); event.target.closest('dialog').querySelector('[data-action=close]').click();">
                    Clear All Notes
                </button>
            </div>

            <div class="form-group">
                <label class="form-label">Export Notes</label>
                <button type="button" class="secondary-button" onclick="this.closest('.notes-widget')._widget?.exportNotes()">
                    Download as Text
                </button>
            </div>
        `;
        return form;
    }

    /**
     * Export notes as text file
     */
    function exportNotes() {
        if (!editor) return;

        const textContent = editor.textContent || '';
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success toast
        import('../ui.js').then(({ default: ui }) => {
            ui.showToast('Notes exported', { type: 'success', duration: 2000 });
        });
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
        const oldContent = config.content;
        config = { ...config, ...newConfig };
        
        // Update content if changed
        if (editor && oldContent !== config.content) {
            editor.innerHTML = config.content;
            updatePlaceholder();
        }
        
        emitConfigChange();
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    function getConfig() {
        // Save current content before returning config
        if (editor) {
            config.content = editor.innerHTML;
        }
        return { ...config };
    }

    /**
     * Destroy widget and cleanup
     */
    function destroy() {
        destroyed = true;
        
        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
        }
        
        // Save content before destroying
        if (editor) {
            saveContent();
        }
        
        if (element) {
            element._widget = null;
            element = null;
        }
        
        editor = null;
    }

    // Initialize
    const el = createElement();
    
    // Store widget instance for external access
    el._widget = { exportNotes };

    return {
        el,
        getConfig,
        setConfig,
        destroy
    };
}