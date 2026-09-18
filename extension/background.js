// In-memory media request list.
// Nothing is sent to an external server — everything lives in this
// service worker's memory for the current browser session.
const mediaRequests = [];
const MAX_ITEMS = 100;

// Query params that only make sense for one specific byte-range chunk of
// a Drive videoplayback request. They are NOT part of Google's signed
// `sparams`/`lsparams` list, so removing them doesn't invalidate the
// signature — it just turns "give me bytes 0-150044" into "give me the
// whole file", which Chrome then renders as a normal playable page
// (with a native download control) instead of forcing a raw download.
const CHUNK_ONLY_PARAMS = ["range", "rn", "rbuf", "ump", "srfvp"];

// A short, well-known map of common itag values to human labels, so the
// list reads as "1080p" instead of a bare number. Falls back to the raw
// itag when we don't recognize it.
const ITAG_LABELS = {
  137: "1080p video",
  299: "1080p60 video",
  136: "720p video",
  298: "720p60 video",
  135: "480p video",
  134: "360p video",
  133: "240p video",
  160: "144p video",
  140: "128kbps audio",
  141: "256kbps audio",
  139: "48kbps audio",
  171: "vorbis audio",
  251: "opus audio (high)",
  250: "opus audio (med)",
  249: "opus audio (low)",
};

function looksLikeMedia(url) {
  const value = url.toLowerCase();
  return (
    value.includes("videoplayback") ||
    value.includes(".mp4") ||
    value.includes(".webm") ||
    value.includes(".m4a") ||
    value.includes(".mp3") ||
    value.includes(".aac") ||
    value.includes(".wav") ||
    value.includes(".ogg") ||
    value.includes("mime=video") ||
    value.includes("mime=audio")
  );
}

function isDriveVideoplayback(u) {
  return u.hostname.endsWith(".drive.google.com") && u.pathname.includes("videoplayback");
}

// Strips the chunk-specific params so the URL requests the full file.
// This does a literal substring removal (mirroring exactly what you'd do
// by hand in a text editor) rather than rebuilding the URL through
// URLSearchParams, because reserializing would re-percent-encode
// characters inside `sig`/`lsig` (colons, commas, "=") and risk producing
// bytes Google's signature check doesn't expect. Every other parameter is
// left completely untouched.
function cleanUrl(rawUrl, u) {
  if (!isDriveVideoplayback(u)) return rawUrl;

  let result = rawUrl;
  for (const key of CHUNK_ONLY_PARAMS) {
    result = result.replace(new RegExp(`[?&]${key}=[^&]*`, "g"), (match) =>
      match[0] === "?" ? "?" : ""
    );
  }
  // Tidy up if removal left a dangling "?" or "&" behind.
  result = result.replace(/\?&/, "?").replace(/&{2,}/g, "&").replace(/[?&]$/, "");
  return result;
}

// Drive/Google video URLs carry their own metadata as query params, which
// is far more reliable than trying to sniff it from network response
// headers on a chunked request.
function extractMeta(u) {
  if (!isDriveVideoplayback(u)) return {};
  const p = u.searchParams;
  const clen = p.get("clen");
  const dur = p.get("dur");
  const mime = p.get("mime"); // e.g. "video/mp4" or "audio/mp4"
  const itagRaw = p.get("itag");
  const itag = itagRaw ? Number(itagRaw) : null;

  return {
    size: clen ? Number(clen) : null,
    duration: dur ? Number(dur) : null,
    contentType: mime,
    itag,
    itagLabel: itag && ITAG_LABELS[itag] ? ITAG_LABELS[itag] : null,
  };
}

function guessType(contentType, u) {
  if (contentType) {
    if (contentType.startsWith("audio/")) return "audio";
    if (contentType.startsWith("video/")) return "video";
  }
  const value = u.toString().toLowerCase();
  if (value.includes("mime=audio") || /\.(mp3|m4a|aac|wav|ogg)(\?|$)/.test(value)) {
    return "audio";
  }
  return "video";
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!looksLikeMedia(details.url)) return;

    let u;
    try {
      u = new URL(details.url);
    } catch {
      return;
    }

    const meta = extractMeta(u);
    const clean = cleanUrl(details.url, u);

    // Dedupe on the cleaned URL: every byte-range chunk of the same
    // itag collapses into a single entry once range/rn/rbuf/ump/srfvp
    // are stripped, since those were the only params making the chunk
    // requests look different from each other.
    const existing = mediaRequests.find((item) => item.cleanUrl === clean);
    if (existing) {
      if (meta.size && !existing.size) existing.size = meta.size;
      return;
    }

    mediaRequests.unshift({
      url: details.url,
      cleanUrl: clean,
      type: guessType(meta.contentType, u),
      contentType: meta.contentType || null,
      size: meta.size || null,
      duration: meta.duration || null,
      itag: meta.itag || null,
      itagLabel: meta.itagLabel || null,
      timestamp: Date.now(),
    });

    if (mediaRequests.length > MAX_ITEMS) {
      mediaRequests.pop();
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_MEDIA") {
    // Largest first, so the biggest (usually highest quality/full) file
    // is easy to spot.
    const sorted = [...mediaRequests].sort((a, b) => (b.size || 0) - (a.size || 0));
    sendResponse({ items: sorted });
  }

  if (message?.type === "CLEAR_MEDIA") {
    mediaRequests.length = 0;
    sendResponse({ ok: true });
  }

  return true;
});
