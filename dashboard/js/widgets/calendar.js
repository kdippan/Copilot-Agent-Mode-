/**
 * Calendar Widget
 * Mini calendar with month navigation and note taking
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Calendar',
        notes: {}, // { 'YYYY-MM-DD': 'note text' }
        firstDayOfWeek: 0 // 0 = Sunday, 1 = Monday
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let currentDate = new Date();
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'calendar-widget';
        
        updateDisplay();
        
        return element;
    }

    /**
     * Update calendar display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        element.innerHTML = `
            <div class="calendar-header">
                <h3 class="calendar-title">${monthName}</h3>
                <div class="calendar-nav">
                    <button type="button" class="icon-button" onclick="this.closest('.calendar-widget')._widget.previousMonth()" aria-label="Previous month">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#arrow-left"></use>
                        </svg>
                    </button>
                    <button type="button" class="icon-button" onclick="this.closest('.calendar-widget')._widget.nextMonth()" aria-label="Next month">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#arrow-right"></use>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="calendar-grid" role="grid" aria-label="Calendar">
                ${generateCalendarGrid(year, month)}
            </div>
        `;

        // Store widget instance
        element._widget = {
            previousMonth,
            nextMonth,
            addNote: (date) => addNote(date)
        };

        setupEventListeners();
    }

    /**
     * Generate calendar grid HTML
     */
    function generateCalendarGrid(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        const endDate = new Date(lastDay);
        
        // Adjust start date to beginning of week
        startDate.setDate(startDate.getDate() - ((startDate.getDay() - config.firstDayOfWeek + 7) % 7));
        
        // Adjust end date to end of week
        endDate.setDate(endDate.getDate() + (6 - ((endDate.getDay() - config.firstDayOfWeek + 7) % 7)));

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (config.firstDayOfWeek === 1) {
            dayNames.push(dayNames.shift()); // Move Sunday to end
        }

        let html = '';
        
        // Day headers
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header" role="columnheader">${day}</div>`;
        });

        // Calendar days
        const currentDateObj = new Date();
        const currentDateStr = formatDate(currentDateObj);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = formatDate(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = dateStr === currentDateStr;
            const hasNote = config.notes[dateStr];
            
            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            if (hasNote) classes += ' has-note';

            html += `
                <div class="${classes}" 
                     role="gridcell" 
                     data-date="${dateStr}"
                     tabindex="${isCurrentMonth ? '0' : '-1'}"
                     aria-label="${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${hasNote ? ' - has note' : ''}"
                     title="${hasNote ? `Note: ${config.notes[dateStr]}` : ''}">
                    ${date.getDate()}
                </div>
            `;
        }

        return html;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (!element) return;

        // Day click events
        element.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('other-month')) {
                const date = dayElement.dataset.date;
                handleDayClick(date, dayElement);
            }
        });

        // Keyboard navigation
        element.addEventListener('keydown', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (!dayElement) return;

            const currentDate = new Date(dayElement.dataset.date);
            let newDate = new Date(currentDate);

            switch (e.key) {
                case 'ArrowLeft':
                    newDate.setDate(newDate.getDate() - 1);
                    break;
                case 'ArrowRight':
                    newDate.setDate(newDate.getDate() + 1);
                    break;
                case 'ArrowUp':
                    newDate.setDate(newDate.getDate() - 7);
                    break;
                case 'ArrowDown':
                    newDate.setDate(newDate.getDate() + 7);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    handleDayClick(dayElement.dataset.date, dayElement);
                    return;
                default:
                    return;
            }

            e.preventDefault();
            focusDate(newDate);
        });
    }

    /**
     * Handle day click
     */
    function handleDayClick(dateStr, dayElement) {
        const existingNote = config.notes[dateStr];
        
        import('../ui.js').then(({ default: ui }) => {
            const noteForm = createNoteForm(dateStr, existingNote);
            
            ui.showModal('widget-settings-modal', {
                title: `Note for ${formatDateForDisplay(dateStr)}`,
                content: noteForm
            });

            noteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(noteForm);
                const noteText = formData.get('note').trim();
                
                if (noteText) {
                    config.notes[dateStr] = noteText;
                } else {
                    delete config.notes[dateStr];
                }
                
                updateDisplay();
                emitConfigChange();
                ui.closeModal('widget-settings-modal');
                
                ui.showToast(noteText ? 'Note saved' : 'Note deleted', {
                    type: 'success',
                    duration: 2000
                });
            });

            // Delete button handler
            const deleteBtn = noteForm.querySelector('[data-action="delete"]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    delete config.notes[dateStr];
                    updateDisplay();
                    emitConfigChange();
                    ui.closeModal('widget-settings-modal');
                    
                    ui.showToast('Note deleted', {
                        type: 'success',
                        duration: 2000
                    });
                });
            }
        });
    }

    /**
     * Create note form
     */
    function createNoteForm(dateStr, existingNote) {
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="calendar-note">Note</label>
                <textarea id="calendar-note" name="note" class="input" rows="4" placeholder="Add a note for this day...">${existingNote || ''}</textarea>
            </div>
            
            <div class="form-group">
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="primary-button">Save</button>
                    ${existingNote ? '<button type="button" class="secondary-button" data-action="delete">Delete</button>' : ''}
                </div>
            </div>
        `;
        return form;
    }

    /**
     * Previous month
     */
    function previousMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateDisplay();
    }

    /**
     * Next month
     */
    function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateDisplay();
    }

    /**
     * Focus specific date
     */
    function focusDate(date) {
        // If date is in different month, navigate to it
        if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
            currentDate = new Date(date);
            updateDisplay();
        }

        // Focus the date element
        setTimeout(() => {
            const dateStr = formatDate(date);
            const dayElement = element.querySelector(`[data-date="${dateStr}"]`);
            if (dayElement) {
                dayElement.focus();
            }
        }, 10);
    }

    /**
     * Format date as YYYY-MM-DD
     */
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Format date for display
     */
    function formatDateForDisplay(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    /**
     * Add note programmatically
     */
    function addNote(dateStr, note) {
        config.notes[dateStr] = note;
        updateDisplay();
        emitConfigChange();
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