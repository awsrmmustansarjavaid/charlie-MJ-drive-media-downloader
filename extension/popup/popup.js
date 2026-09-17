const list = document.getElementById("list");
const clearButton = document.getElementById("clear");

function render(items) {
  list.innerHTML = "";

  if (!items.length) {
    list.textContent = "No obvious media requests detected.";
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item";

    const title = document.createElement("strong");
    title.textContent = item.type;

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.url;

    row.append(title, link);
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
