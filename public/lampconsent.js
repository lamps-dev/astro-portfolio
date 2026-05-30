/**
 * LampConsent v2 - drop-in cookie consent w/ auto vendor detection
 * material 3 themed, GTM + Google Consent Mode v2 ready
 * auto-detects google analytics, gtm, adsense, fb pixel, hotjar, etc
 *
 * built by lamp 🦆
 */
(function(global) {
  'use strict';

  // ============== VENDOR REGISTRY ==============
  const VENDOR_REGISTRY = [
    {
      id: 'google_analytics',
      name: 'Google Analytics',
      category: 'analytics',
      purpose: 'tracks page views, user behavior and audience demographics',
      cookies: ['_ga', '_gid', '_gat', '_ga_*', '_gac_*'],
      policy: 'https://policies.google.com/privacy',
      detect: {
        scripts: [/google-analytics\.com/i, /googletagmanager\.com\/gtag/i, /ga\.js/i, /analytics\.js/i],
        globals: ['ga', 'gtag', '__gaTracker'],
        cookies: [/^_ga/, /^_gid$/, /^_gat/],
      },
    },
    {
      id: 'google_tag_manager',
      name: 'Google Tag Manager',
      category: 'analytics',
      purpose: 'container that loads other tracking scripts',
      cookies: ['_dc_gtm_*'],
      policy: 'https://policies.google.com/privacy',
      detect: {
        scripts: [/googletagmanager\.com\/gtm\.js/i],
        globals: ['google_tag_manager', 'dataLayer'],
        cookies: [/^_dc_gtm/],
      },
    },
    {
      id: 'google_adsense',
      name: 'Google AdSense',
      category: 'advertising',
      purpose: 'serves personalized advertising and measures ad performance',
      cookies: ['__gads', '__gpi', '__eoi', 'IDE', 'NID'],
      policy: 'https://policies.google.com/technologies/ads',
      detect: {
        scripts: [/pagead2\.googlesyndication\.com/i, /googleadservices\.com/i, /adsbygoogle/i],
        globals: ['adsbygoogle', 'googletag'],
        cookies: [/^__gads$/, /^__gpi$/, /^__eoi$/, /^IDE$/],
      },
    },
    {
      id: 'google_ads',
      name: 'Google Ads (Conversion Tracking)',
      category: 'advertising',
      purpose: 'tracks ad conversions and remarketing audiences',
      cookies: ['_gcl_au', '_gcl_aw', '_gcl_dc'],
      policy: 'https://policies.google.com/technologies/ads',
      detect: {
        scripts: [/googleadservices\.com\/pagead\/conversion/i, /www\.google\.com\/ads/i],
        cookies: [/^_gcl_/],
      },
    },
    {
      id: 'facebook_pixel',
      name: 'Meta Pixel',
      category: 'advertising',
      purpose: 'tracks conversions and builds audiences for facebook/instagram ads',
      cookies: ['_fbp', '_fbc', 'fr'],
      policy: 'https://www.facebook.com/privacy/policy',
      detect: {
        scripts: [/connect\.facebook\.net.*fbevents/i, /facebook\.com\/tr/i],
        globals: ['fbq', '_fbq'],
        cookies: [/^_fbp$/, /^_fbc$/],
      },
    },
    {
      id: 'tiktok_pixel',
      name: 'TikTok Pixel',
      category: 'advertising',
      purpose: 'tracks ad conversions and audiences for tiktok ads',
      cookies: ['_ttp', 'ttwid'],
      policy: 'https://www.tiktok.com/legal/privacy-policy',
      detect: {
        scripts: [/analytics\.tiktok\.com/i, /tiktok\.com\/i18n\/pixel/i],
        globals: ['ttq', 'TiktokAnalyticsObject'],
        cookies: [/^_ttp$/, /^ttwid$/],
      },
    },
    {
      id: 'hotjar',
      name: 'Hotjar',
      category: 'analytics',
      purpose: 'session recordings and heatmaps to understand user behavior',
      cookies: ['_hjSession*', '_hjid', '_hjIncludedInSessionSample*'],
      policy: 'https://www.hotjar.com/legal/policies/privacy',
      detect: {
        scripts: [/static\.hotjar\.com/i, /script\.hotjar\.com/i],
        globals: ['hj', '_hjSettings'],
        cookies: [/^_hj/],
      },
    },
    {
      id: 'cloudflare_analytics',
      name: 'Cloudflare Web Analytics',
      category: 'analytics',
      purpose: 'privacy-friendly page view tracking',
      cookies: ['__cf_bm'],
      policy: 'https://www.cloudflare.com/privacypolicy/',
      detect: {
        scripts: [/static\.cloudflareinsights\.com/i],
        cookies: [/^__cf_bm$/],
      },
    },
    {
      id: 'plausible',
      name: 'Plausible Analytics',
      category: 'analytics',
      purpose: 'privacy-friendly analytics without cookies',
      cookies: [],
      policy: 'https://plausible.io/privacy',
      detect: { scripts: [/plausible\.io\/js/i], globals: ['plausible'] },
    },
    {
      id: 'umami',
      name: 'Umami Analytics',
      category: 'analytics',
      purpose: 'self-hosted privacy-friendly analytics',
      cookies: [],
      policy: '',
      detect: { scripts: [/umami\..*\/script\.js/i, /\/umami\.js/i], globals: ['umami'] },
    },
    {
      id: 'matomo',
      name: 'Matomo',
      category: 'analytics',
      purpose: 'self-hosted analytics platform',
      cookies: ['_pk_id*', '_pk_ses*', 'MATOMO_SESSID'],
      policy: 'https://matomo.org/privacy-policy/',
      detect: {
        scripts: [/matomo\.js/i, /piwik\.js/i],
        globals: ['_paq', 'Matomo', 'Piwik'],
        cookies: [/^_pk_/, /^MATOMO_/],
      },
    },
    {
      id: 'youtube_embed',
      name: 'YouTube Embeds',
      category: 'functional',
      purpose: 'embedded youtube videos (sets cookies for view tracking)',
      cookies: ['VISITOR_INFO1_LIVE', 'YSC', 'PREF', 'CONSENT'],
      policy: 'https://policies.google.com/privacy',
      detect: {
        iframes: [/youtube\.com\/embed/i, /youtube-nocookie\.com/i],
        scripts: [/youtube\.com\/iframe_api/i],
      },
    },
    {
      id: 'twitter_embed',
      name: 'Twitter/X Embeds',
      category: 'functional',
      purpose: 'embedded tweets and twitter widgets',
      cookies: ['guest_id', 'personalization_id'],
      policy: 'https://twitter.com/privacy',
      detect: {
        scripts: [/platform\.twitter\.com\/widgets/i],
        iframes: [/twitter\.com|x\.com/i],
      },
    },
    {
      id: 'vimeo_embed',
      name: 'Vimeo Embeds',
      category: 'functional',
      purpose: 'embedded vimeo videos',
      cookies: ['vuid'],
      policy: 'https://vimeo.com/privacy',
      detect: { iframes: [/player\.vimeo\.com/i] },
    },
    {
      id: 'discord_widget',
      name: 'Discord Widget',
      category: 'functional',
      purpose: 'embedded discord server widgets',
      cookies: [],
      policy: 'https://discord.com/privacy',
      detect: { iframes: [/discord\.com\/widget/i, /discordapp\.com\/widget/i] },
    },
    {
      id: 'cloudflare_turnstile',
      name: 'Cloudflare Turnstile',
      category: 'security',
      purpose: 'bot protection and captcha alternative',
      cookies: ['cf_clearance', '__cf_bm'],
      policy: 'https://www.cloudflare.com/privacypolicy/',
      detect: {
        scripts: [/challenges\.cloudflare\.com\/turnstile/i],
        globals: ['turnstile'],
      },
    },
    {
      id: 'recaptcha',
      name: 'Google reCAPTCHA',
      category: 'security',
      purpose: 'bot protection on forms',
      cookies: ['_GRECAPTCHA'],
      policy: 'https://policies.google.com/privacy',
      detect: {
        scripts: [/google\.com\/recaptcha/i, /gstatic\.com\/recaptcha/i],
        globals: ['grecaptcha'],
      },
    },
    {
      id: 'sentry',
      name: 'Sentry',
      category: 'necessary',
      purpose: 'error monitoring and performance tracking',
      cookies: [],
      policy: 'https://sentry.io/privacy/',
      detect: {
        scripts: [/sentry\.io|sentry-cdn\.com/i, /browser\.sentry-cdn\.com/i],
        globals: ['Sentry'],
      },
    },
    {
      id: 'intercom',
      name: 'Intercom',
      category: 'functional',
      purpose: 'customer messaging and live chat',
      cookies: ['intercom-*'],
      policy: 'https://www.intercom.com/legal/privacy',
      detect: {
        scripts: [/widget\.intercom\.io/i, /js\.intercomcdn\.com/i],
        globals: ['Intercom'],
        cookies: [/^intercom-/],
      },
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'necessary',
      purpose: 'payment processing and fraud prevention',
      cookies: ['__stripe_mid', '__stripe_sid'],
      policy: 'https://stripe.com/privacy',
      detect: {
        scripts: [/js\.stripe\.com/i],
        globals: ['Stripe'],
        cookies: [/^__stripe_/],
      },
    },
    {
      id: 'paypal',
      name: 'PayPal',
      category: 'necessary',
      purpose: 'payment processing',
      cookies: ['ts', 'ts_c', 'tsrce'],
      policy: 'https://www.paypal.com/privacy',
      detect: {
        scripts: [/paypal\.com\/sdk/i, /paypalobjects\.com/i],
        globals: ['paypal'],
      },
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      category: 'functional',
      purpose: 'email signup forms and marketing automation',
      cookies: ['mc_*'],
      policy: 'https://mailchimp.com/legal/privacy/',
      detect: {
        scripts: [/chimpstatic\.com|list-manage\.com/i, /mailchimp\.com\/embed/i],
        cookies: [/^mc_/],
      },
    },
    {
      id: 'linkedin_insight',
      name: 'LinkedIn Insight Tag',
      category: 'advertising',
      purpose: 'tracks linkedin ad conversions and audiences',
      cookies: ['li_*', 'AnalyticsSyncHistory', 'UserMatchHistory', 'lidc', 'bcookie', 'bscookie'],
      policy: 'https://www.linkedin.com/legal/privacy-policy',
      detect: {
        scripts: [/snap\.licdn\.com\/li\.lms-analytics/i, /platform\.linkedin\.com/i],
        globals: ['_linkedin_partner_id', 'lintrk'],
        cookies: [/^li_/, /^bcookie$/, /^lidc$/],
      },
    },
    {
      id: 'pinterest_tag',
      name: 'Pinterest Tag',
      category: 'advertising',
      purpose: 'tracks pinterest ad conversions',
      cookies: ['_pinterest_*', '_epik'],
      policy: 'https://policy.pinterest.com/privacy-policy',
      detect: {
        scripts: [/s\.pinimg\.com\/ct/i],
        globals: ['pintrk'],
        cookies: [/^_pinterest_/, /^_epik$/],
      },
    },
    {
      id: 'snap_pixel',
      name: 'Snap Pixel',
      category: 'advertising',
      purpose: 'tracks snapchat ad conversions',
      cookies: ['_scid', 'sc_at'],
      policy: 'https://snap.com/privacy',
      detect: {
        scripts: [/sc-static\.net\/scevent/i],
        globals: ['snaptr'],
        cookies: [/^_scid$/, /^sc_at$/],
      },
    },
  ];

  // ============== DEFAULT CONFIG ==============
  const DEFAULTS = {
    storageKey: 'lamp_consent',
    cookieDays: 365,
    storage: 'localStorage',
    position: 'bottom-right',
    theme: 'dark',
    accentColor: '#a8c7fa',
    accentTextColor: '#062e6f',
    showRejectButton: true,
    showManageButton: true,
    showFloatingTrigger: true,
    autoConsentMode: true,
    autoBlockGtag: true,
    autoDetectVendors: true,
    showVendorList: true,
    revisitDays: 180,

    texts: {
      title: 'we value your privacy',
      description: 'we use cookies for analytics, ads and to improve ur experience. u can chill and accept everything or pick what u want.',
      acceptAll: 'accept all',
      rejectAll: 'reject all',
      manage: 'manage',
      modalTitle: 'privacy settings',
      modalDescription: 'pick which cookies u want to allow. u can change this anytime.',
      save: 'save preferences',
      cancel: 'cancel',
      requiredBadge: 'required',
      floatingLabel: 'privacy',
      policyLink: '',
      policyLinkText: 'privacy policy',
      vendorsTitle: 'partners',
      vendorPurpose: 'purpose',
      vendorCookies: 'cookies',
      vendorPolicy: 'privacy policy',
      detectedBadge: 'detected',
      tabCategories: 'categories',
      tabVendors: 'partners',
      noVendors: 'no third-party partners detected on this page 🦆',
    },

    categories: [
      { id: 'necessary', name: 'strictly necessary', desc: 'required for the site to work.', required: true, gtag: [] },
      { id: 'functional', name: 'functional', desc: 'remembers ur preferences like theme and language', required: false, gtag: ['functionality_storage', 'personalization_storage'] },
      { id: 'analytics', name: 'analytics', desc: 'helps us understand how visitors use the site', required: false, gtag: ['analytics_storage'] },
      { id: 'advertising', name: 'advertising', desc: 'used to show relevant ads and measure performance', required: false, gtag: ['ad_storage', 'ad_user_data', 'ad_personalization'] },
      { id: 'security', name: 'security', desc: 'used for fraud prevention and bot protection', required: false, gtag: ['security_storage'] },
    ],

    customVendors: [],
    onAccept: null, onReject: null, onChange: null, onShow: null, onHide: null, onVendorDetected: null,
  };

  // ============== STATE ==============
  let cfg = null;
  let prefs = null;
  let bannerEl = null;
  let modalEl = null;
  let triggerEl = null;
  let injected = false;
  let detectedVendors = [];
  let allVendors = [];
  let currentTab = 'categories';

  // ============== STORAGE ==============
  const storage = {
    get(k) {
      if (cfg.storage === 'cookie') return readCookie(k);
      try { return localStorage.getItem(k); } catch(e) { return readCookie(k); }
    },
    set(k, v) {
      if (cfg.storage === 'cookie') { writeCookie(k, v, cfg.cookieDays); return; }
      try { localStorage.setItem(k, v); } catch(e) { writeCookie(k, v, cfg.cookieDays); }
    },
  };
  function writeCookie(name, value, days) {
    const exp = days ? '; expires=' + new Date(Date.now() + days*864e5).toUTCString() : '';
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + exp + '; path=/; SameSite=Lax';
  }
  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(^|; )' + encodeURIComponent(name) + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  // ============== VENDOR DETECTION ==============
  function detectVendors() {
    if (!cfg.autoDetectVendors) {
      allVendors = [...cfg.customVendors];
      return;
    }

    const scripts = [...document.querySelectorAll('script[src], script[data-src]')]
      .map(s => s.src || s.dataset.src).filter(Boolean);
    const blockedScripts = [...document.querySelectorAll('script[type="text/plain"]')]
      .map(s => s.getAttribute('src') || s.dataset.src).filter(Boolean);
    const iframes = [...document.querySelectorAll('iframe')].map(i => i.src).filter(Boolean);
    const cookieList = document.cookie.split('; ').map(c => c.split('=')[0]);
    const allScripts = [...scripts, ...blockedScripts];

    const detected = new Set();

    VENDOR_REGISTRY.forEach(vendor => {
      const d = vendor.detect || {};
      let found = false;
      if (d.scripts) for (const p of d.scripts) if (allScripts.some(s => p.test(s))) { found = true; break; }
      if (!found && d.iframes) for (const p of d.iframes) if (iframes.some(s => p.test(s))) { found = true; break; }
      if (!found && d.globals) for (const g of d.globals) if (typeof window[g] !== 'undefined') { found = true; break; }
      if (!found && d.cookies) for (const p of d.cookies) if (cookieList.some(c => p.test(c))) { found = true; break; }
      if (found) {
        detected.add(vendor.id);
        fireCallback('onVendorDetected', vendor);
      }
    });

    detectedVendors = VENDOR_REGISTRY.filter(v => detected.has(v.id));

    document.querySelectorAll('[data-lamp-vendor]').forEach(el => {
      const vid = el.getAttribute('data-lamp-vendor');
      const v = VENDOR_REGISTRY.find(x => x.id === vid);
      if (v && !detected.has(vid)) {
        detected.add(vid);
        detectedVendors.push(v);
      }
    });

    allVendors = [...detectedVendors, ...cfg.customVendors];
    if (detectedVendors.length > 0) {
      console.info('[LampConsent] 🦆 detected vendors:', detectedVendors.map(v => v.name).join(', '));
    }
  }

  // ============== CONSENT LOAD/SAVE ==============
  function loadPrefs() {
    const raw = storage.get(cfg.storageKey);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      const age = Date.now() - (data.ts || 0);
      if (age > cfg.revisitDays * 864e5) return null;
      return data;
    } catch(e) { return null; }
  }
  function savePrefs(reason) {
    const data = { prefs: {...prefs}, vendors: allVendors.map(v => v.id), reason, ts: Date.now(), v: 2 };
    storage.set(cfg.storageKey, JSON.stringify(data));
    if (cfg.autoConsentMode) updateGtagConsent();
    fireCallback('onChange', prefs);
    document.dispatchEvent(new CustomEvent('lampconsent:change', { detail: prefs }));
  }

  // ============== GTAG CONSENT MODE V2 ==============
  function setupGtagDefaults() {
    if (!cfg.autoConsentMode) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      analytics_storage: 'denied', functionality_storage: 'denied',
      personalization_storage: 'denied', security_storage: 'granted',
      wait_for_update: 500,
    });
  }
  function updateGtagConsent() {
    if (!window.gtag) return;
    const update = {};
    cfg.categories.forEach(cat => {
      const granted = prefs[cat.id] ? 'granted' : 'denied';
      (cat.gtag || []).forEach(key => { update[key] = granted; });
    });
    gtag('consent', 'update', update);
  }

  // ============== SCRIPT ACTIVATION ==============
  function activateBlockedScripts() {
    document.querySelectorAll('script[type="text/plain"][data-lamp-category]').forEach(orig => {
      const cat = orig.getAttribute('data-lamp-category');
      if (!prefs[cat]) return;
      activateScript(orig);
    });
    document.querySelectorAll('script[type="text/plain"][data-lamp-vendor]').forEach(orig => {
      const vid = orig.getAttribute('data-lamp-vendor');
      const vendor = allVendors.find(v => v.id === vid);
      if (!vendor || !prefs[vendor.category]) return;
      activateScript(orig);
    });
  }
  function activateScript(orig) {
    const s = document.createElement('script');
    [...orig.attributes].forEach(a => { if (a.name !== 'type') s.setAttribute(a.name, a.value); });
    s.text = orig.text;
    orig.parentNode.insertBefore(s, orig);
    orig.remove();
  }

  // ============== STYLES ==============
  function injectStyles() {
    if (document.getElementById('lampconsent-styles')) return;
    const isDark = cfg.theme === 'dark' || (cfg.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const bg = isDark ? '#1f1f1f' : '#ffffff';
    const bgAlt = isDark ? '#2a2a2a' : '#f8f9fa';
    const fg = isDark ? '#e3e3e3' : '#1f1f1f';
    const fgMuted = isDark ? '#c4c7c5' : '#5f6368';
    const fgSubtle = isDark ? '#9aa0a6' : '#80868b';
    const surface = isDark ? '#3c4043' : '#f1f3f4';
    const border = isDark ? '#3c4043' : '#dadce0';
    const trackOff = isDark ? '#3c4043' : '#dadce0';
    const trackBorderOff = isDark ? '#8e9197' : '#80868b';
    const thumbOff = isDark ? '#8e9197' : '#80868b';
    const accent = cfg.accentColor;
    const accentText = cfg.accentTextColor;

    const positions = {
      'bottom-right':  'bottom:20px; right:20px;',
      'bottom-left':   'bottom:20px; left:20px;',
      'bottom-center': 'bottom:20px; left:50%; transform:translateX(-50%);',
      'center':        'top:50%; left:50%; transform:translate(-50%,-50%);',
    };
    const positionCSS = positions[cfg.position] || positions['bottom-right'];
    const hiddenT = cfg.position === 'center' ? 'transform:translate(-50%,-50%) scale(0.92);'
      : (cfg.position === 'bottom-center' ? 'transform:translateX(-50%) translateY(40px) scale(0.96);'
      : 'transform:translateY(40px) scale(0.96);');
    const visibleT = cfg.position === 'center' ? 'transform:translate(-50%,-50%) scale(1);'
      : (cfg.position === 'bottom-center' ? 'transform:translateX(-50%) translateY(0) scale(1);'
      : 'transform:translateY(0) scale(1);');

    const css = `
.lc-banner,.lc-modal-backdrop,.lc-trigger{font-family:'Roboto','Segoe UI',system-ui,-apple-system,sans-serif;box-sizing:border-box}
.lc-banner *,.lc-modal *{box-sizing:border-box}
.lc-banner{position:fixed;${positionCSS}max-width:480px;width:calc(100% - 40px);background:${bg};color:${fg};border-radius:28px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.3),0 4px 8px 3px rgba(0,0,0,.15);opacity:0;${hiddenT}transition:opacity .4s cubic-bezier(.2,0,0,1),transform .4s cubic-bezier(.2,0,0,1);z-index:999998;pointer-events:none}
.lc-banner.lc-visible{opacity:1;${visibleT}pointer-events:auto}
.lc-banner.lc-hiding{opacity:0}
.lc-banner h3{margin:0 0 8px;font-size:16px;font-weight:500;color:${fg};letter-spacing:.1px;display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.lc-banner p{margin:0 0 16px;font-size:13px;line-height:1.5;color:${fgMuted}}
.lc-banner a{color:${accent};text-decoration:none}
.lc-vendor-count{display:inline-flex;align-items:center;gap:4px;font-size:11px;background:${surface};color:${fgMuted};padding:3px 8px;border-radius:10px}
.lc-actions{display:flex;gap:8px;flex-wrap:wrap}
.lc-btn{font-family:inherit;font-size:14px;font-weight:500;padding:10px 20px;border-radius:20px;border:none;cursor:pointer;transition:background .2s,transform .1s,box-shadow .2s,filter .2s;position:relative;overflow:hidden;-webkit-tap-highlight-color:transparent}
.lc-btn:active{transform:scale(.97)}
.lc-btn:focus-visible{outline:2px solid ${accent};outline-offset:2px}
.lc-btn-filled{background:${accent};color:${accentText}}
.lc-btn-filled:hover{filter:brightness(1.08);box-shadow:0 1px 2px rgba(0,0,0,.3)}
.lc-btn-tonal{background:${surface};color:${fg}}
.lc-btn-tonal:hover{filter:brightness(1.1)}
.lc-btn-text{background:transparent;color:${accent};padding:10px 12px}
.lc-btn-text:hover{background:${accent}1a}
.lc-ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.3);transform:scale(0);animation:lc-ripple-anim .6s ease-out;pointer-events:none}
@keyframes lc-ripple-anim{to{transform:scale(4);opacity:0}}
.lc-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:999999;padding:20px}
.lc-modal-backdrop.lc-visible{opacity:1;pointer-events:auto}
.lc-modal{background:${bg};color:${fg};border-radius:28px;width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;transform:scale(.85);opacity:0;transition:transform .35s cubic-bezier(.2,0,0,1),opacity .25s;box-shadow:0 4px 8px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.25);overflow:hidden}
.lc-modal-backdrop.lc-visible .lc-modal{transform:scale(1);opacity:1}
.lc-modal-header{padding:24px 24px 0}
.lc-modal-header h2{margin:0 0 6px;font-size:18px;font-weight:500;color:${fg}}
.lc-modal-header p{margin:0 0 12px;font-size:13px;color:${fgMuted}}
.lc-tabs{display:flex;gap:4px;padding:0 24px;border-bottom:1px solid ${border}}
.lc-tab{background:transparent;border:none;padding:12px 16px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;color:${fgMuted};border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .2s,border-color .2s;display:inline-flex;align-items:center;gap:6px}
.lc-tab:hover{color:${fg}}
.lc-tab.lc-tab-active{color:${accent};border-bottom-color:${accent}}
.lc-tab-badge{font-size:10px;background:${surface};color:${fgMuted};padding:2px 6px;border-radius:8px;font-weight:400}
.lc-tab.lc-tab-active .lc-tab-badge{background:${accent}33;color:${accent}}
.lc-modal-body{padding:8px 24px;overflow-y:auto;flex:1;min-height:200px}
.lc-tab-content{animation:lc-fade-in .25s ease-out}
@keyframes lc-fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.lc-modal-footer{padding:12px 24px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid ${border};flex-wrap:wrap}
.lc-toggle-row{display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid ${border}}
.lc-toggle-row:last-child{border-bottom:none}
.lc-toggle-info{flex:1;min-width:0}
.lc-toggle-info h4{margin:0 0 4px;font-size:14px;font-weight:500;color:${fg};display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lc-toggle-info p{margin:0;font-size:12px;color:${fgSubtle};line-height:1.5}
.lc-cat-vendors{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px}
.lc-vendor-chip{font-size:10px;background:${surface};color:${fgMuted};padding:3px 8px;border-radius:10px}
.lc-required-badge,.lc-detected-badge{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:400}
.lc-required-badge{background:${surface};color:${fgMuted}}
.lc-detected-badge{background:${accent}33;color:${accent}}
.lc-switch{position:relative;width:52px;height:32px;flex-shrink:0}
.lc-switch input{opacity:0;width:0;height:0}
.lc-track{position:absolute;inset:0;cursor:pointer;background:${trackOff};border:2px solid ${trackBorderOff};border-radius:16px;transition:background .25s,border-color .25s}
.lc-thumb{position:absolute;top:8px;left:8px;width:16px;height:16px;background:${thumbOff};border-radius:50%;transition:transform .25s cubic-bezier(.2,0,0,1),background .25s,width .25s,height .25s,top .25s,left .25s}
.lc-switch input:checked + .lc-track{background:${accent};border-color:${accent}}
.lc-switch input:checked + .lc-track .lc-thumb{background:${accentText};transform:translate(20px,0);width:24px;height:24px;top:2px;left:2px}
.lc-switch input:disabled + .lc-track{opacity:.5;cursor:not-allowed}
.lc-switch input:focus-visible + .lc-track{box-shadow:0 0 0 4px ${accent}40}
.lc-cat-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${fgSubtle};margin:16px 0 8px;font-weight:500}
.lc-cat-label:first-child{margin-top:0}
.lc-vendor-card{background:${bgAlt};border:1px solid ${border};border-radius:12px;padding:12px 14px;margin-bottom:8px;transition:border-color .2s}
.lc-vendor-card:hover{border-color:${trackBorderOff}}
.lc-vendor-header{display:flex;justify-content:space-between;align-items:center;cursor:pointer;gap:12px}
.lc-vendor-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;font-weight:500;color:${fg};flex:1;min-width:0}
.lc-vendor-cat{font-size:10px;background:${surface};color:${fgMuted};padding:2px 6px;border-radius:4px;font-weight:400}
.lc-vendor-chevron{color:${fgSubtle};transition:transform .2s;width:16px;height:16px;flex-shrink:0}
.lc-vendor-card.lc-expanded .lc-vendor-chevron{transform:rotate(180deg)}
.lc-vendor-details{max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(.2,0,0,1)}
.lc-vendor-card.lc-expanded .lc-vendor-details{max-height:500px}
.lc-vendor-details-inner{padding-top:12px;margin-top:12px;border-top:1px solid ${border};font-size:12px;color:${fgMuted};line-height:1.6}
.lc-vendor-details-inner strong{color:${fg};font-weight:500;display:block;margin-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.lc-vendor-details-inner strong:first-child{margin-top:0}
.lc-vendor-details-inner code{display:inline-block;background:${surface};color:${fg};padding:1px 6px;border-radius:4px;margin:2px 4px 2px 0;font-family:'SF Mono',Consolas,Monaco,monospace;font-size:11px}
.lc-vendor-details-inner a{color:${accent};text-decoration:none;word-break:break-all}
.lc-vendor-details-inner a:hover{text-decoration:underline}
.lc-empty{text-align:center;padding:32px 16px;color:${fgSubtle};font-size:13px}
.lc-trigger{position:fixed;bottom:20px;left:20px;background:${bg};color:${fg};border:1px solid ${border};padding:10px 16px;border-radius:24px;font-size:13px;font-weight:500;cursor:pointer;z-index:999997;opacity:0;transform:translateY(20px);transition:opacity .3s,transform .3s,background .2s,filter .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);display:inline-flex;align-items:center;gap:6px}
.lc-trigger.lc-visible{opacity:1;transform:translateY(0)}
.lc-trigger:hover{filter:brightness(1.1)}
.lc-trigger svg{width:16px;height:16px}
@media (max-width:520px){.lc-banner{border-radius:24px;padding:20px}.lc-modal{border-radius:24px;max-height:92vh}.lc-modal-footer{padding:12px 16px 16px}.lc-modal-header,.lc-modal-body{padding-left:20px;padding-right:20px}.lc-tabs{padding-left:20px;padding-right:20px}}
@media (prefers-reduced-motion:reduce){.lc-banner,.lc-modal,.lc-modal-backdrop,.lc-trigger,.lc-thumb,.lc-track,.lc-btn,.lc-vendor-details,.lc-tab{transition-duration:.01s !important}}
`;
    const style = document.createElement('style');
    style.id = 'lampconsent-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ============== UI BUILD ==============
  function buildBanner() {
    const t = cfg.texts;
    const policy = t.policyLink ? ` <a href="${t.policyLink}" target="_blank" rel="noopener">${escapeHtml(t.policyLinkText)}</a>.` : '';
    const vCount = allVendors.length;
    const vendorBadge = (vCount && cfg.showVendorList) ? `<span class="lc-vendor-count" title="${vCount} partners detected">${vCount} partners</span>` : '';

    bannerEl = document.createElement('div');
    bannerEl.className = 'lc-banner';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-labelledby', 'lc-title');
    bannerEl.innerHTML = `
      <h3 id="lc-title"><span>${escapeHtml(t.title)}</span>${vendorBadge}</h3>
      <p>${escapeHtml(t.description)}${policy}</p>
      <div class="lc-actions">
        <button class="lc-btn lc-btn-filled" data-action="accept">${escapeHtml(t.acceptAll)}</button>
        ${cfg.showRejectButton ? `<button class="lc-btn lc-btn-tonal" data-action="reject">${escapeHtml(t.rejectAll)}</button>` : ''}
        ${cfg.showManageButton ? `<button class="lc-btn lc-btn-text" data-action="manage">${escapeHtml(t.manage)}</button>` : ''}
      </div>`;
    bannerEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      ripple(btn, e);
      const a = btn.dataset.action;
      if (a === 'accept') acceptAll();
      else if (a === 'reject') rejectAll();
      else if (a === 'manage') openModal();
    });
    document.body.appendChild(bannerEl);
  }

  function buildModal() {
    const t = cfg.texts;
    const vCount = allVendors.length;
    const showTabs = cfg.showVendorList && vCount > 0;
    modalEl = document.createElement('div');
    modalEl.className = 'lc-modal-backdrop';
    modalEl.innerHTML = `
      <div class="lc-modal" role="dialog" aria-labelledby="lc-modal-title" aria-modal="true">
        <div class="lc-modal-header">
          <h2 id="lc-modal-title">${escapeHtml(t.modalTitle)}</h2>
          <p>${escapeHtml(t.modalDescription)}</p>
        </div>
        ${showTabs ? `
        <div class="lc-tabs" role="tablist">
          <button class="lc-tab lc-tab-active" data-tab="categories" role="tab">${escapeHtml(t.tabCategories)}</button>
          <button class="lc-tab" data-tab="vendors" role="tab">${escapeHtml(t.tabVendors)} <span class="lc-tab-badge">${vCount}</span></button>
        </div>` : ''}
        <div class="lc-modal-body"></div>
        <div class="lc-modal-footer">
          <button class="lc-btn lc-btn-text" data-action="cancel">${escapeHtml(t.cancel)}</button>
          <button class="lc-btn lc-btn-filled" data-action="save">${escapeHtml(t.save)}</button>
        </div>
      </div>`;
    modalEl.addEventListener('click', e => {
      if (e.target === modalEl) { closeModal(); return; }
      const tab = e.target.closest('button[data-tab]');
      if (tab) { switchTab(tab.dataset.tab); return; }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      ripple(btn, e);
      if (btn.dataset.action === 'cancel') closeModal();
      else if (btn.dataset.action === 'save') savePreferences();
    });
    document.body.appendChild(modalEl);
  }

  function switchTab(tab) {
    currentTab = tab;
    modalEl.querySelectorAll('.lc-tab').forEach(el => el.classList.toggle('lc-tab-active', el.dataset.tab === tab));
    renderBody();
  }

  function renderBody() {
    const body = modalEl.querySelector('.lc-modal-body');
    if (currentTab === 'vendors') {
      body.innerHTML = `<div class="lc-tab-content">${renderVendorList()}</div>`;
      attachVendorHandlers();
    } else {
      body.innerHTML = `<div class="lc-tab-content">${renderToggles()}</div>`;
      attachToggleHandlers();
    }
  }

  function renderToggles() {
    return cfg.categories.map(c => {
      const vendorsInCat = allVendors.filter(v => v.category === c.id);
      const chips = vendorsInCat.length
        ? `<div class="lc-cat-vendors">${vendorsInCat.map(v => `<span class="lc-vendor-chip">${escapeHtml(v.name)}</span>`).join('')}</div>` : '';
      return `<div class="lc-toggle-row">
        <div class="lc-toggle-info">
          <h4>${escapeHtml(c.name)}${c.required ? `<span class="lc-required-badge">${escapeHtml(cfg.texts.requiredBadge)}</span>` : ''}</h4>
          <p>${escapeHtml(c.desc)}</p>${chips}
        </div>
        <label class="lc-switch">
          <input type="checkbox" data-cat="${escapeHtml(c.id)}" ${prefs[c.id] ? 'checked' : ''} ${c.required ? 'disabled' : ''}>
          <span class="lc-track"><span class="lc-thumb"></span></span>
        </label>
      </div>`;
    }).join('');
  }
  function attachToggleHandlers() {
    modalEl.querySelectorAll('input[data-cat]').forEach(input => {
      input.addEventListener('change', e => { prefs[e.target.dataset.cat] = e.target.checked; });
    });
  }

  function renderVendorList() {
    if (allVendors.length === 0) return `<div class="lc-empty">${escapeHtml(cfg.texts.noVendors)}</div>`;
    const byCat = {};
    allVendors.forEach(v => { (byCat[v.category] = byCat[v.category] || []).push(v); });
    return cfg.categories.map(c => {
      const vs = byCat[c.id] || [];
      if (!vs.length) return '';
      return `<div class="lc-cat-label">${escapeHtml(c.name)}</div>${vs.map(v => renderVendorCard(v)).join('')}`;
    }).join('');
  }
  function renderVendorCard(v) {
    const isDetected = detectedVendors.some(d => d.id === v.id);
    const cookies = (v.cookies || []).slice(0, 8);
    return `<div class="lc-vendor-card" data-vendor-id="${escapeHtml(v.id)}">
        <div class="lc-vendor-header">
          <div class="lc-vendor-name">
            ${escapeHtml(v.name)}
            ${isDetected ? `<span class="lc-detected-badge">${escapeHtml(cfg.texts.detectedBadge)}</span>` : ''}
            <span class="lc-vendor-cat">${escapeHtml(v.category)}</span>
          </div>
          <svg class="lc-vendor-chevron" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div>
        <div class="lc-vendor-details"><div class="lc-vendor-details-inner">
          ${v.purpose ? `<strong>${escapeHtml(cfg.texts.vendorPurpose)}</strong>${escapeHtml(v.purpose)}` : ''}
          ${cookies.length ? `<strong>${escapeHtml(cfg.texts.vendorCookies)}</strong>${cookies.map(c => `<code>${escapeHtml(c)}</code>`).join('')}` : ''}
          ${v.policy ? `<strong>${escapeHtml(cfg.texts.vendorPolicy)}</strong><a href="${v.policy}" target="_blank" rel="noopener">${escapeHtml(v.policy)}</a>` : ''}
        </div></div>
      </div>`;
  }
  function attachVendorHandlers() {
    modalEl.querySelectorAll('.lc-vendor-card').forEach(card => {
      card.querySelector('.lc-vendor-header').addEventListener('click', () => card.classList.toggle('lc-expanded'));
    });
  }

  function buildTrigger() {
    if (!cfg.showFloatingTrigger) return;
    triggerEl = document.createElement('button');
    triggerEl.className = 'lc-trigger';
    triggerEl.setAttribute('aria-label', cfg.texts.floatingLabel);
    triggerEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg><span>${escapeHtml(cfg.texts.floatingLabel)}</span>`;
    triggerEl.addEventListener('click', openModal);
    document.body.appendChild(triggerEl);
    setTimeout(() => triggerEl.classList.add('lc-visible'), 100);
  }

  // ============== ACTIONS ==============
  function showBanner() {
    if (!bannerEl) return;
    setTimeout(() => { bannerEl.classList.add('lc-visible'); fireCallback('onShow'); }, 50);
  }
  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.add('lc-hiding');
    bannerEl.classList.remove('lc-visible');
    setTimeout(() => { bannerEl.classList.remove('lc-hiding'); fireCallback('onHide'); }, 400);
  }
  function openModal() {
    currentTab = 'categories';
    if (modalEl.querySelector('.lc-tab')) {
      modalEl.querySelectorAll('.lc-tab').forEach(t => t.classList.toggle('lc-tab-active', t.dataset.tab === 'categories'));
    }
    renderBody();
    modalEl.classList.add('lc-visible');
  }
  function closeModal() { modalEl.classList.remove('lc-visible'); }
  function acceptAll() {
    cfg.categories.forEach(c => { prefs[c.id] = true; });
    savePrefs('accepted_all');
    activateBlockedScripts();
    hideBanner();
    fireCallback('onAccept', prefs);
  }
  function rejectAll() {
    cfg.categories.forEach(c => { prefs[c.id] = !!c.required; });
    savePrefs('rejected_all');
    hideBanner();
    fireCallback('onReject', prefs);
  }
  function savePreferences() {
    savePrefs('custom');
    activateBlockedScripts();
    closeModal();
    hideBanner();
  }

  // ============== HELPERS ==============
  function ripple(btn, e) {
    const r = document.createElement('span');
    r.className = 'lc-ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = ((e.clientX || rect.left + rect.width/2) - rect.left - size/2) + 'px';
    r.style.top  = ((e.clientY || rect.top + rect.height/2) - rect.top - size/2) + 'px';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function fireCallback(name, arg) {
    if (typeof cfg[name] === 'function') {
      try { cfg[name](arg); } catch(e) { console.warn('[LampConsent]', name, e); }
    }
  }
  // Fresh-visitor default state for a category. Required categories are always
  // on; optional ones honor an explicit `default: true` (on-by-default but the
  // user can still turn them off), otherwise start off.
  function initialPref(c) {
    if (c.required) return true;
    return c.default !== undefined ? !!c.default : false;
  }
  function deepMerge(t, s) {
    if (!s) return t;
    for (const k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) t[k] = deepMerge(t[k] || {}, s[k]);
      else t[k] = s[k];
    }
    return t;
  }

  // ============== PUBLIC API ==============
  const LampConsent = {
    init(userConfig) {
      cfg = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), userConfig || {});
      setupGtagDefaults();
      const stored = loadPrefs();
      if (stored) {
        prefs = stored.prefs;
        if (cfg.autoConsentMode) updateGtagConsent();
      } else {
        prefs = {};
        cfg.categories.forEach(c => { prefs[c.id] = initialPref(c); });
      }
      const start = () => {
        if (injected) return;
        injected = true;
        detectVendors();
        injectStyles();
        buildBanner();
        buildModal();
        buildTrigger();
        if (stored) activateBlockedScripts();
        if (!stored) showBanner();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
      return this;
    },
    show: showBanner,
    hide: hideBanner,
    openSettings: openModal,
    closeSettings: closeModal,
    accept: acceptAll,
    reject: rejectAll,
    getConsent() { return prefs ? {...prefs} : null; },
    hasConsent(category) { return !!(prefs && prefs[category]); },
    getVendors() { return [...allVendors]; },
    getDetectedVendors() { return [...detectedVendors]; },
    rescan() {
      detectVendors();
      if (bannerEl) bannerEl.remove();
      if (modalEl) modalEl.remove();
      if (triggerEl) triggerEl.remove();
      injected = false;
      injectStyles();
      buildBanner();
      buildModal();
      buildTrigger();
    },
    // Re-attach the UI to the current document.body without re-running
    // detection or re-showing the banner. Useful for SPA / view-transition
    // frameworks (Astro ClientRouter, etc.) that swap <body> on navigation and
    // discard our runtime-injected nodes. Rebuilds anything that went missing.
    remount() {
      if (!injected) return;
      injectStyles(); // no-op if the <style> survived the swap
      // Re-append the existing detached nodes so their current state (a visible
      // banner, an open modal, the trigger) and event listeners are preserved.
      // Only build from scratch if a node was never created.
      if (bannerEl) { if (!document.body.contains(bannerEl)) document.body.appendChild(bannerEl); }
      else buildBanner();
      if (modalEl) { if (!document.body.contains(modalEl)) document.body.appendChild(modalEl); }
      else buildModal();
      if (cfg.showFloatingTrigger) {
        if (triggerEl) { if (!document.body.contains(triggerEl)) document.body.appendChild(triggerEl); }
        else buildTrigger();
      }
    },
    addVendor(v) { cfg.customVendors.push(v); allVendors.push(v); },
    reset() {
      if (cfg.storage === 'cookie') writeCookie(cfg.storageKey, '', -1);
      else { try { localStorage.removeItem(cfg.storageKey); } catch(e) {} }
      prefs = {};
      cfg.categories.forEach(c => { prefs[c.id] = initialPref(c); });
      showBanner();
    },
    on(event, fn) { document.addEventListener('lampconsent:' + event, e => fn(e.detail)); },
    VENDOR_REGISTRY,
  };

  const currentScript = document.currentScript;
  if (currentScript && currentScript.dataset.config) {
    try { LampConsent.init(JSON.parse(currentScript.dataset.config)); }
    catch(e) { console.warn('[LampConsent] invalid data-config:', e); }
  }

  global.LampConsent = LampConsent;
})(window);
