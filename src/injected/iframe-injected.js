// Only run if we are actually inside an iframe
if (window !== window.top) {
    console.log('Villager Hunt Assistant: Injected and active inside iframe.');
    
    // 1. Inject the compact styles
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('src/styles/iframe-styles.css');
    document.documentElement.appendChild(style);

    // 2. Theme Toggle & Sync Logic
    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://www.twitch.tv') return;
        
        try {
            const current = localStorage.getItem('themeMode') || 'dark';
            
            if (event.data && event.data.type === 'TOGGLE_THEME') {
                const nextTheme = current === 'light' ? 'dark' : 'light';
                localStorage.setItem('themeMode', nextTheme);
                window.location.reload();
            } 
            else if (event.data && event.data.type === 'SET_THEME') {
                const requestedTheme = event.data.theme;
                if (current !== requestedTheme) {
                    console.log(`Villager Hunt Assistant: Theme mismatch. Updating to [${requestedTheme}] and refreshing.`);
                    localStorage.setItem('themeMode', requestedTheme);
                    window.location.reload();
                }
            }
        } catch (e) {
            console.error('Villager Hunt Assistant: Theme operation failed due to storage restrictions.');
        }
    });

    // 3. Check login status
    const checkLogin = () => {
        if (!document.body) return;
        
        const html = document.documentElement.innerHTML;
        
        // 🛡️ The "Gold Standard": Check for Next.js initialSession state specifically
        // We check for both escaped (\") and unescaped (") quotes because Next.js sometimes encodes them differently in scripts
        const hasExplicitAuth = html.includes('"initialSession":{"userId"') || html.includes('\\"initialSession\\":{\\"userId\\"');
        const hasExplicitLoggedOut = html.includes('"initialSession":null') || html.includes('\\"initialSession\\":null');
        
        let isLoggedIn = true; // Default to true to avoid flashing while loading

        if (hasExplicitLoggedOut) {
            isLoggedIn = false;
        } else if (hasExplicitAuth) {
            isLoggedIn = true;
        } else {
            // 🚩 Fallback: Check for visible logged-out text if JS state hasn't loaded yet
            const pageText = document.body.innerText || "";
            if (pageText.includes("Login with Twitch") || pageText.includes("or their mod?")) {
                isLoggedIn = false;
            }
        }

        console.log(`Villager Hunt Assistant Auth Check: AuthData=${hasExplicitAuth}, LoggedOutData=${hasExplicitLoggedOut}, Result=${isLoggedIn}`);

        if (!isLoggedIn) {
            showLoggedOutUI();
        } else {
            const existingUI = document.getElementById('vh-logged-out-ui');
            if (existingUI) existingUI.remove();
        }

        // 💎 Check if there's an active hunt to show the widget (independent of login status)
        const pageText = document.body.innerText || "";
        const noActiveHunt = pageText.includes("No active hunt");
        const creatorNotFound = pageText.includes("Creator not found.");

        if (noActiveHunt) {
            console.log('Villager Hunt Assistant: No active hunt found.');
            window.parent.postMessage({ type: 'VH_BUTTON_INACTIVE' }, 'https://www.twitch.tv');
        } else if (creatorNotFound) {
            console.log('Villager Hunt Assistant: Creator not found.');
            window.parent.postMessage({ type: 'VH_BUTTON_INACTIVE' }, 'https://www.twitch.tv');
        } else {
            console.log('Villager Hunt Assistant: Active hunt detected. Triggering widget.');
            window.parent.postMessage({ type: 'VH_SHOW_WIDGET' }, 'https://www.twitch.tv');
            window.parent.postMessage({ type: 'VH_BUTTON_ACTIVE' }, 'https://www.twitch.tv');
        }
    };

    const showLoggedOutUI = () => {
        if (!document.body || document.getElementById('vh-logged-out-ui')) return;

        const theme = localStorage.getItem('themeMode') || 'dark';
        const isDark = theme === 'dark';

        const ui = document.createElement('div');
        ui.id = 'vh-logged-out-ui';
        ui.className = isDark ? 'dark' : 'light';

        const username = window.location.pathname.split('/').pop();

        ui.innerHTML = `
            <img src="${chrome.runtime.getURL('src/assets/island.png')}" style="width: 64px; height: 64px; margin-bottom: 16px;">
            <h3 class="vh-logged-out-title">Login Required</h3>
            <p class="vh-logged-out-p">
                You are not logged into a Villager Hunt on risshella.com.<br>
                Please login using the button below, then <b>click the 🔄 refresh button</b> in the header above to refresh this widget.
            </p>
            <button id="vh-login-btn-internal">Open Villager Hunt Login</button>
        `;

        document.body.appendChild(ui);

        ui.querySelector('#vh-login-btn-internal').onclick = () => {
            const returnUrl = encodeURIComponent(`/villagerhunt/${username}`);
            window.open(`https://www.risshella.com/api/auth/twitch?return=${returnUrl}`, '_blank');
        };
    };

    // Run check immediately and after a short delay for initial load
    checkLogin();
    setTimeout(checkLogin, 500);
}
