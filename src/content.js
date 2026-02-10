// Main orchestrator for Villager Hunt Assistant widget
(function() {
    'use strict';

    const VillagerHunt = {
        config: {
            origin: 'https://www.risshella.com',
            username: null
        },

        getChannelUsername: function() {
            const parts = window.location.pathname.split('/');
            const idx = parts.indexOf('moderator');
            return (idx !== -1) ? parts[idx + 1] : null;
        },

        init: async function() {
            this.config.username = this.getChannelUsername();
            if (!this.config.username) {
                console.log('Villager Hunt Assistant: Not on a moderator page');
                return;
            }

            const checkReady = setInterval(async () => {
                if (document.body) {
                    clearInterval(checkReady);
                    await this.setup();
                }
            }, 100);
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
