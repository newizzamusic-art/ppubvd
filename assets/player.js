(function() {
  const titleEl = document.getElementById("videoTitle");
  const videoEl = document.getElementById("videoEl");
  const metaEl = document.getElementById("videoMeta");
  const downloadBtn = document.getElementById("downloadBtn");
  const openSourceBtn = document.getElementById("openSourceBtn");
  const recGrid = document.getElementById("recGrid");
  const recTpl = document.getElementById("recCardTemplate");

  let allVideos = [];
  let currentVideo = null;

  function getIdFromQuery() {
    const params = new URLSearchParams(location.search);
    return params.get("id");
  }

  async function loadData() {
    const res = await fetch("/video_info.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat video_info.json: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.videos) ? json.videos : [];
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
  }

  function renderPlayer() {
    if (!currentVideo) {
      titleEl.textContent = "Video tidak ditemukan";
      metaEl.textContent = "Cek kembali tautan atau kembali ke beranda.";
      return;
    }

    const { title, url, durationFormatted, sizeFormatted, width, height } = currentVideo;
    titleEl.textContent = title;

    videoEl.src = url;
    videoEl.poster = currentVideo.thumbnail || "";

    downloadBtn.href = url;
    openSourceBtn.href = url;

    const metaParts = [];
    if (durationFormatted) metaParts.push(`Durasi: ${durationFormatted}`);
    if (width && height) metaParts.push(`Resolusi: ${width}×${height}`);
    if (sizeFormatted) metaParts.push(`Ukuran file: ${sizeFormatted}`);
    metaEl.textContent = metaParts.join("  •  ");
  }

  function renderRecommendations() {
    const others = allVideos.filter(v => v.id !== currentVideo.id);
    // Shuffle lightweight
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const picks = others.slice(0, 12);

    const frag = document.createDocumentFragment();
    for (const v of picks) {
      const node = recTpl.content.firstElementChild.cloneNode(true);
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

    recGrid.innerHTML = "";
    recGrid.appendChild(frag);

    const lazyObserver = AppUtils.createLazyImageObserver();
    const lazyImgs = recGrid.querySelectorAll("img.lazy[data-src]");
    if (lazyObserver) {
      lazyImgs.forEach(img => lazyObserver.observe(img));
    } else {
      lazyImgs.forEach(img => { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); });
    }
  }

  async function init() {
    await loadData();
    const id = getIdFromQuery();
    currentVideo = allVideos.find(v => v.id === id);
    renderPlayer();
    if (currentVideo) renderRecommendations();
  }

  init().catch(err => {
    console.error(err);
    titleEl.textContent = "Terjadi kesalahan";
    metaEl.textContent = err.message;
  });
})();