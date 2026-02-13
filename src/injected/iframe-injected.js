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

    // 3. Storage Access API — request cookie access before checking login
    const ensureStorageAccess = async () => {
        if (!document.hasStorageAccess) {
            console.log('Villager Hunt Assistant: Storage Access API not supported.');
            return 'unsupported';
        }

        const hasAccess = await document.hasStorageAccess();
        if (hasAccess) {
            console.log('Villager Hunt Assistant: Storage access already granted.');
            return 'granted';
        }

        // Try requesting without a gesture — succeeds if previously granted in some browsers
        try {
            await document.requestStorageAccess();
            console.log('Villager Hunt Assistant: Storage access granted automatically.');
            return 'just_granted';
        } catch (e) {
            console.log('Villager Hunt Assistant: Storage access requires user gesture.');
            return 'needs_gesture';
        }
    };

    // Check if user previously granted storage access via Permissions API
    const wasPreviouslyGranted = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'storage-access' });
            return result.state === 'granted';
        } catch (e) {
            return false;
        }
    };

    // For returning users: attach a one-time click listener that silently
    // requests storage access on any interaction, then reloads with cookies.
    const setupAutoGrantOnClick = () => {
        const handler = async () => {
            document.removeEventListener('click', handler, true);
            try {
                await document.requestStorageAccess();
                console.log('Villager Hunt Assistant: Storage access granted on interaction. Reloading.');
                window.location.reload();
            } catch (e) {
                console.warn('Villager Hunt Assistant: Storage access denied on interaction.', e);
            }
        };
        document.addEventListener('click', handler, true);
    };

    // 4. Check login status
    const checkLogin = (showGrantButton) => {
        if (!document.body) return;

        const html = document.documentElement.innerHTML;

        // The "Gold Standard": Check for Next.js initialSession state specifically
        // We check for both escaped (\") and unescaped (") quotes because Next.js sometimes encodes them differently in scripts
        const hasExplicitAuth = html.includes('"initialSession":{"userId"') || html.includes('\\"initialSession\\":{\\"userId\\"');
        const hasExplicitLoggedOut = html.includes('"initialSession":null') || html.includes('\\"initialSession\\":null');

        let isLoggedIn = true; // Default to true to avoid flashing while loading

        if (hasExplicitLoggedOut) {
            isLoggedIn = false;
        } else if (hasExplicitAuth) {
            isLoggedIn = true;
        } else {
            // Fallback: Check for visible logged-out text if JS state hasn't loaded yet
            const pageText = document.body.innerText || "";
            if (pageText.includes("Login with Twitch") || pageText.includes("or their mod?")) {
                isLoggedIn = false;
            }
        }

        console.log(`Villager Hunt Assistant Auth Check: AuthData=${hasExplicitAuth}, LoggedOutData=${hasExplicitLoggedOut}, Result=${isLoggedIn}`);

        if (!isLoggedIn) {
            showLoggedOutUI(showGrantButton);
        } else {
            const existingUI = document.getElementById('vh-logged-out-ui');
            if (existingUI) existingUI.remove();
        }

        // Check if there's an active hunt to show the widget (independent of login status)
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

    const showLoggedOutUI = (showGrantButton) => {
        if (!document.body || document.getElementById('vh-logged-out-ui')) return;

        const theme = localStorage.getItem('themeMode') || 'dark';
        const isDark = theme === 'dark';

        const ui = document.createElement('div');
        ui.id = 'vh-logged-out-ui';
        ui.className = isDark ? 'dark' : 'light';

        const username = window.location.pathname.split('/').pop();

        // Only show the "Allow Cookie Access" button for first-time users who haven't
        // granted storage access yet. Returning users get auto-connected on any click
        // via setupAutoGrantOnClick(), so they don't need a separate button.
        const grantButtonHtml = showGrantButton ? `
            <button id="vh-grant-access-btn">Allow Cookie Access</button>
            <p id="vh-grant-access-hint" class="vh-logged-out-p" style="font-size: 11px; margin-top: 8px;">
                If you're already logged in on risshella.com, click "Allow Cookie Access" to connect your session.
            </p>
        ` : '';

        ui.innerHTML = `
            <h3 class="vh-logged-out-title">Login Required</h3>
            <p class="vh-logged-out-p">
                You are not logged into a Villager Hunt on risshella.com.<br>
                Please login using the button below, then <b>click the 🔄 refresh button</b> in the header above to refresh this widget.
            </p>
            <button id="vh-login-btn-internal">Open Villager Hunt Login</button>
            ${grantButtonHtml}
        `;

        document.body.appendChild(ui);

        ui.querySelector('#vh-login-btn-internal').onclick = () => {
            const returnUrl = encodeURIComponent(`/villagerhunt/${username}`);
            window.open(`https://www.risshella.com/api/auth/twitch?return=${returnUrl}`, '_blank');
        };

        const grantBtn = ui.querySelector('#vh-grant-access-btn');
        if (grantBtn) {
            grantBtn.onclick = async () => {
                try {
                    await document.requestStorageAccess();
                    console.log('Villager Hunt Assistant: Storage access granted via user gesture.');
                    window.location.reload();
                } catch (e) {
                    console.warn('Villager Hunt Assistant: Storage access denied by user.', e);
                }
            };
        }
    };

    // Main init: try storage access first, then check login
    const init = async () => {
        const accessResult = await ensureStorageAccess();

        // If we just obtained access (wasn't active before), reload so the
        // server receives our cookies and renders the authenticated page.
        if (accessResult === 'just_granted') {
            console.log('Villager Hunt Assistant: Reloading to apply newly granted storage access.');
            window.location.reload();
            return;
        }

        // No need for the grant button if access is already active —
        // cookies are flowing, user is just genuinely logged out.
        let showGrantButton = accessResult === 'needs_gesture';

        // For returning users who previously granted access but the browser
        // needs a user gesture to re-activate it: any click in the iframe
        // will silently request access and reload.
        if (accessResult === 'needs_gesture') {
            const previouslyGranted = await wasPreviouslyGranted();
            if (previouslyGranted) {
                setupAutoGrantOnClick();
                showGrantButton = false;
            }
        }

        // Run login checks once DOM is ready
        const runChecks = () => {
            checkLogin(showGrantButton);
            setTimeout(() => checkLogin(showGrantButton), 500);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runChecks);
        } else {
            runChecks();
        }
    };

    init();
}
