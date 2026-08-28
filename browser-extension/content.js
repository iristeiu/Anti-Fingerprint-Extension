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
        let a = 0, b = 0;
        for (let i = 0; i < seedStr.length; i++) {
            const c = seedStr.charCodeAt(i);
            a = Math.imul(31, a) + c | 0;
            b = Math.imul(37, b) + c | 0;
        }
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            b |= 0; b = b + 0x9E3779B9 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | b);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const rand    = makePRNG(seed);
    const _cvRand = makePRNG(seed + '_cv');
    const _audRand = makePRNG(seed + '_aud');
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    // Value Pools
    // Values used for setting the identity of the browser
    // Chrome versions on Windows 10 x64 -- sourced from StatCounter/IAmUnique reports
    // Structure of the profile:
    //          - the UA string
    //          - the platform string
    //          - full navigator.userAgentData structure (Client Hints API).
    const UA_PROFILES = [
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Google Chrome", version: "142" }, { brand: "Chromium", version: "142" }, { brand: "Not A Brand", version: "24" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "142",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Not A Brand", version: "24" }, { brand: "Chromium", version: "141" }, { brand: "Google Chrome", version: "141" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "141",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Chromium", version: "140" }, { brand: "Not A Brand", version: "24" }, { brand: "Google Chrome", version: "140" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "140",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Google Chrome", version: "139" }, { brand: "Not A Brand", version: "24" }, { brand: "Chromium", version: "139" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "139",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Chromium", version: "138" }, { brand: "Google Chrome", version: "138" }, { brand: "Not A Brand", version: "24" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "138",
            },
        },
        {
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            platform: "Win32",
            uaData: {
                brands: [{ brand: "Not A Brand", version: "24" }, { brand: "Google Chrome", version: "137" }, { brand: "Chromium", version: "137" }],
                mobile: false, platform: "Windows", platformVersion: "10.0.0", chromeVersion: "137",
            },
        },
    ];

    // Common GPU/driver combinations - sourced from Steam Hardware Survey
    const WEBGL_PROFILES = [
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
        { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    ];

    // Weights reflect real-world distribution: 16 GB (41%), 32 GB (36.87%), 8 GB (7.82%)
    const MEMORY_POOL   = [8, 16, 16, 16, 32, 32, 32];
    // 6 cores (28.02%), 8 cores (27.45%), 4 cores (13.26%), 10 cores (7.27%), 16 cores (5.64%)
    const CPU_POOL      = [4, 6, 6, 6, 8, 8, 8, 10, 16];

    // Language lists — English (39.48%), Spanish (4.84%), German (2.84%), French (2.38%), Italian (0.64%)
    const LANGUAGE_POOL = [
        ["en-GB", "en"],
        ["en-GB", "en"],
        ["en-US", "en"],
        ["es-ES", "es", "en-GB", "en"],
        ["de-DE", "de", "en-GB", "en"],
        ["fr-FR", "fr", "en-GB", "en"],
        ["it-IT", "it", "en-GB", "en"],
    ];

    // Timezone profiles for Western/Central Europe.
    const TIMEZONE_POOL = [
        { zone: "Europe/London",    offset: -60,  gmtOffset: "+0100", name: "British Summer Time"          },
        { zone: "Europe/Berlin",    offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Paris",     offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Warsaw",    offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
        { zone: "Europe/Rome",      offset: -120, gmtOffset: "+0200", name: "Central European Summer Time" },
    ];

    // availHeight = height minus taskbar (~40px)
    const SCREEN_PROFILES = [
        { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 },
        { width: 1536, height: 864,  availWidth: 1536, availHeight: 824  },
        { width: 1366, height: 768,  availWidth: 1366, availHeight: 728  },
        { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400 },
    ];

    const CANVAS_FONT_POOL = [
        'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS',
        'Georgia', 'Times New Roman', 'Courier New', 'Lucida Console',
        'Segoe UI', 'Calibri', 'Cambria', 'Comic Sans MS',
    ];

    // Choose the consistent profile available during one session
    const uaProfile    = pick(UA_PROFILES);
    const webglProfile = pick(WEBGL_PROFILES);
    const memory       = pick(MEMORY_POOL);
    const cpuCores     = pick(CPU_POOL);
    const languages    = pick(LANGUAGE_POOL);
    const tzProfile    = pick(TIMEZONE_POOL);
    const screenProfile = pick(SCREEN_PROFILES);
    const _canvasSubstituteFont = pick(CANVAS_FONT_POOL);

    // sync the picked UA profile to background.js
    // content.js runs in world:MAIN so chrome.runtime is unavailable
    // postMessage to bridge.js which forwards it using chrome.runtime.sendMessage
    window.postMessage({
        type: '__AFP_UPDATE_PROFILE__',
        profile: {
            ua:            uaProfile.ua,
            chromeVersion: uaProfile.uaData.chromeVersion,
            brands:        uaProfile.uaData.brands,
            language:      languages[0],
            languages:     languages,
        }
    }, '*');

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

    // ------- NAVIGATOR -------
    const uad = uaProfile.uaData;

    const _uadObject = {
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
            return { brands: uad.brands, mobile: uad.mobile, platform: uad.platform };
        },
    };
    hideFn(_uadObject.getHighEntropyValues, 'getHighEntropyValues');
    hideFn(_uadObject.toJSON, 'toJSON');

    const _navSpoofed = {
        userAgent:           uaProfile.ua,
        appVersion:          uaProfile.ua.replace("Mozilla/", ""),
        platform:            uaProfile.platform,
        deviceMemory:        memory,
        hardwareConcurrency: cpuCores,
        language:            languages[0],
        vendor:              "Google Inc.",
        webdriver:           false,
        userAgentData:       _uadObject,
    };

    const _realNavigator = navigator;
    const _navigatorProxy = new Proxy(_realNavigator, {
        get(target, prop) {
            if (prop === 'languages') return Object.freeze([...languages]);
            if (Object.prototype.hasOwnProperty.call(_navSpoofed, prop)) return _navSpoofed[prop];
            const val = Reflect.get(target, prop, target);
            return typeof val === 'function' ? val.bind(target) : val;
        },
        ownKeys:                  (t) => Reflect.ownKeys(t),
        getOwnPropertyDescriptor: (t, p) => Reflect.getOwnPropertyDescriptor(t, p),
        has:                      (t, p) => Reflect.has(t, p),
    });

    Object.defineProperty(window, 'navigator', {
        get: () => _navigatorProxy,
        enumerable: true,
        configurable: true,
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

    // Date.toString() / toTimeString() patch
    // Format: "Mon May 04 2026 14:30:00 GMT+0200 (Central European Summer Time)"
    const _dateStrDays   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const _dateStrMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const _pad2 = n => String(n).padStart(2, '0');

    const _fakeDateToString = function toString() {
        if (Number.isNaN(this.getTime())) return 'Invalid Date';
        return `${_dateStrDays[this.getDay()]} ${_dateStrMonths[this.getMonth()]} ${_pad2(this.getDate())} ${this.getFullYear()} ${_pad2(this.getHours())}:${_pad2(this.getMinutes())}:${_pad2(this.getSeconds())} GMT${tzProfile.gmtOffset} (${tzProfile.name})`;
    };
    _OrigDate.prototype.toString = _fakeDateToString;
    hideFn(_fakeDateToString, 'toString');

    const _fakeDateToTimeString = function toTimeString() {
        if (Number.isNaN(this.getTime())) return 'Invalid Date';
        return `${_pad2(this.getHours())}:${_pad2(this.getMinutes())}:${_pad2(this.getSeconds())} GMT${tzProfile.gmtOffset} (${tzProfile.name})`;
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
    // (i) ParseColor - perturb each RGB channel of fillStyle/strokeStyle by +/-1.
    // (ii) SetFont - substitute the requested font family with a session-chosen font.
    // (iii) toDataURL - apply the same per-session deltas to every non-transparent pixel.

    const _colorDeltaR = _cvRand() > 0.5 ? 1 : -1;
    const _colorDeltaG = _cvRand() > 0.5 ? 1 : -1;
    const _colorDeltaB = _cvRand() > 0.5 ? 1 : -1;

    const _colorNormCanvas = document.createElement('canvas');
    _colorNormCanvas.width = _colorNormCanvas.height = 1;
    const _colorNormCtx = _colorNormCanvas.getContext('2d');

    const _origFillStyleDesc   = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
    const _origStrokeStyleDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'strokeStyle');

    function _perturbColor(value) {
        if (typeof value !== 'string') return value;
        _origFillStyleDesc.set.call(_colorNormCtx, value);
        const normalized = _origFillStyleDesc.get.call(_colorNormCtx);
        const m = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return value;
        const r = Math.max(0, Math.min(255, +m[1] + _colorDeltaR));
        const g = Math.max(0, Math.min(255, +m[2] + _colorDeltaG));
        const b = Math.max(0, Math.min(255, +m[3] + _colorDeltaB));
        return m[4] !== undefined ? `rgba(${r},${g},${b},${m[4]})` : `rgb(${r},${g},${b})`;
    }

    const _fakeFillStyleSet = function(value) {
        _origFillStyleDesc.set.call(this, _perturbColor(value));
    };
    const _fakeFillStyleGet = _origFillStyleDesc.get;
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
        get: _fakeFillStyleGet, set: _fakeFillStyleSet, configurable: true,
    });
    hideFn(_fakeFillStyleSet, 'set fillStyle');

    const _fakeStrokeStyleSet = function(value) {
        _origStrokeStyleDesc.set.call(this, _perturbColor(value));
    };
    const _fakeStrokeStyleGet = _origStrokeStyleDesc.get;
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'strokeStyle', {
        get: _fakeStrokeStyleGet, set: _fakeStrokeStyleSet, configurable: true,
    });
    hideFn(_fakeStrokeStyleSet, 'set strokeStyle');

    const _origFontDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    const _fakeFontSet = function(value) {
        const modified = value.replace(
            /(\d+(?:\.\d+)?(?:px|pt|em|rem|%|vh|vw))\s+.+$/,
            `$1 ${_canvasSubstituteFont}`
        );
        _origFontDesc.set.call(this, modified || value);
    };
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
        get: _origFontDesc.get, set: _fakeFontSet, configurable: true,
    });
    hideFn(_fakeFontSet, 'set font');

    const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
        const w = this.width, h = this.height;
        if (!w || !h) return _origToDataURL.call(this, type, quality);
        try {
            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(this, 0, 0);
            const id = tctx.getImageData(0, 0, w, h);
            const d  = id.data;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                d[i]     = Math.max(0, Math.min(255, d[i]     + _colorDeltaR));
                d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + _colorDeltaG));
                d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + _colorDeltaB));
            }
            tctx.putImageData(id, 0, 0);
            return _origToDataURL.call(tmp, type, quality);
        } catch (_) {
            return _origToDataURL.call(this, type, quality);
        }
    };
    hideFn(HTMLCanvasElement.prototype.toDataURL, 'toDataURL');


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
    const audioNoised = new WeakMap();

    if (typeof AudioBuffer !== 'undefined') {
        const origGetChannelData = AudioBuffer.prototype.getChannelData;

        function ensureNoised(buffer, channel) {
            if (!audioNoised.has(buffer)) audioNoised.set(buffer, new Set());
            const applied = audioNoised.get(buffer);
            if (applied.has(channel)) return;
            applied.add(channel);

            const data = origGetChannelData.call(buffer, channel);
            const len  = data.length;

            const winLen   = Math.floor(len * (0.7 + _audRand() * 0.2));
            const winStart = Math.floor(_audRand() * (len - winLen));

            const chunkSize = 200;
            for (let chunkStart = winStart; chunkStart < winStart + winLen; chunkStart += chunkSize) {
                const frac         = (chunkStart - winStart) / winLen;
                const edgeFade     = Math.min(frac, 1 - frac) * 2;
                const chunkEnd     = Math.min(chunkStart + chunkSize, winStart + winLen);
                const chunkDensity = _audRand() * 0.25 * edgeFade;
                for (let i = chunkStart; i < chunkEnd; i++) {
                    if (_audRand() < chunkDensity) {
                        data[i] += (_audRand() - 0.5) * 1e-5;
                    }
                }
            }
        }

        const fakeGetChannelData = function getChannelData(channel) {
            ensureNoised(this, channel);
            return origGetChannelData.call(this, channel);
        };
        AudioBuffer.prototype.getChannelData = fakeGetChannelData;
        hideFn(fakeGetChannelData, "getChannelData");

        const origCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
        const fakeCopyFromChannel = function copyFromChannel(destination, channelNumber, startInChannel = 0) {
            ensureNoised(this, channelNumber);
            origCopyFromChannel.call(this, destination, channelNumber, startInChannel);
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

    // Local-time setters
    var _setterMap = {
        setHours: 'setUTCHours', setMinutes: 'setUTCMinutes',
        setSeconds: 'setUTCSeconds', setMilliseconds: 'setUTCMilliseconds',
        setDate: 'setUTCDate', setMonth: 'setUTCMonth', setFullYear: 'setUTCFullYear'
    };
    Object.keys(_setterMap).forEach(function(name) {
        var utcName = _setterMap[name];
        var orig = _OrigDate.prototype[utcName];
        Date.prototype[name] = function() {
            var args = Array.prototype.slice.call(arguments);
            var shifted = new _OrigDate(this.getTime() - TZ_OFF * 60000);
            orig.apply(shifted, args);
            this.setTime(shifted.getTime() + TZ_OFF * 60000);
            return this.getTime();
        };
    });

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
            if (cw.spoofed) return;
            cw.spoofed = true;

            // Replace Date and Intl directly
            Object.defineProperty(cw, 'Date', { value: window.Date, configurable: true });
            Object.defineProperty(cw, 'Intl', { value: window.Intl, configurable: true });

            // Navigator — wrap the iframe's navigator with the same Proxy pattern
            if (cw.navigator) {
                const _iframeNav = cw.navigator;
                const _iframeNavProxy = new cw.Proxy(_iframeNav, {
                    get(target, prop) {
                        if (prop === 'languages') return cw.Object.freeze([...languages]);
                        if (cw.Object.prototype.hasOwnProperty.call(_navSpoofed, prop)) return _navSpoofed[prop];
                        const val = cw.Reflect.get(target, prop, target);
                        return typeof val === 'function' ? val.bind(target) : val;
                    },
                    ownKeys:                  (t) => cw.Reflect.ownKeys(t),
                    getOwnPropertyDescriptor: (t, p) => cw.Reflect.getOwnPropertyDescriptor(t, p),
                    has:                      (t, p) => cw.Reflect.has(t, p),
                });
                cw.Object.defineProperty(cw, 'navigator', {
                    get: () => _iframeNavProxy,
                    enumerable: true,
                    configurable: true,
                });
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
