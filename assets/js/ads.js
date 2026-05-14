/* =========================================================
   광고 영역 렌더러
   - data/ads.json 설정을 읽어 각 ad-slot 에 배너를 채움
   - enabled:false 면 "광고 영역 준비중" placeholder 유지
   - 사용법:
       <div class="ad-slot ad-top"        data-ad="top"></div>
       <div class="ad-slot ad-side-top"   data-ad="sideTop"></div>
       <div class="ad-slot ad-inarticle"  data-ad="inarticle"></div>
       <div class="ad-slot ad-side-bottom" data-ad="sideBottom"></div>
       <div class="ad-slot ad-bottom"     data-ad="bottom"></div>
   ========================================================= */
(function () {
  const SLOT_SELECTOR = "[data-ad]";

  // 기본 placeholder 텍스트
  const PLACEHOLDER_LABEL = {
    top:         "광고 영역 준비중 · 메인 상단 (468×60)",
    side:        "광고 영역 준비중 · 사이드",
    sideTop:     "광고 영역 준비중 · 사이드 상단 (280×240)",
    sideBottom:  "광고 영역 준비중 · 사이드 하단 (250×250)",
    inarticle:   "광고 영역 준비중 · 본문 중간 (410×60)",
    bottom:      "광고 영역 준비중 · 글 하단 (400×100)",
    mobileFixed: "광고 영역 준비중 · 모바일 하단 고정"
  };

  function configPath() {
    // 어느 위치에서든 동일한 경로로 접근 가능하도록 절대경로 사용
    return (window.SITE_BASE || "") + "/data/ads.json";
  }

  function renderSlot(slot, conf) {
    const key = slot.getAttribute("data-ad");
    const cfg = conf && conf[key];

    if (!cfg || cfg.enabled !== true || !cfg.imageUrl) {
      // placeholder
      slot.textContent = PLACEHOLDER_LABEL[key] || "광고 영역 준비중";
      return;
    }

    const a = document.createElement("a");
    a.href = cfg.clickUrl || "#";
    a.target = cfg.newTab === false ? "_self" : "_blank";
    a.rel = "nofollow sponsored noopener";

    const img = document.createElement("img");
    img.src = cfg.imageUrl;
    img.alt = cfg.alt || "광고";
    img.loading = "lazy";
    img.style.border = "0";
    // 고정 사이즈가 지정된 경우(파일조 배너처럼) 자연 크기 유지
    if (cfg.width)  { img.width  = cfg.width;  }
    if (cfg.height) { img.height = cfg.height; }

    a.appendChild(img);
    slot.innerHTML = "";
    slot.classList.add("filled");
    slot.appendChild(a);

    // 모바일 하단 고정 닫기 버튼
    if (key === "mobileFixed") {
      slot.classList.add("enabled");
      document.body.classList.add("has-mobile-ad");
      if (cfg.closable !== false) {
        const close = document.createElement("button");
        close.className = "close";
        close.setAttribute("aria-label", "광고 닫기");
        close.textContent = "×";
        close.onclick = function (e) {
          e.preventDefault();
          slot.style.display = "none";
          document.body.classList.remove("has-mobile-ad");
        };
        slot.appendChild(close);
      }
    }
  }

  function init() {
    fetch(configPath(), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((conf) => {
        document.querySelectorAll(SLOT_SELECTOR).forEach((el) => renderSlot(el, conf));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
