// UI creation for the widget
const WidgetUI = {
    elements: {},
    config: null,

    createContainer: function(prefs) {
        const defaults = { width: 500, height: 300, y: 20 };
        let { width, height, x, y } = prefs;

        // Safety Reset
        const isOffscreen = (x < -width + 50) || (x > window.innerWidth - 50) || 
                           (y < 0) || (y > window.innerHeight - 50);
        
        if (isOffscreen) {
            console.log('Villager Hunt Assistant: Saved position is off-screen. Resetting to defaults.');
            width = defaults.width;
            height = defaults.height;
            x = window.innerWidth - (defaults.width + 20);
            y = defaults.y;
        }

        const el = document.createElement('div');
        el.id = 'mod-assistant-container';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = width + 'px';
        el.style.height = height + 'px';
        el.style.display = 'none'; // Always start hidden
        
        this.elements.container = el;
        return el;
    },

    createHeader: function(username) {
        const header = document.createElement('div');
        header.className = 'vh-header';

        const title = document.createElement('a');
        title.className = 'vh-title';
        title.textContent = `Villager Hunt Assistant - ${username}`;
        title.href = `${this.config.origin}/villagerhunt/${username}`;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
        title.onclick = (e) => {
            e.preventDefault();
            window.open(title.href, '_blank');
        };

        const buttons = document.createElement('div');
        buttons.className = 'vh-header-buttons';

        const createBtn = (icon, title, cls, fn) => {
            const btn = document.createElement('button');
            btn.className = `vh-btn ${cls}`;
            btn.innerHTML = icon;
            btn.title = title;
            btn.onclick = fn;
            return btn;
        };

        const themeBtn = createBtn('🌓', 'Toggle Theme', 'vh-btn-theme', () => {
            this.elements.iframe.contentWindow.postMessage({ type: 'TOGGLE_THEME' }, this.config.origin);
        });

        const syncBtn = createBtn('🔄', 'Refresh', 'vh-btn-sync', () => {
            syncBtn.classList.add('vh-spinning');
            this.elements.iframe.src = this.elements.iframe.src;
            setTimeout(() => syncBtn.classList.remove('vh-spinning'), 1000);
        });

        const closeBtn = createBtn('×', 'Close', 'vh-btn-close', async () => {
            // Hide with animation
            this.elements.container.classList.remove('vh-visible');
            setTimeout(() => {
                this.elements.container.style.display = 'none';
            }, 200);
            
            // Show one-time tooltip pointing to toggle button
            const result = await chrome.storage.local.get(['tooltipShown']);
            if (!result.tooltipShown) {
                setTimeout(() => this.showToggleTooltip(), 300);
            }
        });

        buttons.append(themeBtn, syncBtn, closeBtn);
        header.append(title, buttons);
        
        this.elements.header = header;
        this.elements.container.appendChild(header);
    },

    createIframe: function(username) {
        const iframe = document.createElement('iframe');
        iframe.className = 'vh-iframe';
        iframe.src = `${this.config.origin}/villagerhunt/${username}?modembed=true`;
        iframe.allow = 'storage-access';
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.sandbox = 'allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation';
        
        this.elements.iframe = iframe;
        this.elements.container.appendChild(iframe);
    },

    createInteractions: function() {
        const overlay = document.createElement('div');
        overlay.className = 'vh-overlay';
        
        const resizer = document.createElement('div');
        resizer.className = 'vh-resizer';

        this.elements.overlay = overlay;
        this.elements.resizer = resizer;
        this.elements.container.append(overlay, resizer);
    },

    showToggleTooltip: function() {
        const toggleBtn = document.getElementById('mod-assistant-toggle');
        if (!toggleBtn) return; // Button not found yet

        const tooltip = document.createElement('div');
        tooltip.id = 'vh-toggle-tooltip';
        tooltip.innerHTML = `
            <button id="vh-tooltip-close">×</button>
            <div class="vh-tooltip-content">
                <strong>👋 Find me here!</strong>
                <p>Click the island icon to reopen this widget anytime.</p>
            </div>
            <div class="vh-tooltip-arrow"></div>
        `;

        document.body.appendChild(tooltip);

        // Position tooltip near the toggle button
        const rect = toggleBtn.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = (rect.bottom + 10) + 'px';
        tooltip.style.left = (rect.left - 100) + 'px';

        // Dismiss handler
        document.getElementById('vh-tooltip-close').onclick = () => {
            tooltip.remove();
            chrome.storage.local.set({ tooltipShown: true });
        };

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (tooltip.parentNode) tooltip.remove();
        }, 15000);
    },

    init: function(config, username, prefs) {
        this.config = config;
        this.createContainer(prefs);
        this.createHeader(username);
        this.createIframe(username);
        this.createInteractions();
        return this.elements;
    }
};
