/**
 * Links Widget
 * Quick bookmarks and favorite websites
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Quick Links',
        links: [
            { id: '1', title: 'Google', url: 'https://google.com', favicon: 'https://google.com/favicon.ico' },
            { id: '2', title: 'GitHub', url: 'https://github.com', favicon: 'https://github.com/favicon.ico' },
            { id: '3', title: 'YouTube', url: 'https://youtube.com', favicon: 'https://youtube.com/favicon.ico' }
        ]
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'links-widget';
        
        updateDisplay();
        
        return element;
    }

    /**
     * Update display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        element.innerHTML = `
            <div class="links-header">
                <div class="links-add">
                    <input type="text" class="links-input" placeholder="Add website URL..." aria-label="Website URL">
                    <button type="button" class="primary-button" data-action="add">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#plus"></use>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="links-list" role="list">
                ${config.links.length === 0 ? 
                    '<div class="empty-state">No links yet. Add your favorite websites above.</div>' :
                    config.links.map(link => createLinkElement(link)).join('')
                }
            </div>
        `;

        setupEventListeners();
    }

    /**
     * Create link element HTML
     */
    function createLinkElement(link) {
        return `
            <div class="link-item" data-link-id="${link.id}" role="listitem">
                <img class="link-favicon" src="${link.favicon}" alt="" onerror="this.style.display='none'">
                <div class="link-content">
                    <div class="link-title">${escapeHtml(link.title)}</div>
                    <div class="link-url">${escapeHtml(getDisplayUrl(link.url))}</div>
                </div>
                <div class="link-actions">
                    <button type="button" class="icon-button" data-action="edit" title="Edit link">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#settings"></use>
                        </svg>
                    </button>
                    <button type="button" class="icon-button" data-action="delete" title="Delete link">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#trash"></use>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (!element) return;

        // Add link
        const input = element.querySelector('.links-input');
        const addBtn = element.querySelector('[data-action="add"]');
        
        if (input && addBtn) {
            const handleAdd = () => {
                const url = input.value.trim();
                if (url) {
                    addLink(url);
                    input.value = '';
                }
            };

            addBtn.addEventListener('click', handleAdd);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAdd();
                }
            });
        }

        // Link clicks
        element.addEventListener('click', (e) => {
            const linkItem = e.target.closest('.link-item');
            if (!linkItem) return;

            const action = e.target.closest('[data-action]')?.dataset.action;
            const linkId = linkItem.dataset.linkId;
            
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                
                switch (action) {
                    case 'edit':
                        editLink(linkId);
                        break;
                    case 'delete':
                        deleteLink(linkId);
                        break;
                }
            } else {
                // Open link
                const link = config.links.find(l => l.id === linkId);
                if (link) {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                }
            }
        });

        // Drag and drop for reordering
        setupDragAndDrop();
    }

    /**
     * Setup drag and drop
     */
    function setupDragAndDrop() {
        const linksList = element.querySelector('.links-list');
        if (!linksList) return;

        let draggedLink = null;

        linksList.addEventListener('dragstart', (e) => {
            const linkItem = e.target.closest('.link-item');
            if (linkItem) {
                draggedLink = linkItem;
                linkItem.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        linksList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        linksList.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedLink) return;

            const targetItem = e.target.closest('.link-item');
            if (targetItem && targetItem !== draggedLink) {
                const draggedId = draggedLink.dataset.linkId;
                const targetId = targetItem.dataset.linkId;
                reorderLink(draggedId, targetId);
            }
        });

        linksList.addEventListener('dragend', () => {
            if (draggedLink) {
                draggedLink.style.opacity = '';
                draggedLink = null;
            }
        });

        // Make link items draggable
        linksList.querySelectorAll('.link-item').forEach(item => {
            item.draggable = true;
        });
    }

    /**
     * Add new link
     */
    function addLink(url) {
        try {
            const validUrl = normalizeUrl(url);
            const title = extractDomainName(validUrl);
            const favicon = `${new URL(validUrl).origin}/favicon.ico`;
            
            const link = {
                id: generateId(),
                title,
                url: validUrl,
                favicon
            };

            config.links.push(link);
            updateDisplay();
            emitConfigChange();
            
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Link added', { type: 'success', duration: 2000 });
            });
        } catch (error) {
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Invalid URL', { type: 'error', duration: 3000 });
            });
        }
    }

    /**
     * Edit link
     */
    function editLink(linkId) {
        const link = config.links.find(l => l.id === linkId);
        if (!link) return;

        import('../ui.js').then(({ default: ui }) => {
            const editForm = createEditForm(link);
            
            ui.showModal('widget-settings-modal', {
                title: 'Edit Link',
                content: editForm
            });

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(editForm);
                
                try {
                    const updatedLink = {
                        ...link,
                        title: formData.get('title'),
                        url: normalizeUrl(formData.get('url')),
                        favicon: formData.get('favicon') || `${new URL(formData.get('url')).origin}/favicon.ico`
                    };

                    const linkIndex = config.links.findIndex(l => l.id === linkId);
                    config.links[linkIndex] = updatedLink;
                    
                    updateDisplay();
                    emitConfigChange();
                    ui.closeModal('widget-settings-modal');
                    
                    ui.showToast('Link updated', { type: 'success', duration: 2000 });
                } catch (error) {
                    ui.showToast('Invalid URL', { type: 'error', duration: 3000 });
                }
            });
        });
    }

    /**
     * Create edit form
     */
    function createEditForm(link) {
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="link-title">Title</label>
                <input type="text" id="link-title" name="title" class="input" value="${escapeHtml(link.title)}" required>
            </div>

            <div class="form-group">
                <label class="form-label" for="link-url">URL</label>
                <input type="url" id="link-url" name="url" class="input" value="${escapeHtml(link.url)}" required>
            </div>

            <div class="form-group">
                <label class="form-label" for="link-favicon">Favicon URL (optional)</label>
                <input type="url" id="link-favicon" name="favicon" class="input" value="${escapeHtml(link.favicon)}">
            </div>
        `;
        return form;
    }

    /**
     * Delete link
     */
    function deleteLink(linkId) {
        const linkIndex = config.links.findIndex(l => l.id === linkId);
        if (linkIndex !== -1) {
            config.links.splice(linkIndex, 1);
            updateDisplay();
            emitConfigChange();
            
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Link deleted', { type: 'success', duration: 2000 });
            });
        }
    }

    /**
     * Reorder link
     */
    function reorderLink(draggedId, targetId) {
        const draggedIndex = config.links.findIndex(l => l.id === draggedId);
        const targetIndex = config.links.findIndex(l => l.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedLink] = config.links.splice(draggedIndex, 1);
            config.links.splice(targetIndex, 0, draggedLink);
            updateDisplay();
            emitConfigChange();
        }
    }

    /**
     * Normalize URL
     */
    function normalizeUrl(url) {
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        return new URL(url).href;
    }

    /**
     * Extract domain name from URL
     */
    function extractDomainName(url) {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    /**
     * Get display URL (shortened)
     */
    function getDisplayUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set widget configuration
     */
    function setConfig(newConfig) {
        config = { ...config, ...newConfig };
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
        element = null;
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