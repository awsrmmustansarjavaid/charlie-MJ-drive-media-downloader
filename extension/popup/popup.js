const list = document.getElementById("list");
const clearButton = document.getElementById("clear");

function formatSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = value < 10 && unitIndex > 0 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function render(items) {
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No obvious media requests detected yet.";
    list.appendChild(empty);
    return;
  }

  // Items already arrive sorted largest-first from the background script.
  const largestSize = items.reduce((max, item) => Math.max(max, item.size || 0), 0);

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item";
    if (item.size && item.size === largestSize) {
      row.classList.add("largest");
    }

    const main = document.createElement("div");
    main.className = "item-main";

    const top = document.createElement("div");
    top.className = "item-top";

    const chip = document.createElement("span");
    chip.className = `type-chip ${item.type}`;
    chip.textContent = item.type;
    top.appendChild(chip);

    const sizeText = formatSize(item.size);
    const sizeEl = document.createElement("span");
    sizeEl.className = sizeText ? "size" : "size unknown";
    sizeEl.textContent = sizeText || "size unknown";
    top.appendChild(sizeEl);

    if (item.size && item.size === largestSize) {
      const best = document.createElement("span");
      best.className = "badge-best";
      best.textContent = "Largest";
      top.appendChild(best);
    }

    main.appendChild(top);

    const urlEl = document.createElement("span");
    urlEl.className = "url";
    urlEl.textContent = item.url;
    main.appendChild(urlEl);

    const openBtn = document.createElement("button");
    openBtn.className = "open-btn";
    openBtn.textContent = "Open";
    openBtn.title = "Open in a new tab — use the player's ⋮ menu to download";
    openBtn.addEventListener("click", () => {
      // Open in a new tab rather than letting the browser guess how to
      // handle the URL. This lets the built-in player load the media so
      // the user can download it themselves via its own menu, instead of
      // the browser saving an unnamed/raw file straight to disk.
      chrome.tabs.create({ url: item.url, active: true });
    });

    row.append(main, openBtn);
    list.appendChild(row);
  }
}

chrome.runtime.sendMessage({ type: "GET_MEDIA" }, (response) => {
  render(response?.items || []);
});

clearButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_MEDIA" }, () => {
    render([]);
  });
});
