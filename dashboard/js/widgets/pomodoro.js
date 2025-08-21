/**
 * Pomodoro Timer Widget
 * Focus timer with work/break cycles and notifications
 */

export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Pomodoro Timer',
        workDuration: 25, // minutes
        breakDuration: 5, // minutes
        longBreakDuration: 15, // minutes
        sessionsUntilLongBreak: 4,
        soundEnabled: true,
        notificationsEnabled: true
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;
    let timer = null;
    let timeRemaining = config.workDuration * 60; // seconds
    let isRunning = false;
    let currentSession = 'work'; // 'work', 'break', 'longbreak'
    let completedSessions = 0;
    let destroyed = false;

    /**
     * Create widget element
     */
    function createElement() {
        element = document.createElement('div');
        element.className = 'pomodoro-widget';
        
        updateDisplay();
        
        return element;
    }

    /**
     * Update display
     */
    function updateDisplay() {
        if (destroyed || !element) return;

        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const progress = getProgress();

        element.innerHTML = `
            <div class="pomodoro-timer" aria-live="polite">${timeString}</div>
            <div class="pomodoro-session">${getSessionLabel()} Session</div>
            
            <div class="pomodoro-progress">
                <div class="pomodoro-progress-bar" style="width: ${progress}%"></div>
            </div>
            
            <div class="pomodoro-controls">
                <button type="button" class="primary-button" onclick="this.closest('.pomodoro-widget')._widget.toggleTimer()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#${isRunning ? 'pause' : 'play'}"></use>
                    </svg>
                    ${isRunning ? 'Pause' : 'Start'}
                </button>
                <button type="button" class="secondary-button" onclick="this.closest('.pomodoro-widget')._widget.resetTimer()">
                    <svg aria-hidden="true">
                        <use href="assets/icons.svg#stop"></use>
                    </svg>
                    Reset
                </button>
                <button type="button" class="secondary-button" onclick="this.closest('.pomodoro-widget')._widget.skipSession()">
                    Skip
                </button>
            </div>
            
            <div class="pomodoro-stats">
                <div class="pomodoro-stat">
                    <div class="pomodoro-stat-value">${completedSessions}</div>
                    <div class="pomodoro-stat-label">Sessions</div>
                </div>
                <div class="pomodoro-stat">
                    <div class="pomodoro-stat-value">${Math.floor(completedSessions / config.sessionsUntilLongBreak)}</div>
                    <div class="pomodoro-stat-label">Cycles</div>
                </div>
            </div>
        `;

        // Store widget instance
        element._widget = {
            toggleTimer,
            resetTimer,
            skipSession
        };
    }

    /**
     * Get current session label
     */
    function getSessionLabel() {
        switch (currentSession) {
            case 'work': return 'Work';
            case 'break': return 'Break';
            case 'longbreak': return 'Long Break';
            default: return 'Work';
        }
    }

    /**
     * Get progress percentage
     */
    function getProgress() {
        const totalTime = getCurrentSessionDuration() * 60;
        return ((totalTime - timeRemaining) / totalTime) * 100;
    }

    /**
     * Get current session duration in minutes
     */
    function getCurrentSessionDuration() {
        switch (currentSession) {
            case 'work': return config.workDuration;
            case 'break': return config.breakDuration;
            case 'longbreak': return config.longBreakDuration;
            default: return config.workDuration;
        }
    }

    /**
     * Toggle timer start/pause
     */
    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    /**
     * Start timer
     */
    function startTimer() {
        if (destroyed) return;
        
        isRunning = true;
        timer = setInterval(() => {
            timeRemaining--;
            
            if (timeRemaining <= 0) {
                completeSession();
            }
            
            updateDisplay();
        }, 1000);
        
        updateDisplay();
        
        // Request notification permission
        if (config.notificationsEnabled && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * Pause timer
     */
    function pauseTimer() {
        isRunning = false;
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        updateDisplay();
    }

    /**
     * Reset timer
     */
    function resetTimer() {
        pauseTimer();
        timeRemaining = getCurrentSessionDuration() * 60;
        updateDisplay();
    }

    /**
     * Skip current session
     */
    function skipSession() {
        pauseTimer();
        completeSession();
    }

    /**
     * Complete current session
     */
    function completeSession() {
        pauseTimer();
        
        if (currentSession === 'work') {
            completedSessions++;
        }
        
        // Show notification
        showNotification();
        
        // Play sound
        if (config.soundEnabled) {
            playSound();
        }
        
        // Switch to next session
        switchToNextSession();
        
        // Show toast
        import('../ui.js').then(({ default: ui }) => {
            ui.showToast(`${getSessionLabel()} session completed!`, {
                type: 'success',
                duration: 3000
            });
        });
    }

    /**
     * Switch to next session
     */
    function switchToNextSession() {
        if (currentSession === 'work') {
            // Check if it's time for long break
            if (completedSessions % config.sessionsUntilLongBreak === 0) {
                currentSession = 'longbreak';
            } else {
                currentSession = 'break';
            }
        } else {
            currentSession = 'work';
        }
        
        timeRemaining = getCurrentSessionDuration() * 60;
        updateDisplay();
    }

    /**
     * Show notification
     */
    function showNotification() {
        if (!config.notificationsEnabled || Notification.permission !== 'granted') {
            return;
        }
        
        const title = 'Pomodoro Timer';
        const body = `${getSessionLabel()} session completed!`;
        const icon = 'assets/favicon.svg';
        
        const notification = new Notification(title, { body, icon });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    /**
     * Play completion sound
     */
    function playSound() {
        // Create a simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }

    /**
     * Set widget configuration
     */
    function setConfig(newConfig) {
        const wasRunning = isRunning;
        pauseTimer();
        
        config = { ...config, ...newConfig };
        
        // Reset timer if session duration changed
        if (!wasRunning) {
            timeRemaining = getCurrentSessionDuration() * 60;
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
        pauseTimer();
        
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