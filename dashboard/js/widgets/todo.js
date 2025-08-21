/**
 * Todo Widget
 * Task management with add, check, delete, filters, and reordering
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Todo List',
        tasks: [],
        filter: 'all' // 'all', 'active', 'completed'
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'todo-widget';
        
        updateDisplay();
        
        return element;
    }

    /**
     * Update todo display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        const filteredTasks = getFilteredTasks();
        const stats = getTaskStats();

        element.innerHTML = `
            <div class="todo-header">
                <div class="todo-add">
                    <input 
                        type="text" 
                        class="todo-input" 
                        placeholder="Add a new task..."
                        aria-label="New task"
                        maxlength="200"
                    >
                    <button type="button" class="primary-button" data-action="add">
                        <svg aria-hidden="true">
                            <use href="assets/icons.svg#plus"></use>
                        </svg>
                    </button>
                </div>
                
                <div class="todo-filters">
                    <button type="button" class="todo-filter ${config.filter === 'all' ? 'active' : ''}" data-filter="all">
                        All (${stats.total})
                    </button>
                    <button type="button" class="todo-filter ${config.filter === 'active' ? 'active' : ''}" data-filter="active">
                        Active (${stats.active})
                    </button>
                    <button type="button" class="todo-filter ${config.filter === 'completed' ? 'active' : ''}" data-filter="completed">
                        Done (${stats.completed})
                    </button>
                </div>
            </div>
            
            <div class="todo-list" role="list">
                ${filteredTasks.length === 0 ? 
                    `<div class="empty-state">
                        ${config.filter === 'all' ? 'No tasks yet' : 
                          config.filter === 'active' ? 'No active tasks' : 'No completed tasks'}
                    </div>` :
                    filteredTasks.map(task => createTaskElement(task)).join('')
                }
            </div>
            
            ${stats.total > 0 ? `
                <div class="todo-stats">
                    ${stats.completed} of ${stats.total} tasks completed
                    ${stats.completed > 0 ? `
                        <button type="button" class="ghost-button" data-action="clear-completed">
                            Clear completed
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        `;

        setupEventListeners();
    }

    /**
     * Create task element HTML
     * @param {Object} task - Task object
     * @returns {string} Task HTML
     */
    function createTaskElement(task) {
        return `
            <div class="todo-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" role="listitem">
                <div class="todo-checkbox ${task.completed ? 'checked' : ''}" 
                     role="checkbox" 
                     aria-checked="${task.completed}"
                     tabindex="0"
                     data-action="toggle"
                     aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
                </div>
                <div class="todo-text" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</div>
                <button type="button" class="todo-delete" data-action="delete" aria-label="Delete task">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#trash"></use>
                    </svg>
                </button>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (!element) return;

        // Add task
        const input = element.querySelector('.todo-input');
        const addBtn = element.querySelector('[data-action="add"]');
        
        if (input && addBtn) {
            const handleAdd = () => {
                const text = input.value.trim();
                if (text) {
                    addTask(text);
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

        // Filter buttons
        element.querySelectorAll('.todo-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                setFilter(btn.dataset.filter);
            });
        });

        // Task actions
        element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            const taskItem = e.target.closest('.todo-item');
            
            if (action && taskItem) {
                const taskId = taskItem.dataset.taskId;
                
                switch (action) {
                    case 'toggle':
                        toggleTask(taskId);
                        break;
                    case 'delete':
                        deleteTask(taskId);
                        break;
                }
            } else if (action === 'clear-completed') {
                clearCompleted();
            }
        });

        // Keyboard navigation for checkboxes
        element.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action === 'toggle') {
                    e.preventDefault();
                    const taskItem = e.target.closest('.todo-item');
                    if (taskItem) {
                        toggleTask(taskItem.dataset.taskId);
                    }
                }
            }
        });

        // Drag and drop for reordering
        setupDragAndDrop();
    }

    /**
     * Setup drag and drop for task reordering
     */
    function setupDragAndDrop() {
        const todoList = element.querySelector('.todo-list');
        if (!todoList) return;

        let draggedTask = null;

        todoList.addEventListener('dragstart', (e) => {
            const taskItem = e.target.closest('.todo-item');
            if (taskItem) {
                draggedTask = taskItem;
                taskItem.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        todoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        todoList.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedTask) return;

            const targetItem = e.target.closest('.todo-item');
            if (targetItem && targetItem !== draggedTask) {
                const draggedId = draggedTask.dataset.taskId;
                const targetId = targetItem.dataset.taskId;
                reorderTask(draggedId, targetId);
            }
        });

        todoList.addEventListener('dragend', () => {
            if (draggedTask) {
                draggedTask.style.opacity = '';
                draggedTask = null;
            }
        });

        // Make task items draggable
        todoList.querySelectorAll('.todo-item').forEach(item => {
            item.draggable = true;
        });
    }

    /**
     * Add new task
     * @param {string} text - Task text
     */
    function addTask(text) {
        const task = {
            id: generateId(),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        config.tasks.push(task);
        updateDisplay();
        emitConfigChange();
        
        // Show success toast
        import('../ui.js').then(({ default: ui }) => {
            ui.showToast('Task added', { type: 'success', duration: 2000 });
        });
    }

    /**
     * Toggle task completion
     * @param {string} taskId - Task ID
     */
    function toggleTask(taskId) {
        const task = config.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            updateDisplay();
            emitConfigChange();
        }
    }

    /**
     * Delete task
     * @param {string} taskId - Task ID
     */
    function deleteTask(taskId) {
        const taskIndex = config.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            config.tasks.splice(taskIndex, 1);
            updateDisplay();
            emitConfigChange();
            
            // Show success toast
            import('../ui.js').then(({ default: ui }) => {
                ui.showToast('Task deleted', { type: 'success', duration: 2000 });
            });
        }
    }

    /**
     * Clear all completed tasks
     */
    function clearCompleted() {
        const completedCount = config.tasks.filter(t => t.completed).length;
        config.tasks = config.tasks.filter(t => !t.completed);
        updateDisplay();
        emitConfigChange();
        
        // Show success toast
        import('../ui.js').then(({ default: ui }) => {
            ui.showToast(`${completedCount} completed tasks cleared`, { 
                type: 'success', 
                duration: 3000 
            });
        });
    }

    /**
     * Reorder task
     * @param {string} draggedId - ID of dragged task
     * @param {string} targetId - ID of target task
     */
    function reorderTask(draggedId, targetId) {
        const draggedIndex = config.tasks.findIndex(t => t.id === draggedId);
        const targetIndex = config.tasks.findIndex(t => t.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedTask] = config.tasks.splice(draggedIndex, 1);
            config.tasks.splice(targetIndex, 0, draggedTask);
            updateDisplay();
            emitConfigChange();
        }
    }

    /**
     * Set filter
     * @param {string} filter - Filter type ('all', 'active', 'completed')
     */
    function setFilter(filter) {
        config.filter = filter;
        updateDisplay();
        emitConfigChange();
    }

    /**
     * Get filtered tasks
     * @returns {Array} Filtered tasks
     */
    function getFilteredTasks() {
        switch (config.filter) {
            case 'active':
                return config.tasks.filter(t => !t.completed);
            case 'completed':
                return config.tasks.filter(t => t.completed);
            default:
                return config.tasks;
        }
    }

    /**
     * Get task statistics
     * @returns {Object} Task stats
     */
    function getTaskStats() {
        const total = config.tasks.length;
        const completed = config.tasks.filter(t => t.completed).length;
        const active = total - completed;
        
        return { total, completed, active };
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Escape HTML
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Emit configuration change event
     */
    function emitConfigChange() {
        if (element) {
            element.dispatchEvent(new CustomEvent('widget-config-changed', {
                detail: { config },
                bubbles: true
            }));
        }
    }

    /**
     * Set widget configuration
     * @param {Object} newConfig - New configuration
     */
    function setConfig(newConfig) {
        config = { ...config, ...newConfig };
        updateDisplay();
        emitConfigChange();
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    function getConfig() {
        return { ...config };
    }

    /**
     * Destroy widget and cleanup
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