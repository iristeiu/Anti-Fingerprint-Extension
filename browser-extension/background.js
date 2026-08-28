// HTTP header spoofing
// synchronization with content.js is done by using chrome.storage.session for consistent
// UA profiles.

// default fallback profile (Chrome 142)
// if no profile was set in the sessionStorage, this will be always the default choice
const DEFAULT_PROFILE = {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    chromeVersion: "142",
    brands: [{ brand: "Google Chrome", version: "142" }, { brand: "Chromium", version: "142" }, { brand: "Not A Brand", version: "24" }],
    language: "en-GB",
    languages: ["en-GB", "en"],
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
    const chromeVersion = profile.chromeVersion || "142";

    // build sec-ch-ua from the stored brands array so it stays in sync with the picked UA profile
    const versionMatch = FAKE_UA.match(/Chrome\/(\d+)/);
    const version = versionMatch ? versionMatch[1] : chromeVersion;
    const brands = profile.brands || [
        { brand: "Google Chrome", version },
        { brand: "Chromium", version },
        { brand: "Not A Brand", version: "24" },
    ];
    const secChUa = brands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');

    // build accept-language from the stored languages array
    const langs = profile.languages || ["en-GB", "en"];
    const acceptLang = langs
        .map((l, i) => i === 0 ? l : `${l};q=${(1 - i * 0.1).toFixed(1)}`)
        .join(',');

    const rules = [
        {
            "id": 1,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [
                    { "header": "user-agent",        "operation": "set", "value": FAKE_UA      },
                    { "header": "sec-ch-ua",         "operation": "set", "value": secChUa      },
                    { "header": "sec-ch-ua-mobile",  "operation": "set", "value": "?0"         },
                    { "header": "sec-ch-ua-platform","operation": "set", "value": '"Windows"'  },
                    { "header": "accept-language",   "operation": "set", "value": acceptLang   },
                ]
            },
            "condition": {
                "urlFilter": "*",
                "resourceTypes": [
                    "main_frame", "sub_frame",
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

