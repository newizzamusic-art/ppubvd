(function() {
  function debounce(fn, delayMs) {
    let timerId = null;
    return function(...args) {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => fn.apply(this, args), delayMs);
    };
  }

  function formatBytes(bytes) {
    if (bytes === 0 || bytes === undefined || bytes === null) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
  }

  function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== "number" || !isFinite(totalSeconds)) return "";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function normalizeThumbnailPath(path) {
    if (!path) return "";
    const normalized = String(path).replace(/\\/g, "/").replace(/^\.\//, "");
    return normalized;
  }

  function safeTrimUrl(url) {
    if (!url) return "";
    return String(url).trim();
  }

  function createLazyImageObserver() {
    if (!("IntersectionObserver" in window)) return null;
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.getAttribute("data-src");
          if (dataSrc) {
            img.src = dataSrc;
            img.removeAttribute("data-src");
            img.classList.remove("lazy");
          }
          obs.unobserve(img);
        }
      }
    }, { rootMargin: "500px 0px" });
    return observer;
  }

  function onImageErrorUseFallback(img) {
    if (!img) return;
    img.classList.add("fallback");
  }

  window.AppUtils = {
    debounce,
    formatBytes,
    formatDuration,
    normalizeThumbnailPath,
    safeTrimUrl,
    createLazyImageObserver,
    onImageErrorUseFallback,
  };
})();