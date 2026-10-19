'use strict';
// Known advertising, analytics and tracking domains. Subdomains are matched too
// (e.g. "stats.g.doubleclick.net" matches "doubleclick.net").
const TRACKERS = [
  // Google ads & analytics
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'google-analytics.com',
  'googletagmanager.com', 'googletagservices.com', 'adservice.google.com', 'app-measurement.com',
  'imasdk.googleapis.com', 'pagead2.googlesyndication.com', 'adsense.com',
  // Meta
  'connect.facebook.net', 'pixel.facebook.com', 'an.facebook.com', 'graph.instagram.com',
  // Microsoft / LinkedIn / X / TikTok / Snap / Pinterest / Reddit
  'bat.bing.com', 'clarity.ms', 'c.clarity.ms', 'ads.linkedin.com', 'px.ads.linkedin.com', 'snap.licdn.com',
  'analytics.twitter.com', 'ads-twitter.com', 'static.ads-twitter.com', 'analytics.tiktok.com',
  'ads.tiktok.com', 'sc-static.net', 'tr.snapchat.com', 'ct.pinterest.com', 'log.pinterest.com',
  'events.redditmedia.com', 'alb.reddit.com', 'pixel.reddit.com',
  // Amazon ads
  'amazon-adsystem.com', 'aax.amazon-adsystem.com', 'assoc-amazon.com',
  // Analytics & session recording
  'hotjar.com', 'hotjar.io', 'mouseflow.com', 'fullstory.com', 'crazyegg.com', 'luckyorange.com',
  'luckyorange.net', 'inspectlet.com', 'smartlook.com', 'logrocket.io', 'lr-ingest.io',
  'mixpanel.com', 'segment.io', 'segment.com', 'cdn.segment.com', 'api.segment.io', 'amplitude.com',
  'heap.io', 'heapanalytics.com', 'kissmetrics.com', 'quantserve.com', 'quantcount.com',
  'scorecardresearch.com', 'chartbeat.com', 'chartbeat.net', 'newrelic.com', 'nr-data.net',
  'statcounter.com', 'histats.com', 'yandex.ru/metrika', 'mc.yandex.ru', 'mc.yandex.com',
  'matomo.cloud', 'parsely.com', 'parse.ly', 'optimizely.com', 'cdn.optimizely.com', 'vwo.com',
  'dev.visualwebsiteoptimizer.com', 'omtrdc.net', '2o7.net', 'demdex.net', 'everesttech.net',
  'adobedtm.com', 'branch.io', 'app.link', 'adjust.com', 'appsflyer.com', 'kochava.com',
  'sentry-cdn.com', 'bugsnag.com', 'pendo.io', 'intercomcdn.com', 'clicky.com', 'static.getclicky.com',
  // Ad networks & exchanges
  'adnxs.com', 'adsrvr.org', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'outbrainimg.com',
  'rubiconproject.com', 'pubmatic.com', 'openx.net', 'casalemedia.com', 'indexww.com', 'contextweb.com',
  'smartadserver.com', 'teads.tv', 'yieldmo.com', '33across.com', 'sharethrough.com', 'triplelift.com',
  '3lift.com', 'media.net', 'adform.net', 'adition.com', 'bidswitch.net', 'sovrn.com', 'lijit.com',
  'gumgum.com', 'moatads.com', 'doubleverify.com', 'adsafeprotected.com', 'serving-sys.com', 'flashtalking.com',
  'mathtag.com', 'turn.com', 'bluekai.com', 'krxd.net', 'exelator.com', 'rlcdn.com', 'liveramp.com',
  'tapad.com', 'agkn.com', 'adroll.com', 'nextroll.com', 'perfectaudience.com', 'zemanta.com',
  'revcontent.com', 'mgid.com', 'propellerads.com', 'popads.net', 'popcash.net', 'adcash.com',
  'exoclick.com', 'juicyads.com', 'trafficjunky.net', 'admixer.net', 'yieldlab.net', 'adhigh.net',
  'smaato.net', 'inmobi.com', 'unityads.unity3d.com', 'applovin.com', 'vungle.com', 'chartboost.com',
  'ironsrc.com', 'mopub.com', 'zedo.com', 'advertising.com', 'adtechus.com', 'yieldmanager.com',
  'quantcast.com', 'lotame.com', 'crwdcntrl.net', 'eyeota.net', 'id5-sync.com', 'onetrust.io',
  'permutive.com', 'permutive.app', 'tiqcdn.com', 'tealiumiq.com', 'ensighten.com', 'brightcove.net/analytics',
  'addthis.com', 'addtoany.com', 'sharethis.com', 'po.st', 'disqusads.com', 'dotomi.com',
  'emxdgt.com', 'gammaplatform.com', 'adnium.com', 'imrworldwide.com', 'cxense.com', 'hs-analytics.net',
  'hs-banner.com', 'hubspot.net/analytics', 'trk.klclick.com', 'static.klaviyo.com/onsite/js/klaviyo.js',
  // Fingerprinting services
  'fingerprintjs.com', 'fpjs.io', 'fpcdn.io', 'iovation.com', 'threatmetrix.com', 'online-metrix.net',
  'deviceatlas.com', 'maxmind.com/js'
];

const SET = new Set(TRACKERS.filter(d => !d.includes('/')));

// Returns the matching tracker domain, or null.
function isTracker(host) {
  if (!host) return null;
  host = host.toLowerCase();
  let h = host;
  while (h) {
    if (SET.has(h)) return h;
    const i = h.indexOf('.');
    if (i < 0) break;
    h = h.slice(i + 1);
  }
  return null;
}

module.exports = { isTracker, TRACKER_COUNT: SET.size };
