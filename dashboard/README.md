# Customizable Frontend Dashboard

A production-quality, single-page customizable dashboard built with pure HTML, CSS, and Vanilla JavaScript. Features drag-and-drop widgets, theming, persistence, and comprehensive accessibility support.

![Dashboard Screenshot](preview.png)

## Features

### 🎯 Core Features
- **Grid Layout**: Draggable, resizable widgets with 12-column grid snapping
- **Widget Management**: Add, remove, duplicate, and configure 10 different widgets
- **Persistence**: Automatic localStorage saving with import/export functionality
- **Theming**: Light, Dark, AMOLED, and System preference themes
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### ♿ Accessibility
- Full keyboard navigation support
- ARIA roles and labels throughout
- Focus management and tab trapping
- Screen reader compatibility
- High contrast mode support
- Reduced motion support

### 🎨 Animations & UX
- Smooth micro-interactions and hover effects
- Spring-like drag/drop animations
- Toast notifications with progress bars
- Ripple effects on button presses
- Glassmorphism effects (with fallbacks)

## Quick Start

1. **Clone or download** this repository
2. **Open** `dashboard/index.html` in your web browser
3. **Start customizing** your dashboard!

No build process or server required - just open and use!

## Available Widgets

### 🕐 Clock
- Digital and analog display modes
- Multiple timezone support
- 12/24 hour format toggle
- Date display option

### 🌤️ Weather
- Current conditions and temperature
- Multiple cities and units
- Humidity, wind, and pressure data
- Auto-refresh with configurable intervals
- Fallback to mock data when offline

### 📝 Notes
- Rich text editing (bold, italic, underline, lists)
- Auto-save functionality
- Export notes as text files
- Configurable auto-save delay

### ✅ Todo List
- Add, edit, and delete tasks
- Mark tasks as complete
- Filter by all/active/completed
- Drag to reorder tasks
- Task statistics

### 🍅 Pomodoro Timer
- Work and break cycles
- Customizable durations
- Browser notifications
- Audio alerts
- Session tracking

### 📅 Calendar
- Month view with navigation
- Click dates to add notes
- Visual indicators for dates with notes
- Keyboard navigation support

### 💬 Quotes
- Inspirational, motivational, and tech quotes
- Random quote generation
- Copy to clipboard
- Auto-refresh option

### 📈 Stocks
- Real-time stock price display (mock data)
- Price charts and statistics
- Multiple stock symbols
- Configurable refresh intervals

### 🔗 Quick Links
- Bookmark favorite websites
- Automatic favicon loading
- Drag to reorder
- Edit titles and URLs

### 💻 System Monitor
- Memory usage (when available)
- Battery status
- Network connectivity
- Browser and platform info

## Keyboard Shortcuts

### Global
- `Ctrl/Cmd + N`: Add new widget
- `Ctrl/Cmd + T`: Toggle theme
- `Ctrl/Cmd + E`: Export layout
- `Ctrl/Cmd + I`: Import layout
- `Esc`: Close modals/menus

### Widget Navigation
- `Arrow Keys`: Move selected widget
- `Ctrl/Cmd + Arrow Keys`: Resize selected widget
- `Shift + Delete`: Remove selected widget
- `Tab`: Navigate between widgets

### In Modals
- `Tab/Shift+Tab`: Navigate form elements
- `Esc`: Close modal
- `Enter`: Submit form

## Customization

### Adding a New Widget

1. **Create the widget file** in `js/widgets/yourwidget.js`:

```javascript
export function createWidget(initialConfig = {}) {
    const defaultConfig = {
        title: 'Your Widget',
        // ... your default config
    };

    let config = { ...defaultConfig, ...initialConfig };
    let element = null;

    function createElement() {
        element = document.createElement('div');
        element.className = 'your-widget-class';
        element.innerHTML = `
            <!-- Your widget HTML -->
        `;
        return element;
    }

    function setConfig(newConfig) {
        config = { ...config, ...newConfig };
        // Update your widget display
        emitConfigChange();
    }

    function getConfig() {
        return { ...config };
    }

    function emitConfigChange() {
        element.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: { config },
            bubbles: true
        }));
    }

    function destroy() {
        // Cleanup your widget
    }

    const el = createElement();
    return { el, getConfig, setConfig, destroy };
}
```

2. **Add widget styles** to `css/widgets.css`:

```css
.your-widget-class {
    /* Your widget styles */
}
```

3. **Register the widget** in `js/main.js` by adding it to the `widgetTypes` array:

```javascript
{
    type: 'yourwidget',
    title: 'Your Widget',
    description: 'Description of your widget',
    icon: 'icon-name'
}
```

### Theme Customization

Edit `css/themes.css` to modify existing themes or add new ones:

```css
[data-theme="mytheme"] {
    --bg: #your-bg-color;
    --text: #your-text-color;
    --primary: #your-primary-color;
    /* ... other CSS variables */
}
```

### Custom CSS Variables

The dashboard uses a comprehensive CSS variable system. Key variables include:

```css
:root {
    /* Colors */
    --bg: /* Background color */
    --text: /* Text color */
    --primary: /* Primary accent color */
    --border: /* Border color */
    
    /* Spacing (8pt grid) */
    --space-1: 0.25rem;  /* 4px */
    --space-2: 0.5rem;   /* 8px */
    --space-4: 1rem;     /* 16px */
    /* ... */
    
    /* Typography */
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    /* ... */
    
    /* Animations */
    --duration-fast: 150ms;
    --duration-normal: 300ms;
    --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

## File Structure

```
dashboard/
├── index.html              # Main HTML file
├── assets/
│   ├── favicon.svg         # Application icon
│   └── icons.svg           # SVG icon sprite
├── css/
│   ├── base.css            # CSS reset, variables, utilities
│   ├── layout.css          # Grid system, responsive layout
│   ├── components.css      # Buttons, modals, forms, toasts
│   ├── widgets.css         # Widget-specific styles
│   ├── themes.css          # Theme definitions
│   └── animations.css      # Animations and micro-interactions
└── js/
    ├── main.js             # Application bootstrap
    ├── state.js            # State management and persistence
    ├── ui.js               # UI utilities (modals, toasts, etc.)
    ├── grid.js             # Drag/drop and grid system
    └── widgets/
        ├── clock.js        # Clock widget
        ├── weather.js      # Weather widget
        ├── notes.js        # Notes widget
        ├── todo.js         # Todo list widget
        ├── pomodoro.js     # Pomodoro timer widget
        ├── calendar.js     # Calendar widget
        ├── quotes.js       # Quotes widget
        ├── stocks.js       # Stocks widget
        ├── links.js        # Quick links widget
        └── system.js       # System monitor widget
```

## Browser Support

- **Chrome/Edge**: Full support including advanced features
- **Firefox**: Full support with minor visual differences
- **Safari**: Full support (iOS Safari 12+)
- **Mobile**: Responsive design works on all modern mobile browsers

### Progressive Enhancement
- Core functionality works without JavaScript
- Graceful degradation for unsupported features
- Offline functionality with service worker (optional)

## Performance

- **60fps** animations using transform and will-change
- **Debounced** expensive operations
- **Lazy loading** for off-screen widgets
- **Optimized** DOM manipulation
- **Minimal** bundle size (no external dependencies)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across browsers
5. Submit a pull request

### Development Guidelines
- Use ESLint-style code formatting
- Include JSDoc comments for public functions
- Follow the existing CSS variable system
- Ensure accessibility compliance
- Test keyboard navigation
- Verify theme compatibility

## Manual Testing Checklist

### Drag & Drop
- [ ] Widgets can be dragged with mouse
- [ ] Widgets can be dragged with touch
- [ ] Grid snapping works correctly
- [ ] Collision detection prevents overlap
- [ ] Visual feedback during drag

### Resize
- [ ] Resize handles appear on hover
- [ ] Widgets can be resized from all corners/edges
- [ ] Minimum size constraints work
- [ ] Resize respects grid boundaries

### Persistence
- [ ] Layout saves automatically
- [ ] Settings persist across reloads
- [ ] Import/export functions work
- [ ] Reset to default works

### Theming
- [ ] All themes display correctly
- [ ] Theme toggle cycles through options
- [ ] System theme detection works
- [ ] Reduced motion is respected

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader announcements work
- [ ] Focus management in modals works
- [ ] ARIA labels are present and correct
- [ ] High contrast mode works

### Widgets
- [ ] All widgets load without errors
- [ ] Widget settings can be modified
- [ ] Widget removal works
- [ ] Widget duplication works

## License

MIT License - see LICENSE file for details.

## Credits

Built with vanilla HTML, CSS, and JavaScript. No external dependencies used.

Icons from a custom SVG sprite based on modern design principles.

Weather data can integrate with Open-Meteo API (free, no key required) or OpenWeather API.