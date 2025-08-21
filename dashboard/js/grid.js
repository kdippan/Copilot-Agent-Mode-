/**
 * Grid System and Drag/Drop
 * Handles widget positioning, dragging, resizing, and grid snapping
 */

class GridManager {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.dragGhost = document.getElementById('drag-ghost');
        
        // Drag state
        this.isDragging = false;
        this.isResizing = false;
        this.dragData = null;
        this.resizeData = null;
        
        // Grid settings
        this.gridSettings = {
            cols: 12,
            rowHeight: 60,
            gap: 8
        };
        
        this.init();
    }

    /**
     * Initialize grid manager
     */
    init() {
        this.updateGridSettings();
        this.setupEventListeners();
        this.setupKeyboardHandlers();
        
        // Listen for state changes
        this.state.subscribe('widget-added', (widget) => {
            this.renderWidget(widget);
        });
        
        this.state.subscribe('widget-removed', (widget) => {
            this.removeWidgetElement(widget.id);
        });
        
        this.state.subscribe('widget-updated', (data) => {
            this.updateWidgetElement(data.widget);
        });
    }

    /**
     * Update grid settings from state
     */
    updateGridSettings() {
        const { grid } = this.state.getState();
        this.gridSettings = { ...grid };
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--grid-cols', this.gridSettings.cols);
        document.documentElement.style.setProperty('--grid-gap', `${this.gridSettings.gap}px`);
        document.documentElement.style.setProperty('--grid-row-height', `${this.gridSettings.rowHeight}px`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Pointer events for drag/resize
        this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        document.addEventListener('pointermove', this.handlePointerMove.bind(this));
        document.addEventListener('pointerup', this.handlePointerUp.bind(this));
        
        // Context menu
        this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Prevent default drag on images and other elements
        this.container.addEventListener('dragstart', (e) => e.preventDefault());
    }

    /**
     * Setup keyboard handlers for accessibility
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            const activeWidget = document.activeElement?.closest('.widget');
            if (!activeWidget) return;

            const widgetId = activeWidget.dataset.widgetId;
            const widget = this.state.getState().widgets.find(w => w.id === widgetId);
            if (!widget) return;

            let handled = false;
            const step = e.shiftKey ? 1 : 1; // Can be adjusted for different step sizes

            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) {
                        // Resize
                        if (widget.w > 1) {
                            this.state.resizeWidget(widgetId, { w: widget.w - step });
                            handled = true;
                        }
                    } else {
                        // Move
                        if (widget.x > 0) {
                            this.state.moveWidget(widgetId, { x: widget.x - step });
                            handled = true;
                        }
                    }
                    break;
                    
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        // Resize
                        if (widget.x + widget.w + step <= this.gridSettings.cols) {
                            this.state.resizeWidget(widgetId, { w: widget.w + step });
                            handled = true;
                        }
                    } else {
                        // Move
                        if (widget.x + widget.w < this.gridSettings.cols) {
                            this.state.moveWidget(widgetId, { x: widget.x + step });
                            handled = true;
                        }
                    }
                    break;
                    
                case 'ArrowUp':
                    if (e.ctrlKey || e.metaKey) {
                        // Resize
                        if (widget.h > 1) {
                            this.state.resizeWidget(widgetId, { h: widget.h - step });
                            handled = true;
                        }
                    } else {
                        // Move
                        if (widget.y > 0) {
                            this.state.moveWidget(widgetId, { y: widget.y - step });
                            handled = true;
                        }
                    }
                    break;
                    
                case 'ArrowDown':
                    if (e.ctrlKey || e.metaKey) {
                        // Resize
                        this.state.resizeWidget(widgetId, { h: widget.h + step });
                        handled = true;
                    } else {
                        // Move
                        this.state.moveWidget(widgetId, { y: widget.y + step });
                        handled = true;
                    }
                    break;
                    
                case 'Delete':
                case 'Backspace':
                    if (e.shiftKey) {
                        this.state.removeWidget(widgetId);
                        handled = true;
                    }
                    break;
            }

            if (handled) {
                e.preventDefault();
            }
        });
    }

    /**
     * Handle pointer down events
     * @param {PointerEvent} e - Pointer event
     */
    handlePointerDown(e) {
        // Ignore if already dragging/resizing
        if (this.isDragging || this.isResizing) return;
        
        const widget = e.target.closest('.widget');
        if (!widget) return;

        const resizeHandle = e.target.closest('.resize-handle');
        
        if (resizeHandle) {
            this.startResize(e, widget, resizeHandle);
        } else if (e.target.closest('.widget-header') || e.target === widget) {
            this.startDrag(e, widget);
        }
    }

    /**
     * Handle pointer move events
     * @param {PointerEvent} e - Pointer event
     */
    handlePointerMove(e) {
        if (this.isDragging) {
            this.updateDrag(e);
        } else if (this.isResizing) {
            this.updateResize(e);
        }
    }

    /**
     * Handle pointer up events
     * @param {PointerEvent} e - Pointer event
     */
    handlePointerUp(e) {
        if (this.isDragging) {
            this.endDrag(e);
        } else if (this.isResizing) {
            this.endResize(e);
        }
    }

    /**
     * Start dragging a widget
     * @param {PointerEvent} e - Pointer event
     * @param {Element} widget - Widget element
     */
    startDrag(e, widget) {
        const widgetId = widget.dataset.widgetId;
        const widgetData = this.state.getState().widgets.find(w => w.id === widgetId);
        if (!widgetData) return;

        // Set pointer capture
        widget.setPointerCapture(e.pointerId);
        
        this.isDragging = true;
        this.dragData = {
            widgetId,
            widget: widgetData,
            element: widget,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - widget.getBoundingClientRect().left,
            offsetY: e.clientY - widget.getBoundingClientRect().top,
            originalPosition: { x: widgetData.x, y: widgetData.y }
        };

        // Add dragging class
        widget.classList.add('dragging');
        widget.style.zIndex = 1000;
        
        // Show drag ghost
        this.showDragGhost(widgetData);
        
        // Emit drag start event
        this.emit('drag-start', { widget: widgetData });
    }

    /**
     * Update drag position
     * @param {PointerEvent} e - Pointer event
     */
    updateDrag(e) {
        if (!this.dragData) return;

        const { element, offsetX, offsetY } = this.dragData;
        
        // Update element position
        element.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;
        
        // Calculate grid position
        const gridPos = this.screenToGrid(e.clientX - offsetX, e.clientY - offsetY);
        
        // Validate position
        const validatedPos = this.validatePosition(
            gridPos.x, 
            gridPos.y, 
            this.dragData.widget.w, 
            this.dragData.widget.h,
            this.dragData.widgetId
        );
        
        // Update ghost position
        this.updateDragGhost(validatedPos.x, validatedPos.y, this.dragData.widget.w, this.dragData.widget.h);
    }

    /**
     * End dragging
     * @param {PointerEvent} e - Pointer event
     */
    endDrag(e) {
        if (!this.dragData) return;

        const { widgetId, element, originalPosition } = this.dragData;
        
        // Calculate final position
        const gridPos = this.screenToGrid(e.clientX - this.dragData.offsetX, e.clientY - this.dragData.offsetY);
        const finalPos = this.validatePosition(
            gridPos.x, 
            gridPos.y, 
            this.dragData.widget.w, 
            this.dragData.widget.h,
            widgetId
        );

        // Update widget position in state
        if (finalPos.x !== originalPosition.x || finalPos.y !== originalPosition.y) {
            this.state.moveWidget(widgetId, finalPos);
        }

        // Reset element styles
        element.classList.remove('dragging');
        element.style.transform = '';
        element.style.zIndex = '';
        
        // Hide drag ghost
        this.hideDragGhost();
        
        // Emit drag end event
        this.emit('drag-end', { 
            widget: this.dragData.widget, 
            position: finalPos,
            moved: finalPos.x !== originalPosition.x || finalPos.y !== originalPosition.y
        });
        
        // Clean up
        this.isDragging = false;
        this.dragData = null;
    }

    /**
     * Start resizing a widget
     * @param {PointerEvent} e - Pointer event
     * @param {Element} widget - Widget element
     * @param {Element} handle - Resize handle element
     */
    startResize(e, widget, handle) {
        const widgetId = widget.dataset.widgetId;
        const widgetData = this.state.getState().widgets.find(w => w.id === widgetId);
        if (!widgetData) return;

        // Set pointer capture
        handle.setPointerCapture(e.pointerId);
        
        this.isResizing = true;
        this.resizeData = {
            widgetId,
            widget: widgetData,
            element: widget,
            handle: handle.className.split(' ').find(c => c.startsWith('resize-handle-')),
            startX: e.clientX,
            startY: e.clientY,
            originalSize: { w: widgetData.w, h: widgetData.h },
            originalPosition: { x: widgetData.x, y: widgetData.y }
        };

        // Add resizing class
        widget.classList.add('resizing');
        
        // Emit resize start event
        this.emit('resize-start', { widget: widgetData });
    }

    /**
     * Update resize
     * @param {PointerEvent} e - Pointer event
     */
    updateResize(e) {
        if (!this.resizeData) return;

        const { widget, handle, startX, startY, originalSize, originalPosition } = this.resizeData;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Convert delta to grid units
        const deltaGridX = Math.round(deltaX / (this.getGridCellWidth() + this.gridSettings.gap));
        const deltaGridY = Math.round(deltaY / (this.gridSettings.rowHeight + this.gridSettings.gap));
        
        let newSize = { ...originalSize };
        let newPosition = { ...originalPosition };
        
        // Apply resize based on handle
        switch (handle) {
            case 'resize-handle-e':
                newSize.w = Math.max(1, originalSize.w + deltaGridX);
                break;
            case 'resize-handle-w':
                newSize.w = Math.max(1, originalSize.w - deltaGridX);
                newPosition.x = Math.max(0, originalPosition.x + deltaGridX);
                break;
            case 'resize-handle-s':
                newSize.h = Math.max(1, originalSize.h + deltaGridY);
                break;
            case 'resize-handle-n':
                newSize.h = Math.max(1, originalSize.h - deltaGridY);
                newPosition.y = Math.max(0, originalPosition.y + deltaGridY);
                break;
            case 'resize-handle-se':
                newSize.w = Math.max(1, originalSize.w + deltaGridX);
                newSize.h = Math.max(1, originalSize.h + deltaGridY);
                break;
            case 'resize-handle-sw':
                newSize.w = Math.max(1, originalSize.w - deltaGridX);
                newSize.h = Math.max(1, originalSize.h + deltaGridY);
                newPosition.x = Math.max(0, originalPosition.x + deltaGridX);
                break;
            case 'resize-handle-ne':
                newSize.w = Math.max(1, originalSize.w + deltaGridX);
                newSize.h = Math.max(1, originalSize.h - deltaGridY);
                newPosition.y = Math.max(0, originalPosition.y + deltaGridY);
                break;
            case 'resize-handle-nw':
                newSize.w = Math.max(1, originalSize.w - deltaGridX);
                newSize.h = Math.max(1, originalSize.h - deltaGridY);
                newPosition.x = Math.max(0, originalPosition.x + deltaGridX);
                newPosition.y = Math.max(0, originalPosition.y + deltaGridY);
                break;
        }
        
        // Validate size and position
        const validated = this.validateResize(newPosition.x, newPosition.y, newSize.w, newSize.h, this.resizeData.widgetId);
        
        // Apply preview styles
        this.previewResize(this.resizeData.element, validated);
    }

    /**
     * End resizing
     * @param {PointerEvent} e - Pointer event
     */
    endResize(e) {
        if (!this.resizeData) return;

        const { widgetId, element, originalSize, originalPosition } = this.resizeData;
        
        // Calculate final size and position from current preview
        const computedStyle = window.getComputedStyle(element);
        const gridColumn = computedStyle.gridColumnStart;
        const gridRow = computedStyle.gridRowStart;
        const gridColumnEnd = computedStyle.gridColumnEnd;
        const gridRowEnd = computedStyle.gridRowEnd;
        
        const finalPos = {
            x: parseInt(gridColumn) - 1,
            y: parseInt(gridRow) - 1,
            w: parseInt(gridColumnEnd) - parseInt(gridColumn),
            h: parseInt(gridRowEnd) - parseInt(gridRow)
        };

        // Update widget in state
        const hasChanged = finalPos.x !== originalPosition.x || 
                          finalPos.y !== originalPosition.y ||
                          finalPos.w !== originalSize.w || 
                          finalPos.h !== originalSize.h;
                          
        if (hasChanged) {
            this.state.updateWidget(widgetId, finalPos);
        }

        // Reset element styles
        element.classList.remove('resizing');
        element.style.gridColumn = '';
        element.style.gridRow = '';
        
        // Emit resize end event
        this.emit('resize-end', { 
            widget: this.resizeData.widget, 
            size: finalPos,
            changed: hasChanged
        });
        
        // Clean up
        this.isResizing = false;
        this.resizeData = null;
    }

    /**
     * Handle context menu
     * @param {Event} e - Context menu event
     */
    handleContextMenu(e) {
        const widget = e.target.closest('.widget');
        if (!widget) return;

        e.preventDefault();
        
        const widgetId = widget.dataset.widgetId;
        const menuItems = [
            {
                label: 'Settings',
                icon: 'settings',
                action: 'settings',
                handler: () => this.emit('widget-settings', { widgetId })
            },
            {
                label: 'Duplicate',
                icon: 'copy',
                action: 'duplicate',
                handler: () => this.state.duplicateWidget(widgetId)
            },
            { separator: true },
            {
                label: 'Remove',
                icon: 'trash',
                action: 'remove',
                handler: () => this.state.removeWidget(widgetId)
            }
        ];

        // Import UI manager
        import('./ui.js').then(({ default: ui }) => {
            ui.showContextMenu(e, menuItems);
        });
    }

    /**
     * Render a widget element
     * @param {Object} widget - Widget data
     */
    renderWidget(widget) {
        const element = document.createElement('div');
        element.className = 'widget';
        element.dataset.widgetId = widget.id;
        element.dataset.widgetType = widget.type;
        element.tabIndex = 0;
        element.setAttribute('role', 'region');
        element.setAttribute('aria-label', `${widget.config.title || widget.type} widget`);
        
        // Set grid position
        this.updateWidgetPosition(element, widget);
        
        // Add widget structure
        element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${widget.config.title || widget.type}</h3>
                <div class="widget-actions">
                    <button type="button" class="icon-button" title="Minimize" data-action="minimize">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#minimize"></use>
                        </svg>
                    </button>
                    <button type="button" class="icon-button" title="Settings" data-action="settings">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#settings"></use>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="widget-content">
                <div class="loading">Loading ${widget.type}...</div>
            </div>
            ${this.createResizeHandles()}
        `;
        
        // Add event listeners
        this.setupWidgetEventListeners(element, widget);
        
        // Add to container
        this.container.appendChild(element);
        
        // Load widget content
        this.loadWidgetContent(element, widget);
    }

    /**
     * Create resize handles HTML
     * @returns {string} Resize handles HTML
     */
    createResizeHandles() {
        return `
            <div class="resize-handle resize-handle-n"></div>
            <div class="resize-handle resize-handle-e"></div>
            <div class="resize-handle resize-handle-s"></div>
            <div class="resize-handle resize-handle-w"></div>
            <div class="resize-handle resize-handle-nw"></div>
            <div class="resize-handle resize-handle-ne"></div>
            <div class="resize-handle resize-handle-sw"></div>
            <div class="resize-handle resize-handle-se"></div>
        `;
    }

    /**
     * Setup widget event listeners
     * @param {Element} element - Widget element
     * @param {Object} widget - Widget data
     */
    setupWidgetEventListeners(element, widget) {
        // Handle widget actions
        element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleWidgetAction(action, widget.id, element);
            }
        });
    }

    /**
     * Handle widget actions
     * @param {string} action - Action type
     * @param {string} widgetId - Widget ID
     * @param {Element} element - Widget element
     */
    handleWidgetAction(action, widgetId, element) {
        switch (action) {
            case 'minimize':
                this.state.updateWidget(widgetId, { 
                    minimized: !this.state.getState().widgets.find(w => w.id === widgetId).minimized 
                });
                break;
            case 'settings':
                this.emit('widget-settings', { widgetId });
                break;
        }
    }

    /**
     * Load widget content
     * @param {Element} element - Widget element
     * @param {Object} widget - Widget data
     */
    async loadWidgetContent(element, widget) {
        try {
            // Import widget module
            const widgetModule = await import(`./widgets/${widget.type}.js`);
            const widgetInstance = widgetModule.createWidget(widget.config);
            
            // Replace loading content
            const contentElement = element.querySelector('.widget-content');
            contentElement.innerHTML = '';
            contentElement.appendChild(widgetInstance.el);
            
            // Store widget instance for cleanup
            element._widgetInstance = widgetInstance;
            
        } catch (error) {
            console.error(`Failed to load widget ${widget.type}:`, error);
            const contentElement = element.querySelector('.widget-content');
            contentElement.innerHTML = `<div class="error">Failed to load ${widget.type}</div>`;
        }
    }

    /**
     * Update widget element
     * @param {Object} widget - Updated widget data
     */
    updateWidgetElement(widget) {
        const element = this.container.querySelector(`[data-widget-id="${widget.id}"]`);
        if (!element) return;

        // Update position
        this.updateWidgetPosition(element, widget);
        
        // Update title
        const titleElement = element.querySelector('.widget-title');
        if (titleElement) {
            titleElement.textContent = widget.config.title || widget.type;
        }
        
        // Update minimized state
        element.classList.toggle('minimized', widget.minimized);
        
        // Update widget instance if it exists
        if (element._widgetInstance && element._widgetInstance.setConfig) {
            element._widgetInstance.setConfig(widget.config);
        }
    }

    /**
     * Update widget position in DOM
     * @param {Element} element - Widget element
     * @param {Object} widget - Widget data
     */
    updateWidgetPosition(element, widget) {
        element.style.gridColumn = `${widget.x + 1} / span ${widget.w}`;
        element.style.gridRow = `${widget.y + 1} / span ${widget.h}`;
    }

    /**
     * Remove widget element
     * @param {string} widgetId - Widget ID
     */
    removeWidgetElement(widgetId) {
        const element = this.container.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!element) return;

        // Cleanup widget instance
        if (element._widgetInstance && element._widgetInstance.destroy) {
            element._widgetInstance.destroy();
        }

        // Animate out
        element.classList.add('widget-exit');
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }

    /**
     * Convert screen coordinates to grid position
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Grid position {x, y}
     */
    screenToGrid(screenX, screenY) {
        const containerRect = this.container.getBoundingClientRect();
        const relativeX = screenX - containerRect.left;
        const relativeY = screenY - containerRect.top;
        
        const cellWidth = this.getGridCellWidth();
        const cellHeight = this.gridSettings.rowHeight;
        
        const x = Math.round(relativeX / (cellWidth + this.gridSettings.gap));
        const y = Math.round(relativeY / (cellHeight + this.gridSettings.gap));
        
        return { x: Math.max(0, x), y: Math.max(0, y) };
    }

    /**
     * Get grid cell width
     * @returns {number} Cell width in pixels
     */
    getGridCellWidth() {
        const containerWidth = this.container.clientWidth;
        const totalGap = this.gridSettings.gap * (this.gridSettings.cols - 1);
        return (containerWidth - totalGap) / this.gridSettings.cols;
    }

    /**
     * Validate widget position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} excludeId - Widget ID to exclude from collision check
     * @returns {Object} Validated position
     */
    validatePosition(x, y, w, h, excludeId = null) {
        // Ensure within bounds
        x = Math.max(0, Math.min(x, this.gridSettings.cols - w));
        y = Math.max(0, y);
        
        // Check for collisions
        const widgets = this.state.getState().widgets.filter(widget => widget.id !== excludeId);
        
        let validPosition = { x, y };
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            const hasCollision = widgets.some(widget => 
                this.rectsIntersect(
                    validPosition.x, validPosition.y, w, h,
                    widget.x, widget.y, widget.w, widget.h
                )
            );
            
            if (!hasCollision) {
                break;
            }
            
            // Try next position
            validPosition.y++;
            attempts++;
        }
        
        return validPosition;
    }

    /**
     * Validate widget resize
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} excludeId - Widget ID to exclude from collision check
     * @returns {Object} Validated size and position
     */
    validateResize(x, y, w, h, excludeId = null) {
        // Ensure minimum size
        w = Math.max(1, w);
        h = Math.max(1, h);
        
        // Ensure within bounds
        x = Math.max(0, Math.min(x, this.gridSettings.cols - w));
        y = Math.max(0, y);
        
        return { x, y, w, h };
    }

    /**
     * Check if two rectangles intersect
     * @param {number} x1 - Rectangle 1 X
     * @param {number} y1 - Rectangle 1 Y
     * @param {number} w1 - Rectangle 1 width
     * @param {number} h1 - Rectangle 1 height
     * @param {number} x2 - Rectangle 2 X
     * @param {number} y2 - Rectangle 2 Y
     * @param {number} w2 - Rectangle 2 width
     * @param {number} h2 - Rectangle 2 height
     * @returns {boolean} True if rectangles intersect
     */
    rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
    }

    /**
     * Show drag ghost
     * @param {Object} widget - Widget data
     */
    showDragGhost(widget) {
        this.dragGhost.style.display = 'block';
        this.updateDragGhost(widget.x, widget.y, widget.w, widget.h);
    }

    /**
     * Update drag ghost position
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} w - Grid width
     * @param {number} h - Grid height
     */
    updateDragGhost(x, y, w, h) {
        this.dragGhost.style.gridColumn = `${x + 1} / span ${w}`;
        this.dragGhost.style.gridRow = `${y + 1} / span ${h}`;
    }

    /**
     * Hide drag ghost
     */
    hideDragGhost() {
        this.dragGhost.style.display = 'none';
    }

    /**
     * Preview resize styles
     * @param {Element} element - Widget element
     * @param {Object} size - Size and position {x, y, w, h}
     */
    previewResize(element, size) {
        element.style.gridColumn = `${size.x + 1} / span ${size.w}`;
        element.style.gridRow = `${size.y + 1} / span ${size.h}`;
    }

    /**
     * Render all widgets from state
     */
    renderAllWidgets() {
        // Clear container
        this.container.innerHTML = '<div id="drag-ghost" class="drag-ghost" aria-hidden="true"></div>';
        this.dragGhost = this.container.querySelector('#drag-ghost');
        
        // Render each widget
        const { widgets } = this.state.getState();
        widgets.forEach(widget => {
            this.renderWidget(widget);
        });
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail data
     */
    emit(eventName, detail) {
        document.dispatchEvent(new CustomEvent(`grid:${eventName}`, { detail }));
    }
}

export default GridManager;