// Toggle button injection for Twitch UI
const WidgetToggle = {
    create: function(container) {
        const findNav = () => {
            const support = document.querySelector('[data-highlight-selector="support"]');
            return support ? support.closest('.Layout-sc-1xcs6mc-0') : null;
        };

        const injectNative = (nav) => {
            if (document.getElementById('mod-assistant-toggle')) return;
            const actionContainer = nav.parentNode;
            if (!actionContainer) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'InjectLayout-sc-1i43xsx-0 iDMNUO';
            
            const btn = document.createElement('button');
            btn.id = 'mod-assistant-toggle';
            btn.className = 'ScCoreButton-sc-ocjdkq-0 glPhvE ScButtonIcon-sc-9yap0r-0 dcNXJO';
            btn.title = 'Villager Hunt Assistant';
            btn.innerHTML = `<div class="ButtonIconFigure-sc-1emm8lf-0 lnTwMD"><img src="${chrome.runtime.getURL('src/assets/island.png')}" style="width: 20px; height: 20px; object-fit: contain;"></div>`;
            
            btn.onclick = () => {
                // If tooltip is showing, dismiss it and mark as acknowledged
                const tooltip = document.getElementById('vh-toggle-tooltip');
                if (tooltip) {
                    tooltip.remove();
                    chrome.storage.local.set({ tooltipShown: true });
                }
                
                const isVisible = container.style.display !== 'none';
                if (isVisible) {
                    // Hide with animation
                    container.classList.remove('vh-visible');
                    setTimeout(() => {
                        container.style.display = 'none';
                    }, 200); // Match CSS transition duration
                } else {
                    // Show with animation
                    container.style.display = 'flex';
                    requestAnimationFrame(() => {
                        container.classList.add('vh-visible');
                    });
                }
            };

            wrapper.appendChild(btn);
            actionContainer.insertBefore(wrapper, actionContainer.firstChild);
        };

        // Try to find and inject into navbar, with retries
        const nav = findNav();
        if (nav) {
            injectNative(nav);
        } else {
            // Wait for Twitch UI to load
            let retries = 0;
            const retryInterval = setInterval(() => {
                const newNav = findNav();
                if (newNav) {
                    clearInterval(retryInterval);
                    injectNative(newNav);
                } else if (++retries >= 20) { // Try for ~2 seconds
                    clearInterval(retryInterval);
                    console.warn('Villager Hunt Assistant: Could not find Twitch navbar to inject toggle button');
                }
            }, 100);
        }
    }
};
