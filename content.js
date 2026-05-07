// immediately-invoked function expression (IIFE)
// this function loads at the start of the page before any html is loaded
(function () {

    // generate SESSION SEED which will be stable during a session time 
    const SESSION_KEY = '__afp_seed__';
    let seed;

    try {
        seed = sessionStorage.getItem(SESSION_KEY);
        if (!seed) {
            seed = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
            sessionStorage.setItem(SESSION_KEY, seed);
        }
    } catch (e) {
        seed = Math.random().toString(36).slice(2);
    }

    // implementation of the Mulberry32 pseudo-random number generator (PRNG)
    function makePRNG(seedStr) {
        let h = 0;
        for (let i = 0; i < seedStr.length; i++) {
            h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
        }
        return function () {
            h |= 0; h = h + 0x6D2B79F5 | 0;          
            let t = Math.imul(h ^ h >>> 15, 1 | h);   
            t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
            return ((t ^ t >>> 14) >>> 0) / 4294967296; // normalize to [0, 1)
        };
    }
    const rand = makePRNG(seed);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    // Value Pools
    // Values used for setting the identity of the browser
    // Until now there are 3 Chrome versions on Windows 10 x64 — the most common UA pool globally
    // Structure of the profile:
    //          - the UA string
    //          - the platform string
    //          - full navigator.userAgentData structure (Client Hints API).
    const UA_PROFILES = [
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Not(A:Brand", version: "99" }, { brand: "Google Chrome", version: "122" }, { brand: "Chromium", version: "122" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "122",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Chromium", version: "124" }, { brand: "Google Chrome", version: "124" }, { brand: "Not-A.Brand", version: "99" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "124",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Not_A Brand", version: "8" }, { brand: "Chromium", version: "120" }, { brand: "Google Chrome", version: "120" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "120",
            },
        },
    ];

    // These 4 entries cover the most common GPU/driver combinations
    const WEBGL_PROFILES = [
        { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    ];

    // Weights reflect real-world distribution: 8 GB appears 3 times to bias toward
    // the most common laptop configuration without completely excluding others
    const MEMORY_POOL   = [4, 8, 8, 8, 16];
    // Logical CPU cores: 8 and 12 core machines dominate modern consumer hardware
    const CPU_POOL      = [4, 8, 8, 12, 16];

    // Language lists
    const LANGUAGE_POOL = [
        ["de-DE", "de", "en-GB", "en"],
        ["fr-FR", "fr", "en-GB", "en"],
        ["en-GB", "en"],
        ["it-IT", "it", "en-GB", "en"],
        ["es-ES", "es", "en-GB", "en"],
        ["nl-NL", "nl", "en-GB", "en"],
        ["pl-PL", "pl", "en-GB", "en"],
    ];

    // Timezone profiles for Western/Central Europe.
    const TIMEZONE_POOL = [
        { zone: "Europe/London",    offset: -60,  gmtOffset: "+0100", name: "British Summer Time"          },
        { zone: "Europe/Berlin",    offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Paris",     offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Warsaw",    offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Rome",      offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
    ];

    // availHeight = height minus taskbar
    const SCREEN_PROFILES = [
        { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 },
        { width: 1366, height: 768,  availWidth: 1366, availHeight: 728  },
        { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400 },
        { width: 1440, height: 900,  availWidth: 1440, availHeight: 860  },
    ];

    // Choose the consistent profile available during one session
    const uaProfile    = pick(UA_PROFILES);
    const webglProfile = pick(WEBGL_PROFILES);
    const memory       = pick(MEMORY_POOL);
    const cpuCores     = pick(CPU_POOL);
    const languages    = pick(LANGUAGE_POOL);
    const tzProfile    = pick(TIMEZONE_POOL);
    const screenProfile = pick(SCREEN_PROFILES);

    // Function toString() masking
    // It applies to all functions, including toString() itself
    const hookedFunctions = new Map();
    const originalToString = Function.prototype.toString;
    Object.defineProperty(Function.prototype, 'toString', {
        value: function toString() {
            // toString itself must also appear native when checked
            if (this === Function.prototype.toString) 
                return "function toString() { [native code] }";

            if (hookedFunctions.has(this)) {
                return `function ${hookedFunctions.get(this)}() { [native code] }`;
            }

            return originalToString.call(this);
        },
        configurable: true, writable: true,
    });

    // fn.name is set because some detection scripts check fn.name directly rather 
    // than parsing the toString() output
    const hideFn = (fn, name) => {
        hookedFunctions.set(fn, name);
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
    };

    // ------- SCREEN --------
    // replace the property descriptors on Screen.prototype
    // so that the spoofed values appear for all reads, including from iframes.
    const screenDescriptors = {
        width:       { get: () => screenProfile.width       },
        height:      { get: () => screenProfile.height      },
        availWidth:  { get: () => screenProfile.availWidth  },
        availHeight: { get: () => screenProfile.availHeight },
        colorDepth:  { get: () => 24 },
        pixelDepth:  { get: () => 24 },
    };
    Object.entries(screenDescriptors).forEach(([prop, descriptor]) => {
        Object.defineProperty(
            Screen.prototype, prop, 
            { ...descriptor, configurable: true }
        );
    });

    // ------- WINDOW PROPERTIES --------
    Object.defineProperty(window, 'outerWidth', {
        get: () => screenProfile.width,
        configurable: true,
    });
    Object.defineProperty(window, 'outerHeight', {
        get: () => screenProfile.height,
        configurable: true,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 1,
        configurable: true,
    });

    // ------- WEBDRIVER --------
    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });
    // also patch the own property if present, not only the prototype
    try {
        Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
    } catch (_) {}

    // ------- NAVIGATOR -------
    // Replace the Navigator.prototype so the spoofed values are inherited by iframes and any 
    // other Navigator instances.
    const uad = uaProfile.uaData;
    const navDescriptors = {
        userAgent:           { get: () => uaProfile.ua },
        appVersion:          { get: () => uaProfile.ua.replace("Mozilla/", "") },
        platform:            { get: () => uaProfile.platform },
        deviceMemory:        { get: () => memory },
        hardwareConcurrency: { get: () => cpuCores },
        language:            { get: () => languages[0] },
        languages:           { get: () => Object.freeze([...languages]) },
        vendor:              { get: () => "Google Inc." },
        userAgentData: {
            get: () => ({
                brands:   uad.brands,
                mobile:   uad.mobile,
                platform: uad.platform,
                getHighEntropyValues(hints) {
                    return Promise.resolve({
                        brands:          uad.brands,
                        mobile:          uad.mobile,
                        platform:        uad.platform,
                        architecture:    "x86",
                        bitness:         "64",
                        model:           "",
                        platformVersion: uad.platformVersion,
                        uaFullVersion:   uad.chromeVersion + ".0.6261.112",
                    });
                },
                toJSON() {
                    return { 
                        brands: uad.brands, 
                        mobile: uad.mobile, 
                        platform: uad.platform 
                    };
                },
            }),
        },
    };
    Object.entries(navDescriptors).forEach(([prop, descriptor]) => {
        Object.defineProperty(Navigator.prototype, prop, { ...descriptor, configurable: true });
    });

    // -------- TIMEZONE -------
    // Save the real getTimezoneOffset before we overwrite it, needed in the
    // Date constructor to compute the adjustment from the real timezone to ours.
    const _OrigDate = window.Date;
    const _realGetTimezoneOffset = _OrigDate.prototype.getTimezoneOffset;



    // Intl.DateTimeFormat patch
    const _OrigIntlDTF = Intl.DateTimeFormat;
    const _origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

    const _FakeIntlDTF = function DateTimeFormat(locales, options) {
        const opts = options ? { ...options } : {};
        // inject our timezone only when the caller hasnt specified one
        if (!opts.timeZone) 
            opts.timeZone = tzProfile.zone;

        return new.target
            ? Reflect.construct(_OrigIntlDTF, [locales, opts], new.target)
            : _OrigIntlDTF.call(this, locales, opts);
    };
    // Share the original prototype so instanceof Intl.DateTimeFormat still works
    Object.defineProperty(_FakeIntlDTF, 'prototype',
        { value: _OrigIntlDTF.prototype, writable: false });
    Object.setPrototypeOf(_FakeIntlDTF, _OrigIntlDTF);

    _FakeIntlDTF.supportedLocalesOf = _OrigIntlDTF.supportedLocalesOf;
    Intl.DateTimeFormat = _FakeIntlDTF;
    hideFn(_FakeIntlDTF, 'DateTimeFormat');

    // Patch resolvedOptions to always report the spoofed zone,
    // even for formatters created before our constructor replacement ran
    const _fakeResolvedOptions = function resolvedOptions() {
        const opts = _origResolvedOptions.call(this);
        opts.locale   = languages[0];
        opts.timeZone = tzProfile.zone;

        return opts;
    };
    Intl.DateTimeFormat.prototype.resolvedOptions = _fakeResolvedOptions;
    hideFn(_fakeResolvedOptions, 'resolvedOptions');



    // Date.prototype.getTimezoneOffset patch
    const _fakeGetTimezoneOffset = function getTimezoneOffset() {
        if (Number.isNaN(this.getTime())) 
            return NaN;

        return tzProfile.offset;
    };
    _OrigDate.prototype.getTimezoneOffset = _fakeGetTimezoneOffset;
    hideFn(_fakeGetTimezoneOffset, 'getTimezoneOffset');



    // Date local-time getters 
    const _toSL = (ts) => new _OrigDate(ts - tzProfile.offset * 60000);

    const _localGetters = {
        getFullYear:     d => d.getUTCFullYear(),
        getMonth:        d => d.getUTCMonth(),
        getDate:         d => d.getUTCDate(),
        getDay:          d => d.getUTCDay(),
        getHours:        d => d.getUTCHours(),
        getMinutes:      d => d.getUTCMinutes(),
        getSeconds:      d => d.getUTCSeconds(),
        getMilliseconds: d => d.getUTCMilliseconds(),
    };
    Object.entries(_localGetters).forEach(([name, fn]) => {
        const fake = function () {
            const ts = this.getTime();
            if (Number.isNaN(ts)) return NaN;
            return fn(_toSL(ts));
        };
        _OrigDate.prototype[name] = fake;
        hideFn(fake, name);
    });



    // Date local-time setters
    const _localSetters = {
        setHours:        'setUTCHours',
        setMinutes:      'setUTCMinutes',
        setSeconds:      'setUTCSeconds',
        setMilliseconds: 'setUTCMilliseconds',
        setDate:         'setUTCDate',
        setMonth:        'setUTCMonth',
        setFullYear:     'setUTCFullYear',
    };
    Object.entries(_localSetters).forEach(([name, utcName]) => {
        const orig = _OrigDate.prototype[utcName];
        const fake = function(...args) {
            // shift current time into spoofed timezone space, apply setter, shift back
            const shifted = new _OrigDate(this.getTime() - tzProfile.offset * 60000);
            orig.call(shifted, ...args);
            this.setTime(shifted.getTime() + tzProfile.offset * 60000);
            return this.getTime();
        };
        _OrigDate.prototype[name] = fake;
        hideFn(fake, name);
    });

    // Date.toString() patch
    // Format: 
    //          "Mon May 04 2026 14:30:00 GMT+0200 (Central European Summer Time)"
    const _fakeDateToString = function toString() {
        if (Number.isNaN(this.getTime())) 
            return 'Invalid Date';

        const formatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'short', month: 'short', 
            day: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit',
            second: '2-digit', hour12: false, 
            timeZone: tzProfile.zone
        });
        const parts = formatter.formatToParts(this);
        const p = {}; 
        for (const part of parts) 
            p[part.type] = part.value;

        return `${p.weekday} ${p.month} ${p.day} ${p.year} ${p.hour}:${p.minute}:${p.second} GMT${tzProfile.gmtOffset} (${tzProfile.name})`;
    };
    _OrigDate.prototype.toString = _fakeDateToString;
    hideFn(_fakeDateToString, 'toString');

    // Date.toTimeString() patch
    const _fakeDateToTimeString = function toTimeString() {
        if (Number.isNaN(this.getTime())) 
            return 'Invalid Date';

        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', minute: '2-digit', 
            second: '2-digit', hour12: false, 
            timeZone: tzProfile.zone
        });
        const parts = formatter.formatToParts(this);
        const p = {}; 
        for (const part of parts) 
            p[part.type] = part.value;

        return `${p.hour}:${p.minute}:${p.second} GMT${tzProfile.gmtOffset} (${tzProfile.name})`;
    };
    _OrigDate.prototype.toTimeString = _fakeDateToTimeString;
    hideFn(_fakeDateToTimeString, 'toTimeString');


    // These methods accept an optional options.timeZone argument
    // If missing, the browser uses the OS timezone => leaking real location 
    // inject tzProfile.zone as the default.
    ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].forEach(method => {
        const orig = _OrigDate.prototype[method];
        const fake = function(...args) {
            if (Number.isNaN(this.getTime())) 
                return 'Invalid Date';

            let locales = args[0] || languages[0];
            let options = args[1] ? { ...args[1] } : {};
            if (!options.timeZone) 
                options.timeZone = tzProfile.zone;

            return orig.call(this, locales, options);
        };
        _OrigDate.prototype[method] = fake;
        hideFn(fake, method);
    });



    // Date constructor
    const _FakeDate = function Date(...args) {
        if (!new.target) return _fakeDateToString.call(new _OrigDate());

        // no args or single-number timestamp => no local adjustment
        if (args.length === 0 || (args.length === 1 && typeof args[0] === 'number')) {
            return Reflect.construct(_OrigDate, args, new.target);
        }

        if (args.length === 1 && typeof args[0] === 'string') {
            const isISO = /^\d{4}-\d{2}-\d{2}(T|$)/.test(args[0]);
            if (isISO) 
                return Reflect.construct(_OrigDate, args, new.target);

            // non-ISO string parsed as local time
            // so we must adjust for the offset difference
            const temp = Reflect.construct(_OrigDate, args, _OrigDate);
            if (Number.isNaN(temp.getTime())) 
                return temp;
            const realOff = _realGetTimezoneOffset.call(temp);
            const adj = (tzProfile.offset - realOff) * 60000;

            return Reflect.construct(_OrigDate, [temp.getTime() + adj], new.target);
        }

        const temp = Reflect.construct(_OrigDate, args, _OrigDate);
        if (Number.isNaN(temp.getTime())) 
            return temp;

        const realOff = _realGetTimezoneOffset.call(temp);
        const adj = (tzProfile.offset - realOff) * 60000;

        return Reflect.construct(_OrigDate, [temp.getTime() + adj], new.target);
    };

    Object.defineProperty(_FakeDate, 'length', { value: 7, configurable: true });
    Object.defineProperty(_FakeDate, 'prototype', { value: _OrigDate.prototype, writable: false });
    Object.setPrototypeOf(_FakeDate, _OrigDate);
    window.Date = _FakeDate;
    hideFn(_FakeDate, 'Date');


    // -------- CANVAS -------
    // inject imperceptible sub-pixel position noise (0.0001 px) into
    // fillText() and fillRect() calls
    // noise is driven by the session PRNG
    const origFillText = CanvasRenderingContext2D.prototype.fillText;
    const fakeFillText = function fillText(text, x, y, maxWidth) {
        // invisible to the eye but change the pixel hash
        const dx = (rand() - 0.5) * 0.0001;
        const dy = (rand() - 0.5) * 0.0001;
        return maxWidth !== undefined
            ? origFillText.call(this, text, x + dx, y + dy, maxWidth)
            : origFillText.call(this, text, x + dx, y + dy);
    };
    CanvasRenderingContext2D.prototype.fillText = fakeFillText;
    hideFn(fakeFillText, "fillText");

    const origFillRect = CanvasRenderingContext2D.prototype.fillRect;
    const fakeFillRect = function fillRect(x, y, w, h) {
        return origFillRect.call(this, x + (rand() - 0.5) * 0.0001, y + (rand() - 0.5) * 0.0001, w, h);
    };
    CanvasRenderingContext2D.prototype.fillRect = fakeFillRect;
    hideFn(fakeFillRect, "fillRect");


    // ------- WEBGL -----
    // only 2 parameters are spoofed 
    // spoofing all the WebGL parameters will cause problems at rendering part
    const origWebGLGetParam  = WebGLRenderingContext.prototype.getParameter;
    const origWebGL2GetParam = WebGL2RenderingContext.prototype.getParameter;

    const fakeGetParam1 = function getParameter(param) {
        if (param === 0x9245) return webglProfile.vendor;
        if (param === 0x9246) return webglProfile.renderer;
        return origWebGLGetParam.call(this, param);
    };
    const fakeGetParam2 = function getParameter(param) {
        if (param === 0x9245) return webglProfile.vendor;
        if (param === 0x9246) return webglProfile.renderer;
        return origWebGL2GetParam.call(this, param);
    };
    WebGLRenderingContext.prototype.getParameter  = fakeGetParam1;
    WebGL2RenderingContext.prototype.getParameter = fakeGetParam2;
    hideFn(fakeGetParam1, "getParameter");
    hideFn(fakeGetParam2, "getParameter");


    // ------- AUDIO -------
    // add a tiny deterministic offset to the first N samples of every AudioBuffer channel
    const audioNoise = new WeakMap();

    // create 5 noise samples for each pair
    // using 5 samples is sufficient to alter the fingerprint hash without visibly affecting audio playback quality
    function getBufferNoise(buffer, channel) {
        if (!audioNoise.has(buffer)) audioNoise.set(buffer, {});
        const map = audioNoise.get(buffer);
        if (!map[channel]) {
            map[channel] = Array.from({ length: 5 }, () => (rand() - 0.5) * 1e-7);
        }
        return map[channel];
    }

    if (typeof AudioBuffer !== 'undefined') {
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        const fakeGetChannelData = function getChannelData(channel) {
            const data  = origGetChannelData.call(this, channel);
            const noise = getBufferNoise(this, channel);

            for (let i = 0; i < noise.length && i < data.length; i++) 
                data[i] += noise[i];

            return data;
        };
        AudioBuffer.prototype.getChannelData = fakeGetChannelData;
        hideFn(fakeGetChannelData, "getChannelData");

        const origCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
        const fakeCopyFromChannel = function copyFromChannel(destination, channelNumber, startInChannel = 0) {
            origCopyFromChannel.call(this, destination, channelNumber, startInChannel);
            const noise = getBufferNoise(this, channelNumber);
            
            // apply only the noise samples that fall within the destination slice
            for (let i = 0; i < noise.length; i++) {
                const destIdx = i - startInChannel;
                if (destIdx >= 0 && destIdx < destination.length) 
                    destination[destIdx] += noise[i];
            }
        };
        AudioBuffer.prototype.copyFromChannel = fakeCopyFromChannel;
        hideFn(fakeCopyFromChannel, "copyFromChannel");
    }


    // ------- WEBRTC ------
    // override RTCPeerConnection to force iceTransportPolicy = 'relay'.
    // in relay mode, only TURN servers are used => the client's real IP is never exposed in candidate strings
    const NativeRTC = window.RTCPeerConnection;
    if (NativeRTC) {
        function SpoofedRTCPeerConnection(config = {}) {
            // Merge caller config but force relay policy regardless
            const safeConfig = Object.assign({}, config, { iceTransportPolicy: 'relay' });
            return Reflect.construct(NativeRTC, [safeConfig], new.target || NativeRTC);
        }
        SpoofedRTCPeerConnection.prototype = NativeRTC.prototype;
        Object.setPrototypeOf(SpoofedRTCPeerConnection, NativeRTC);
        window.RTCPeerConnection = SpoofedRTCPeerConnection;
        hideFn(SpoofedRTCPeerConnection, "RTCPeerConnection");
    }


    // ------ SPEECH SYNTHESIS -------
    // filter the voice list to only include voices whose base language
    // code matches the first language in our spoofed navigator.languages
    if (window.speechSynthesis) {
        const ALLOWED = languages.map(l => l.toLowerCase().split('-')[0]);
        const origGetVoices = SpeechSynthesis.prototype.getVoices;
        const fakeGetVoices = function getVoices() {
            return origGetVoices.call(this).filter(v =>
                ALLOWED.includes(v.lang.toLowerCase().split('-')[0])
            );
        };
        SpeechSynthesis.prototype.getVoices = fakeGetVoices;
        hideFn(fakeGetVoices, "getVoices");
    }


    // ---------- WEB WORKERS ----------
    // Web Workers run in a separate JS realm with their own global object
    //
    // intercept the Worker and SharedWorker constructors and load the newly created Blob URL, instead of the original one
    // the spoofed values (UA, timezone offset, WebGL params, etc.) are included into the blob as JSON literals at construction 
    // time, ensuring the Worker sees the same profile as the main thread without needing postMessage
    const WORKER_SPOOF_SCRIPT = `(function() {
    var UA          = ${JSON.stringify(uaProfile.ua)};
    var PLATFORM    = ${JSON.stringify(uaProfile.platform)};
    var MEMORY      = ${memory};
    var CPU         = ${cpuCores};
    var LANGS       = ${JSON.stringify(languages)};
    var TZ_OFF      = ${tzProfile.offset};
    var TZ_GMT      = ${JSON.stringify(tzProfile.gmtOffset)};
    var TZ_NAME     = ${JSON.stringify(tzProfile.name)};
    var TZ_ZONE     = ${JSON.stringify(tzProfile.zone)};
    var GL_VENDOR   = ${JSON.stringify(webglProfile.vendor)};
    var GL_RENDERER = ${JSON.stringify(webglProfile.renderer)};
    var UAD_BRANDS  = ${JSON.stringify(uaProfile.uaData.brands)};
    var UAD_PLAT    = ${JSON.stringify(uaProfile.uaData.platform)};
    var UAD_PVER    = ${JSON.stringify(uaProfile.uaData.platformVersion)};
    var UAD_CHVER   = ${JSON.stringify(uaProfile.uaData.chromeVersion)};

    // WorkerNavigator is the Worker equivalent of Navigator
    var proto = WorkerNavigator.prototype;
    function def(prop, val) {
        Object.defineProperty(proto, prop, { get: function() { return val; }, configurable: true });
    }
    def('userAgent',           UA);
    def('appVersion',          UA.replace('Mozilla/', ''));
    def('platform',            PLATFORM);
    def('deviceMemory',        MEMORY);
    def('hardwareConcurrency', CPU);
    def('language',            LANGS[0]);
    def('languages',           Object.freeze(LANGS.slice()));
    try {
        def('userAgentData', {
            brands: UAD_BRANDS, mobile: false, platform: UAD_PLAT,
            getHighEntropyValues: function() {
                return Promise.resolve({
                    brands: UAD_BRANDS, mobile: false, platform: UAD_PLAT,
                    architecture: 'x86', bitness: '64', model: '',
                    platformVersion: UAD_PVER,
                    uaFullVersion: UAD_CHVER + '.0.6261.112'
                });
            },
            toJSON: function() { return { brands: UAD_BRANDS, mobile: false, platform: UAD_PLAT }; }
        });
    } catch(_) {}

    // Timezone spoofing
    var _OrigDate = Date;
    var _realGTO  = Date.prototype.getTimezoneOffset;

    var _OrigIntlDTF = Intl.DateTimeFormat;
    var _origRO = Intl.DateTimeFormat.prototype.resolvedOptions;

    var _FakeIntlDTF = function DateTimeFormat(locales, options) {
        var opts = options ? Object.assign({}, options) : {};
        if (!opts.timeZone) opts.timeZone = TZ_ZONE;
        return new.target
            ? Reflect.construct(_OrigIntlDTF, [locales, opts], new.target)
            : _OrigIntlDTF.call(this, locales, opts);
    };
    Object.defineProperty(_FakeIntlDTF, 'prototype', { value: _OrigIntlDTF.prototype, writable: false });
    Object.setPrototypeOf(_FakeIntlDTF, _OrigIntlDTF);
    _FakeIntlDTF.supportedLocalesOf = _OrigIntlDTF.supportedLocalesOf;
    Intl.DateTimeFormat = _FakeIntlDTF;

    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        var opts = _origRO.call(this);
        opts.locale = LANGS[0];
        opts.timeZone = TZ_ZONE;
        return opts;
    };

    Date.prototype.getTimezoneOffset = function() {
        if (Number.isNaN(this.getTime())) return NaN;
        return TZ_OFF;
    };

    // Local-time getters
    var _toSL = function(ts) { return new _OrigDate(ts - TZ_OFF * 60000); };
    var _getters = ['getFullYear','getMonth','getDate','getDay','getHours','getMinutes','getSeconds','getMilliseconds'];
    var _utcMap  = ['getUTCFullYear','getUTCMonth','getUTCDate','getUTCDay','getUTCHours','getUTCMinutes','getUTCSeconds','getUTCMilliseconds'];

    for (var _gi = 0; _gi < _getters.length; _gi++) {
        (function(idx) {
            var utcName = _utcMap[idx];
            Date.prototype[_getters[idx]] = function() {
                var ts = this.getTime();
                if (Number.isNaN(ts)) return NaN;
                return _toSL(ts)[utcName]();
            };
        })(_gi);
    }

    // String helpers for Date.toString()
    var _p2 = function(n) { return String(n).padStart(2,'0'); };
    var _DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    Date.prototype.toString = function() {
        if (Number.isNaN(this.getTime())) return 'Invalid Date';
        return _DAYS[this.getDay()] + ' ' + _MONTHS[this.getMonth()] + ' ' + _p2(this.getDate()) + ' ' +
               this.getFullYear() + ' ' + _p2(this.getHours()) + ':' + _p2(this.getMinutes()) + ':' + _p2(this.getSeconds()) +
               ' GMT' + TZ_GMT + ' (' + TZ_NAME + ')';
    };
    Date.prototype.toTimeString = function() {
        if (Number.isNaN(this.getTime())) return 'Invalid Date';
        return _p2(this.getHours()) + ':' + _p2(this.getMinutes()) + ':' + _p2(this.getSeconds()) +
               ' GMT' + TZ_GMT + ' (' + TZ_NAME + ')';
    };


    var _FakeDate = function Date() {
        var args = Array.prototype.slice.call(arguments);
        if (!new.target) return (new _FakeDate()).toString();
        if (args.length < 2) return Reflect.construct(_OrigDate, args, new.target);

        var temp = Reflect.construct(_OrigDate, args, _OrigDate);
        if (Number.isNaN(temp.getTime())) return temp;

        var realOff = _realGTO.call(temp);
        var adj     = (TZ_OFF - realOff) * 60000;
        return Reflect.construct(_OrigDate, [temp.getTime() + adj], new.target);
    };
    Object.defineProperty(_FakeDate, 'prototype', { value: _OrigDate.prototype, writable: false });
    Object.setPrototypeOf(_FakeDate, _OrigDate);
    self.Date = _FakeDate;

    try {
        var _origWGP  = WebGLRenderingContext.prototype.getParameter;
        var _origWG2P = WebGL2RenderingContext.prototype.getParameter;
        function _mkFakeGP(orig) {
            return function getParameter(param) {
                if (param === 0x9245) return GL_VENDOR;
                if (param === 0x9246) return GL_RENDERER;
                return orig.call(this, param);
            };
        }
        WebGLRenderingContext.prototype.getParameter  = _mkFakeGP(_origWGP);
        WebGL2RenderingContext.prototype.getParameter = _mkFakeGP(_origWG2P);
    } catch(_) {}
})();`;

    function makeSpoofedBlobURL(scriptURL) {
        const absoluteURL = String(new URL(scriptURL, location.href));
        let ou;
        try { ou = new URL(absoluteURL); } catch(_) { ou = null; }
        const locationPatch = ou ? `(function(){try{var p={href:${JSON.stringify(ou.href)},origin:${JSON.stringify(ou.origin)},protocol:${JSON.stringify(ou.protocol)},host:${JSON.stringify(ou.host)},hostname:${JSON.stringify(ou.hostname)},port:${JSON.stringify(ou.port)},pathname:${JSON.stringify(ou.pathname)},search:${JSON.stringify(ou.search)},hash:${JSON.stringify(ou.hash)}};var loc=self.location;Object.keys(p).forEach(function(k){var v=p[k];try{Object.defineProperty(loc,k,{get:function(){return v;},configurable:true});}catch(e){}});}catch(e){}})();` : '';
        const blob = new Blob(
            [WORKER_SPOOF_SCRIPT + '\n' + locationPatch + '\nimportScripts(' + JSON.stringify(absoluteURL) + ');'],
            { type: 'text/javascript' }
        );
        return URL.createObjectURL(blob);
    }

    const OrigWorker = window.Worker;

    function _workerNeedsInjection(scriptURL) {
        try {
            const host = new URL(scriptURL, location.href).hostname;
            if (host.endsWith('.googleapis.com') || host.endsWith('.google.com') ||
                host === 'google.com') return false;
        } catch (_) {}
        return true;
    }

    const FakeWorker = function Worker(scriptURL, options) {
        // Module workers use ES import => importScripts() is unavailable
        // we cannot inject our blob; pass through unchanged
        if (options && options.type === 'module') return new OrigWorker(scriptURL, options);
        if (!_workerNeedsInjection(scriptURL)) return new OrigWorker(scriptURL, options);
        try {
            const blobURL = makeSpoofedBlobURL(scriptURL);
            const worker  = new OrigWorker(blobURL, options);

            URL.revokeObjectURL(blobURL);
            return worker;
        } catch (e) { return new OrigWorker(scriptURL, options); }
    };
    FakeWorker.prototype = OrigWorker.prototype;
    Object.setPrototypeOf(FakeWorker, OrigWorker);
    window.Worker = FakeWorker;
    hideFn(FakeWorker, "Worker");

    // SharedWorker - same blob injection strategy
    const OrigSharedWorker = window.SharedWorker;
    if (OrigSharedWorker) {
        const FakeSharedWorker = function SharedWorker(scriptURL, options) {
            const isModule = options && typeof options === 'object' && options.type === 'module';
            if (isModule) return new OrigSharedWorker(scriptURL, options);
            if (!_workerNeedsInjection(scriptURL)) return new OrigSharedWorker(scriptURL, options);
            try {
                const blobURL = makeSpoofedBlobURL(scriptURL);
                const worker  = new OrigSharedWorker(blobURL, options);
                URL.revokeObjectURL(blobURL);
                return worker;
            } catch (e) { return new OrigSharedWorker(scriptURL, options); }
        };
        FakeSharedWorker.prototype = OrigSharedWorker.prototype;
        Object.setPrototypeOf(FakeSharedWorker, OrigSharedWorker);
        window.SharedWorker = FakeSharedWorker;
        hideFn(FakeSharedWorker, "SharedWorker");
    }


    // ------- Iframe -------
    // Each Iframe gets its own JS realm: separate window, Navigator, Date, Screen objects
    // Fingerprinting sites create hidden iframes to read un-patched property values from the fresh 
    // realm as a bypass technique
    //
    // intercept the contentWindow and contentDocument getters on HTMLIFrameElement.prototype
    // Whenever a script accesses an iframe's window, we run spoofIframeWindow() on it
    function spoofIframeWindow(cw) {
        if (!cw) return;
        try {
            if (cw.__ninja_spoofed) return;
            cw.__ninja_spoofed = true;

            // Replace Date and Intl directly
            Object.defineProperty(cw, 'Date', { value: window.Date, configurable: true });
            Object.defineProperty(cw, 'Intl', { value: window.Intl, configurable: true });

            // Navigator - must reapply all descriptors to that prototype
            const navProto = cw.Navigator && cw.Navigator.prototype;
            if (navProto) {
                Object.entries(navDescriptors).forEach(([prop, desc]) => {
                    Object.defineProperty(navProto, prop, { ...desc, configurable: true });
                });
                Object.defineProperty(navProto, 'webdriver', { get: () => false, configurable: true });
            }

            // Screen - same principle
            const scrProto = cw.Screen && cw.Screen.prototype;
            if (scrProto) {
                Object.entries(screenDescriptors).forEach(([prop, desc]) => {
                    Object.defineProperty(scrProto, prop, { ...desc, configurable: true });
                });
            }

            // WebGL
            if (cw.WebGLRenderingContext) {
                const origGP1 = cw.WebGLRenderingContext.prototype.getParameter;
                cw.WebGLRenderingContext.prototype.getParameter = function getParameter(param) {
                    if (param === 0x9245) return webglProfile.vendor;
                    if (param === 0x9246) return webglProfile.renderer;
                    return origGP1.call(this, param);
                };
            }
            if (cw.WebGL2RenderingContext) {
                const origGP2 = cw.WebGL2RenderingContext.prototype.getParameter;
                cw.WebGL2RenderingContext.prototype.getParameter = function getParameter(param) {
                    if (param === 0x9245) return webglProfile.vendor;
                    if (param === 0x9246) return webglProfile.renderer;
                    return origGP2.call(this, param);
                };
            }
        } catch (e) {
            // Cross-origin or sandboxed iframe - skip
        }
    }

    // triggers when the page reads iframe.contentWindow
    const iframeCWDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (iframeCWDescriptor) {
        const origGet = iframeCWDescriptor.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get: function() {
                const cw = origGet.call(this);
                spoofIframeWindow(cw);
                return cw;
            },
            configurable: true
        });
    }

    const iframeCDDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
    if (iframeCDDescriptor) {
        const origDocGet = iframeCDDescriptor.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
            get: function() {
                const doc = origDocGet.call(this);
                if (doc) spoofIframeWindow(doc.defaultView);
                return doc;
            },
            configurable: true
        });
    }
})();
