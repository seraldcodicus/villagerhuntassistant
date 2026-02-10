// Storage utilities for widget preferences
const WidgetStorage = {
    save: (key, val) => chrome.storage.local.set({ [key]: val }),
    
    load: () => new Promise(res => {
        chrome.storage.local.get(null, prefs => res({
            x: prefs.modAssistantX ?? (window.innerWidth - 520),
            y: prefs.modAssistantY ?? 20,
            width: prefs.modAssistantWidth ?? 500,
            height: prefs.modAssistantHeight ?? 300
        }));
    })
};
