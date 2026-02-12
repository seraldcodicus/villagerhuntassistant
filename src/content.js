// Main orchestrator for Villager Hunt Assistant widget
(function() {
    'use strict';

    const VillagerHunt = {
        initialized: false,
        config: {
            origin: 'https://www.risshella.com',
            username: null
        },

        getChannelUsername: function() {
            const parts = window.location.pathname.split('/');
            const idx = parts.indexOf('moderator');
            return (idx !== -1) ? parts[idx + 1] : null;
        },

        // Poll for Twitch SPA to render, then check for access denied
        checkAccess: function() {
            return new Promise((resolve) => {
                let checks = 0;
                const maxChecks = 20; // 10 seconds at 500ms intervals

                const check = () => {
                    checks++;
                    const bodyText = document.body?.innerText || '';

                    if (bodyText.includes('Access denied')) {
                        resolve(false);
                        return;
                    }

                    // Page has loaded with real content and no access denied
                    if (bodyText.length > 200) {
                        resolve(true);
                        return;
                    }

                    if (checks >= maxChecks) {
                        resolve(true);
                        return;
                    }

                    setTimeout(check, 500);
                };

                check();
            });
        },

        init: async function() {
            this.config.username = this.getChannelUsername();
            if (!this.config.username) return;

            const hasAccess = await this.checkAccess();
            if (!hasAccess) {
                console.log('Villager Hunt Assistant: Access denied, not initializing');
                return;
            }

            const isACNH = await this.checkGameCategory();
            if (!isACNH) {
                console.log('Villager Hunt Assistant: Game is not ACNH, button set to inactive');
                WidgetEvents.state.autoShowDisabled = true;
            }

            await this.setup();

            if (!isACNH) {
                window.postMessage({ type: 'VH_BUTTON_INACTIVE' }, '*');
            }
        },

        // Poll for game category element, then check if ACNH
        checkGameCategory: function() {
            return new Promise((resolve) => {
                let checks = 0;
                const maxChecks = 20; // 10 seconds at 500ms intervals

                const check = () => {
                    checks++;

                    const gameLink = document.querySelector('[data-a-target="stream-box-art-link"]');
                    if (gameLink) {
                        const isACNH = !!gameLink.getAttribute('href')?.includes('animal-crossing-new-horizons');
                        resolve(isACNH);
                        return;
                    }

                    if (checks >= maxChecks) {
                        console.log('Villager Hunt Assistant: Game category element not found');
                        resolve(false);
                        return;
                    }

                    setTimeout(check, 500);
                };

                check();
            });
        },

        setup: async function() {
            const prefs = await WidgetStorage.load();
            const elements = WidgetUI.init(this.config, this.config.username, prefs);
            
            document.body.appendChild(elements.container);
            
            WidgetEvents.init(elements, this.config);
            WidgetToggle.create(elements.container);
            
            console.log('Villager Hunt Assistant initialized');
        }
    };

    VillagerHunt.init();
})();

