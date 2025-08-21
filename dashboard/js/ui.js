/**
 * UI Utilities
 * Handles modals, toasts, tooltips, and other UI interactions
 */

class UIManager {
    constructor() {
        this.activeModal = null;
        this.activeTooltip = null;
        this.toastContainer = null;
        this.contextMenu = null;
        this.appMenu = null;
        
        this.init();
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.toastContainer = document.getElementById('toast-container');
        this.contextMenu = document.getElementById('context-menu');
        this.appMenu = document.getElementById('app-menu');
        
        this.setupEventListeners();
        this.setupKeyboardHandlers();
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Close modals on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.matches('dialog')) {
                this.closeModal(e.target.id);
            }
        });

        // Close context menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Close app menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.appMenu.contains(e.target) && !e.target.closest('#menu-btn')) {
                this.hideAppMenu();
            }
        });

        // Handle modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="close"]')) {
                const modal = e.target.closest('dialog');
                if (modal) {
                    this.closeModal(modal.id);
                }
            }
        });
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // Close modal on Escape
            if (e.key === 'Escape') {
                if (this.activeModal) {
                    this.closeModal(this.activeModal);
                    e.preventDefault();
                }
                this.hideContextMenu();
                this.hideAppMenu();
                this.hideTooltip();
            }

            // Tab trapping for modals
            if (e.key === 'Tab' && this.activeModal) {
                this.trapFocus(e, this.activeModal);
            }
        });
    }

    /**
     * Show modal
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Close any existing modal
        if (this.activeModal) {
            this.closeModal(this.activeModal);
        }

        this.activeModal = modalId;
        
        // Set title if provided
        if (options.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = options.title;
            }
        }

        // Populate content if provided
        if (options.content) {
            const bodyElement = modal.querySelector('.modal-body');
            if (bodyElement) {
                if (typeof options.content === 'string') {
                    bodyElement.innerHTML = options.content;
                } else {
                    bodyElement.innerHTML = '';
                    bodyElement.appendChild(options.content);
                }
            }
        }

        // Show modal
        modal.showModal();
        modal.classList.add('modal-enter');
        
        // Focus first focusable element
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button, input, textarea, select, a[href]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);

        // Emit event
        this.emit('modal-opened', { modalId, modal, options });
    }

    /**
     * Close modal
     * @param {string} modalId - Modal element ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal || modal !== document.getElementById(this.activeModal)) return;

        modal.classList.add('modal-exit');
        
        setTimeout(() => {
            modal.close();
            modal.classList.remove('modal-enter', 'modal-exit');
            this.activeModal = null;
            
            // Emit event
            this.emit('modal-closed', { modalId, modal });
        }, 150);
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {Object} options - Toast options
     */
    showToast(message, options = {}) {
        const {
            type = 'info',
            title = '',
            duration = 4000,
            persistent = false,
            action = null
        } = options;

        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Get icon for toast type
        const iconName = this.getToastIcon(type);
        
        toast.innerHTML = `
            <svg class="toast-icon" aria-hidden="true">
                <use href="assets/icons.svg#${iconName}"></use>
            </svg>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${!persistent ? `
                <button type="button" class="toast-close" aria-label="Close notification">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#close"></use>
                    </svg>
                </button>
            ` : ''}
            ${!persistent ? '<div class="toast-progress"></div>' : ''}
        `;

        // Add action if provided
        if (action) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'toast-action';
            actionBtn.textContent = action.text;
            actionBtn.onclick = action.handler;
            toast.querySelector('.toast-content').appendChild(actionBtn);
        }

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideToast(toastId);
        }

        // Add to container
        this.toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto-hide if not persistent
        if (!persistent && duration > 0) {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transition = `width ${duration}ms linear`;
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 10);
            }

            setTimeout(() => {
                this.hideToast(toastId);
            }, duration);
        }

        // Emit event
        this.emit('toast-shown', { toastId, message, options });

        return toastId;
    }

    /**
     * Hide toast
     * @param {string} toastId - Toast element ID
     */
    hideToast(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        toast.classList.remove('show');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);

        // Emit event
        this.emit('toast-hidden', { toastId });
    }

    /**
     * Clear all toasts
     */
    clearToasts() {
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => {
            this.hideToast(toast.id);
        });
    }

    /**
     * Show context menu
     * @param {Event} event - Mouse event
     * @param {Array} items - Menu items
     */
    showContextMenu(event, items) {
        event.preventDefault();

        // Populate menu items
        this.contextMenu.innerHTML = items.map(item => {
            if (item.separator) {
                return '<hr class="menu-separator">';
            }
            
            return `
                <button type="button" class="context-menu-item" data-action="${item.action}">
                    ${item.icon ? `<svg aria-hidden="true"><use href="assets/icons.svg#${item.icon}"></use></svg>` : ''}
                    ${item.label}
                </button>
            `;
        }).join('');

        // Add click handlers
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                const item = items.find(i => i.action === action);
                if (item && item.handler) {
                    item.handler();
                }
                this.hideContextMenu();
            }
        });

        // Position menu
        const { clientX: x, clientY: y } = event;
        this.positionMenu(this.contextMenu, x, y);

        // Show menu
        this.contextMenu.classList.add('show');
        this.contextMenu.setAttribute('aria-hidden', 'false');

        // Focus first item
        setTimeout(() => {
            const firstItem = this.contextMenu.querySelector('.context-menu-item');
            if (firstItem) {
                firstItem.focus();
            }
        }, 10);
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        this.contextMenu.classList.remove('show');
        this.contextMenu.setAttribute('aria-hidden', 'true');
    }

    /**
     * Show app menu
     * @param {Element} trigger - Trigger element
     */
    showAppMenu(trigger) {
        // Position relative to trigger
        const rect = trigger.getBoundingClientRect();
        this.appMenu.style.top = `${rect.bottom + 8}px`;
        this.appMenu.style.right = `${window.innerWidth - rect.right}px`;

        // Show menu
        this.appMenu.classList.add('show');
        this.appMenu.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');

        // Focus first item
        setTimeout(() => {
            const firstItem = this.appMenu.querySelector('.menu-item');
            if (firstItem) {
                firstItem.focus();
            }
        }, 10);
    }

    /**
     * Hide app menu
     */
    hideAppMenu() {
        this.appMenu.classList.remove('show');
        this.appMenu.setAttribute('aria-hidden', 'true');
        
        const trigger = document.getElementById('menu-btn');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Show tooltip
     * @param {Element} element - Target element
     * @param {string} text - Tooltip text
     * @param {Object} options - Tooltip options
     */
    showTooltip(element, text, options = {}) {
        const { placement = 'top', delay = 500, duration = 0 } = options;

        // Remove existing tooltip
        this.hideTooltip();

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.id = 'active-tooltip';

        // Add to body
        document.body.appendChild(tooltip);

        // Position tooltip
        this.positionTooltip(tooltip, element, placement);

        // Show with delay
        setTimeout(() => {
            tooltip.classList.add('show');
            this.activeTooltip = tooltip;

            // Auto-hide if duration specified
            if (duration > 0) {
                setTimeout(() => {
                    this.hideTooltip();
                }, duration);
            }
        }, delay);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('show');
            setTimeout(() => {
                if (this.activeTooltip && this.activeTooltip.parentNode) {
                    this.activeTooltip.parentNode.removeChild(this.activeTooltip);
                }
                this.activeTooltip = null;
            }, 150);
        }
    }

    /**
     * Position menu relative to coordinates
     * @param {Element} menu - Menu element
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    positionMenu(menu, x, y) {
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x;
        let top = y;

        // Adjust if menu goes off-screen
        if (left + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 10;
        }
        if (top + menuRect.height > viewportHeight) {
            top = viewportHeight - menuRect.height - 10;
        }

        menu.style.left = `${Math.max(10, left)}px`;
        menu.style.top = `${Math.max(10, top)}px`;
    }

    /**
     * Position tooltip relative to element
     * @param {Element} tooltip - Tooltip element
     * @param {Element} target - Target element
     * @param {string} placement - Placement direction
     */
    positionTooltip(tooltip, target, placement) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let left, top;

        switch (placement) {
            case 'top':
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                top = targetRect.top - tooltipRect.height - 8;
                break;
            case 'bottom':
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                top = targetRect.bottom + 8;
                break;
            case 'left':
                left = targetRect.left - tooltipRect.width - 8;
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                break;
            case 'right':
                left = targetRect.right + 8;
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                break;
            default:
                left = targetRect.left;
                top = targetRect.top - tooltipRect.height - 8;
        }

        // Keep tooltip in viewport
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * Trap focus within modal
     * @param {Event} e - Keyboard event
     * @param {string} modalId - Modal ID
     */
    trapFocus(e, modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
            'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    /**
     * Get icon name for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon name
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail data
     */
    emit(eventName, detail) {
        document.dispatchEvent(new CustomEvent(`ui:${eventName}`, { detail }));
    }
}

// Create and export global UI manager instance
const ui = new UIManager();

export default ui;