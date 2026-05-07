// HTTP header spoofing
// synchronization with content.js is done by using chrome.storage.session for consistent
// UA profiles.

// default fallback profile (Chrome 122)
// if no profile was set in the sessionStorage, this will be alwasy the default choice
const DEFAULT_PROFILE = {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    chromeVersion: "122",
};

async function createRules() {
    // try to read the selected profile from sessionStorage
    let profile = DEFAULT_PROFILE;

    try {
        const stored = chrome.storage.session ? await chrome.storage.session.get('__afp_profile__') : null;
        if (stored && stored.__afp_profile__) {
            profile = stored.__afp_profile__;
        }
    } catch (e) {
        // default profile if storage unavailable
    }

    const FAKE_UA = profile.ua;
    const chromeVersion = profile.chromeVersion || "122";

    // extract version number for SEC-CH-UA header
    // extracts the major version number from the selected UA string to ensure header always matches the version in the UA string,
    //  even if the profile selection changes
    const versionMatch = FAKE_UA.match(/Chrome\/(\d+)/);
    const version = versionMatch ? versionMatch[1] : chromeVersion;


    // this is how the header of the HTTP request will be modified
    const rules = [
        {
            "id": 1,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [ //  the headers which are overwritten
                    { "header": 
                        "user-agent", 
                        "operation": "set", 
                        "value": FAKE_UA 
                    },
                    { "header": 
                        "sec-ch-ua", 
                        "operation": "set", 
                        "value": `"Not(A:Brand";v="99", "Google Chrome";v="${version}", "Chromium";v="${version}"` 
                    },
                    { "header": 
                        "sec-ch-ua-mobile", 
                        "operation": "set", 
                        "value": "?0" 
                    },
                    { "header": 
                        "sec-ch-ua-platform", 
                        "operation": "set", 
                        "value": "\"Windows\"" 
                    },
                    { "header": 
                        "accept-language", 
                        "operation": "set", 
                        "value": "de-DE,de;q=0.9,en-GB;q=0.8,en;q=0.7" }
                ]
            },
            "condition": { // what traffic it applies to
                "urlFilter": "*", // all urls
                "resourceTypes": [ // list of sub-resources loaded by a page 
                    "stylesheet", "script", "image",
                    "font", "object", "xmlhttprequest", "ping", "csp_report",
                    "media", "websocket", "other"
                ]
            }
        }
    ];

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
}

// initialize on service worker startup
createRules();

// listen for profile updates from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_PROFILE') {
        chrome.storage.session.set({ 
            '__afp_profile__': message.profile }, 
            () => {
                createRules();
                sendResponse({ success: true });
            });
        return true; // Keep channel open for async response
    }
});

