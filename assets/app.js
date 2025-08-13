(function() {
  const gridEl = document.getElementById("videoGrid");
  const statsEl = document.getElementById("videoStats");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const sentinelEl = document.getElementById("sentinel");
  const cardTpl = document.getElementById("videoCardTemplate");

  /** State */
  let allVideos = [];
  let filteredVideos = [];
  let renderIndex = 0;
  const RENDER_BATCH = 30;
  let lazyObserver = null;

  async function loadData() {
    const res = await fetch("/video_info.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat video_info.json: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.videos) ? json.videos : [];

    // Normalize
    allVideos = list.map((v) => {
      const duration = typeof v?.video_info?.duration === "number" ? v.video_info.duration : null;
      const durationFormatted = v?.video_info?.duration_formatted || (duration ? AppUtils.formatDuration(duration) : "");
      const size = typeof v?.video_info?.file_size === "number" ? v.video_info.file_size : null;
      const sizeFormatted = v?.video_info?.file_size_formatted || (size ? AppUtils.formatBytes(size) : "");
      const width = typeof v?.video_info?.width === "number" ? v.video_info.width : null;
      const height = typeof v?.video_info?.height === "number" ? v.video_info.height : null;
      return {
        id: String(v.id ?? ""),
        title: String(v.title ?? "Tanpa Judul"),
        url: AppUtils.safeTrimUrl(v.url ?? ""),
        thumbnail: AppUtils.normalizeThumbnailPath(v.thumbnail ?? ""),
        duration,
        durationFormatted,
        size,
        sizeFormatted,
        width,
        height,
        resolutionLabel: width && height ? `${height}p` : "",
      };
    });

    filteredVideos = allVideos.slice();
    updateStats();
    renderReset();
  }

  function updateStats() {
    statsEl.textContent = `${filteredVideos.length} video`;
  }

  function renderReset() {
    renderIndex = 0;
    gridEl.innerHTML = "";
    renderMore();
  }

  function renderMore() {
    const end = Math.min(renderIndex + RENDER_BATCH, filteredVideos.length);
    const frag = document.createDocumentFragment();

    for (let i = renderIndex; i < end; i++) {
      const v = filteredVideos[i];
      const node = cardTpl.content.firstElementChild.cloneNode(true);

      const href = `/player.html?id=${encodeURIComponent(v.id)}`;

      const thumbWrap = node.querySelector(".thumb-wrap");
      thumbWrap.href = href;

      const img = node.querySelector("img.thumb");
      img.setAttribute("alt", v.title);
      img.setAttribute("data-src", v.thumbnail);
      img.addEventListener("error", () => AppUtils.onImageErrorUseFallback(img));

      const durEl = node.querySelector(".badge.duration");
      if (v.durationFormatted) durEl.textContent = v.durationFormatted; else durEl.remove();

      const resEl = node.querySelector(".badge.resolution");
      if (v.resolutionLabel) resEl.textContent = v.resolutionLabel; else resEl.remove();

      const titleA = node.querySelector("a.title");
      titleA.href = href;
      titleA.textContent = v.title;

      const lengthEl = node.querySelector(".meta .length");
      lengthEl.textContent = v.durationFormatted || "-";

      const sizeEl = node.querySelector(".meta .size");
      sizeEl.textContent = v.sizeFormatted || "-";

      frag.appendChild(node);
    }

    gridEl.appendChild(frag);

    // Attach lazy loading after nodes are in DOM
    if (!lazyObserver) lazyObserver = AppUtils.createLazyImageObserver();
    const lazyImgs = gridEl.querySelectorAll("img.lazy[data-src]");
    if (lazyObserver) {
      lazyImgs.forEach(img => lazyObserver.observe(img));
    } else {
      // Fallback: eager load
      lazyImgs.forEach(img => { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); });
    }

    renderIndex = end;
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const sort = sortSelect.value;

    filteredVideos = allVideos.filter(v => {
      if (!q) return true;
      return v.title.toLowerCase().includes(q);
    });

    switch (sort) {
      case "title_asc":
        filteredVideos.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        filteredVideos.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "duration_desc":
        filteredVideos.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
        break;
      case "duration_asc":
        filteredVideos.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));
        break;
      case "size_desc":
        filteredVideos.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
        break;
      case "size_asc":
        filteredVideos.sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
        break;
      case "relevance":
      default:
        // Keep as filtered order
        break;
    }

    updateStats();
    renderReset();
  }

  function setupInfiniteScroll() {
    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", () => {
        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
        if (nearBottom && renderIndex < filteredVideos.length) renderMore();
      });
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (renderIndex < filteredVideos.length) {
            renderMore();
          }
        }
      }
    }, { rootMargin: "1000px 0px" });
    obs.observe(sentinelEl);
  }

  function restoreControlsFromQuery() {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    const s = params.get("sort");
    if (q) searchInput.value = q;
    if (s) sortSelect.value = s;
  }

  function syncQueryString() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
    if (sortSelect.value && sortSelect.value !== "relevance") params.set("sort", sortSelect.value);
    const url = `${location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    history.replaceState(null, "", url);
  }

  async function init() {
    restoreControlsFromQuery();

    const debouncedFilter = AppUtils.debounce(() => { applyFilters(); syncQueryString(); }, 200);
    searchInput.addEventListener("input", debouncedFilter);
    sortSelect.addEventListener("change", () => { applyFilters(); syncQueryString(); });

    await loadData();
    applyFilters();
    setupInfiniteScroll();
  }

  init().catch(err => {
    console.error(err);
    gridEl.innerHTML = `<div style="color:#f66;">Gagal memuat data: ${err.message}</div>`;
  });
})();