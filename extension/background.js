// In-memory media request list.
// Nothing is sent to an external server.
const mediaRequests = [];

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

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!looksLikeMedia(details.url)) return;

    const exists = mediaRequests.some((item) => item.url === details.url);
    if (exists) return;

    mediaRequests.unshift({
      url: details.url,
      type: details.url.toLowerCase().includes("audio") ? "audio" : "video",
      timestamp: Date.now(),
    });

    // Keep the extension lightweight.
    if (mediaRequests.length > 100) {
      mediaRequests.pop();
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_MEDIA") {
    sendResponse({ items: mediaRequests });
  }

  if (message?.type === "CLEAR_MEDIA") {
    mediaRequests.length = 0;
    sendResponse({ ok: true });
  }

  return true;
});
