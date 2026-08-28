// isolated bridge: receives profile data posted by content.js (world:MAIN)
// and forwards it to background.js
window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== '__AFP_UPDATE_PROFILE__') return;
    chrome.runtime.sendMessage({ type: 'UPDATE_PROFILE', profile: e.data.profile });
});
