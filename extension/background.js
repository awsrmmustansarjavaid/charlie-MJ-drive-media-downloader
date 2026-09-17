// In-memory media request list.
// Nothing is sent to an external server — everything lives in this
// service worker's memory for the current browser session.
const mediaRequests = [];
const MAX_ITEMS = 100;

function looksLikeMedia(url) {
  const value = url.toLowerCase();

  // This is intentionally conservative. It identifies obvious media URLs
  // rather than attempting to defeat protected playback mechanisms.
  return (
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

function getHeader(headers, name) {
  if (!headers) return null;
  const hit = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return hit ? hit.value : null;
}

function guessType(url, contentType) {
  const value = url.toLowerCase();
  if (contentType) {
    if (contentType.startsWith("audio/")) return "audio";
    if (contentType.startsWith("video/")) return "video";
  }
  if (value.includes("mime=audio") || /\.(mp3|m4a|aac|wav|ogg)(\?|$)/.test(value)) {
    return "audio";
  }
  return "video";
}

function upsert(details, contentLength, contentType) {
  const existing = mediaRequests.find((item) => item.url === details.url);
  const size = contentLength ? Number(contentLength) : null;
  const type = guessType(details.url, contentType);

  if (existing) {
    // Fill in size/type once we actually learn it — some responses report
    // headers a moment after onCompleted fires.
    if (size && !existing.size) existing.size = size;
    if (contentType) existing.contentType = contentType;
    existing.type = type;
    return;
  }

  mediaRequests.unshift({
    url: details.url,
    type,
    contentType: contentType || null,
    size,
    timestamp: Date.now(),
  });

  if (mediaRequests.length > MAX_ITEMS) {
    mediaRequests.pop();
  }
}

// Capture size/type from response headers as soon as they're available.
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!looksLikeMedia(details.url)) return;
    const contentLength = getHeader(details.responseHeaders, "content-length");
    const contentType = getHeader(details.responseHeaders, "content-type");
    upsert(details, contentLength, contentType);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Fallback in case headers weren't captured (e.g. cached responses).
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!looksLikeMedia(details.url)) return;
    const contentLength = getHeader(details.responseHeaders, "content-length");
    const contentType = getHeader(details.responseHeaders, "content-type");
    upsert(details, contentLength, contentType);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_MEDIA") {
    // Largest first, so the biggest (usually highest quality) file is easy to spot.
    const sorted = [...mediaRequests].sort((a, b) => (b.size || 0) - (a.size || 0));
    sendResponse({ items: sorted });
  }

  if (message?.type === "CLEAR_MEDIA") {
    mediaRequests.length = 0;
    sendResponse({ ok: true });
  }

  return true;
});
