// Event handlers for widget interactions
const WidgetEvents = {
    state: {
        isDragging: false,
        isResizing: false,
        lastSentTheme: null
    },
    elements: null,
    config: null,

    init: function(elements, config) {
        this.elements = elements;
        this.config = config;
        
        this.setupDragging();
        this.setupResizing();
        this.setupMessaging();
        this.setupThemeSync();
    },

    setupDragging: function() {
        let initialX, initialY;
        const { container, header, overlay } = this.elements;

        header.onmousedown = (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            this.state.isDragging = true;
            initialX = e.clientX - container.offsetLeft;
            initialY = e.clientY - container.offsetTop;
            overlay.style.display = 'block';
            header.style.cursor = 'grabbing';
            e.preventDefault();
        };

        document.addEventListener('mousemove', (e) => {
            if (!this.state.isDragging) return;
            let x = Math.max(-container.offsetWidth + 50, Math.min(e.clientX - initialX, window.innerWidth - 50));
            let y = Math.max(0, Math.min(e.clientY - initialY, window.innerHeight - 30));
            container.style.left = x + 'px';
            container.style.top = y + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (this.state.isDragging) {
                this.state.isDragging = false;
                overlay.style.display = 'none';
                header.style.cursor = 'move';
                WidgetStorage.save('modAssistantX', container.offsetLeft);
                WidgetStorage.save('modAssistantY', container.offsetTop);
            }
        });
    },

    setupResizing: function() {
        let initialX, initialY, initialW, initialH;
        const { container, resizer, overlay } = this.elements;

        resizer.onmousedown = (e) => {
            this.state.isResizing = true;
            initialX = e.clientX;
            initialY = e.clientY;
            initialW = container.offsetWidth;
            initialH = container.offsetHeight;
            overlay.style.display = 'block';
            e.preventDefault();
        };

        document.addEventListener('mousemove', (e) => {
            if (!this.state.isResizing) return;
            const w = Math.max(300, Math.min(initialW + (e.clientX - initialX), window.innerWidth - container.offsetLeft));
            const h = Math.max(100, Math.min(initialH + (e.clientY - initialY), window.innerHeight - container.offsetTop));
            container.style.width = w + 'px';
            container.style.height = h + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (this.state.isResizing) {
                this.state.isResizing = false;
                overlay.style.display = 'none';
                WidgetStorage.save('modAssistantWidth', container.offsetWidth);
                WidgetStorage.save('modAssistantHeight', container.offsetHeight);
            }
        });
    },

    setupMessaging: function() {
        window.addEventListener('message', (event) => {
            if (event.origin !== this.config.origin) return;
            
            if (event.data?.type === 'VH_SHOW_WIDGET') {
                this.elements.container.style.display = 'flex';
                // Trigger animation after display is set
                requestAnimationFrame(() => {
                    this.elements.container.classList.add('vh-visible');
                });
            } else if (event.data?.type === 'VH_BUTTON_ACTIVE') {
                const btn = document.getElementById('mod-assistant-toggle');
                if (btn) {
                    btn.style.filter = 'none';
                    btn.title = 'Villager Hunt Assistant - Active Hunt';
                }
            } else if (event.data?.type === 'VH_BUTTON_INACTIVE') {
                const btn = document.getElementById('mod-assistant-toggle');
                if (btn) {
                    btn.style.filter = 'grayscale(100%) opacity(0.5)';
                    btn.title = 'Villager Hunt Assistant - Inactive';
                }
            }
        });
    },

    setupThemeSync: function() {
        const sync = () => {
            const isDark = document.documentElement.className.includes('theme-dark') || 
                          (window.getComputedStyle(document.body).backgroundColor.includes('rgb(24, 24, 27'));
            const theme = isDark ? 'dark' : 'light';
            
            if (theme !== this.state.lastSentTheme) {
                this.state.lastSentTheme = theme;
                this.elements.iframe.contentWindow.postMessage({ type: 'SET_THEME', theme }, this.config.origin);
            }
        };
        
        this.elements.iframe.onload = sync;
        new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
};
