/* =========================================================
   포스트 로더
   - data/posts/index.json 을 읽어 카테고리별 리스트 렌더
   - 개별 글은 data/posts/<slug>.md (Markdown) 로 저장
   - pages/post.html?slug=<slug> 형식으로 본문 표시
   ========================================================= */
(function () {
  const BASE = window.SITE_BASE || "";
  const INDEX_URL = BASE + "/data/posts/index.json";

  // ── Markdown(아주 간단한 서브셋) 파서 ──
  // 외부 라이브러리 없이 운영 가능하도록 최소 기능만 지원합니다.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function mdToHtml(md) {
    if (!md) return "";
    const lines = md.split(/\r?\n/);
    let html = "";
    let inUl = false, inOl = false, inCode = false;

    const closeLists = () => {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
    };

    for (let raw of lines) {
      const line = raw;

      // 코드 블록 ```
      if (/^```/.test(line)) {
        closeLists();
        if (!inCode) { html += "<pre><code>"; inCode = true; }
        else { html += "</code></pre>"; inCode = false; }
        continue;
      }
      if (inCode) { html += escapeHtml(line) + "\n"; continue; }

      // 빈 줄
      if (!line.trim()) { closeLists(); html += ""; continue; }

      // 헤더
      let m;
      if ((m = line.match(/^###\s+(.*)/))) { closeLists(); html += `<h3>${inline(m[1])}</h3>`; continue; }
      if ((m = line.match(/^##\s+(.*)/)))  { closeLists(); html += `<h2>${inline(m[1])}</h2>`; continue; }
      if ((m = line.match(/^#\s+(.*)/)))   { closeLists(); html += `<h2>${inline(m[1])}</h2>`; continue; }

      // 인용
      if ((m = line.match(/^>\s?(.*)/))) {
        closeLists();
        html += `<blockquote>${inline(m[1])}</blockquote>`;
        continue;
      }

      // 번호 리스트
      if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
        if (!inOl) { closeLists(); html += "<ol>"; inOl = true; }
        html += `<li>${inline(m[1])}</li>`;
        continue;
      }
      // 불릿 리스트
      if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
        if (!inUl) { closeLists(); html += "<ul>"; inUl = true; }
        html += `<li>${inline(m[1])}</li>`;
        continue;
      }

      // 일반 문단
      closeLists();
      html += `<p>${inline(line)}</p>`;
    }
    closeLists();
    if (inCode) html += "</code></pre>";
    return html;

    function inline(s) {
      s = escapeHtml(s);
      // bold **x** / italic *x*
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      // code `x`
      s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
      // link [text](url)
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>');
      return s;
    }
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}.${m}.${day}`;
    } catch (e) { return iso; }
  }

  function tagClass(cat) {
    if (cat === "coin") return "";
    if (cat === "stock") return "orange";
    return "gray";
  }

  function tagLabel(cat) {
    return ({
      coin: "코인",
      stock: "주식",
      report: "리포트",
      board: "게시판",
      humor: "유머",
      resource: "자료"
    })[cat] || "이슈";
  }

  // ── 인덱스 로드 (캐시) ──
  let _indexPromise = null;
  function loadIndex() {
    if (_indexPromise) return _indexPromise;
    _indexPromise = fetch(INDEX_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .catch(() => ({ posts: [] }));
    return _indexPromise;
  }

  // ── 카드 형 리스트 ──
  function renderCards(host, posts, limit) {
    const list = posts.slice(0, limit || posts.length);
    if (!list.length) {
      host.innerHTML = `<div class="empty">아직 등록된 글이 없습니다.<br>매일 오전 9시(KST)에 새 글이 자동 업로드됩니다.</div>`;
      return;
    }
    host.innerHTML = list.map((p) => {
      return `
        <a class="card" href="${BASE}/pages/post.html?slug=${encodeURIComponent(p.slug)}">
          <span class="tag ${tagClass(p.category)}">${tagLabel(p.category)}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
          <div class="meta">${formatDate(p.date)} · 불장연구소</div>
        </a>`;
    }).join("");
  }

  // ── 게시판 형 리스트 ──
  function renderList(host, posts, limit) {
    const list = posts.slice(0, limit || posts.length);
    if (!list.length) {
      host.innerHTML = `<div class="empty">아직 등록된 글이 없습니다.</div>`;
      return;
    }
    host.innerHTML = `<ul class="post-list">` + list.map((p) => `
      <li>
        <a href="${BASE}/pages/post.html?slug=${encodeURIComponent(p.slug)}" class="pl-title">
          <span class="pl-tag ${tagClass(p.category)}">${tagLabel(p.category)}</span>
          ${escapeHtml(p.title)}
        </a>
        <span class="pl-meta">${formatDate(p.date)}</span>
      </li>`).join("") + `</ul>`;
  }

  // ── 본문(개별 글) 렌더 ──
  function renderArticle() {
    const host = document.getElementById("post-article");
    if (!host) return;

    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");

    if (!slug) {
      host.innerHTML = `<div class="empty">잘못된 접근입니다. 글 주소를 다시 확인해 주세요.</div>`;
      return;
    }

    loadIndex().then((idx) => {
      const post = (idx.posts || []).find((p) => p.slug === slug);
      if (!post) {
        host.innerHTML = `<div class="empty">존재하지 않는 글입니다.</div>`;
        return;
      }

      fetch(BASE + "/data/posts/" + slug + ".md", { cache: "no-store" })
        .then((r) => r.ok ? r.text() : Promise.reject())
        .then((md) => {
          document.title = post.title + " · 불장연구소";
          host.innerHTML = `
            <header>
              <span class="tag ${tagClass(post.category)}" style="background:rgba(230,57,70,.12);color:var(--primary-2);font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:10px;">${tagLabel(post.category)}</span>
              <h1>${escapeHtml(post.title)}</h1>
              <div class="post-meta">${formatDate(post.date)} · 불장연구소</div>
            </header>
            <div class="post-body">${mdToHtml(md)}</div>
            <div class="ad-slot ad-inarticle" data-ad="inarticle"></div>
            <div class="disclaimer">
              ※ 본 글은 공개된 시장 데이터와 일반 정보를 바탕으로 자동 정리된 콘텐츠이며,
              어떠한 형태의 투자 권유나 매매 추천도 아닙니다. 투자에 대한 모든 판단과 책임은
              이용자 본인에게 있습니다.
            </div>
            <div class="ad-slot ad-bottom" data-ad="bottom"></div>
          `;
          // 본문 광고도 다시 그리기
          if (window.__renderAds) window.__renderAds();
          else if (typeof Event === "function") {
            // ads.js 가 이미 로드된 상태라면 fetch 한번 더 호출되도록 강제
            const s = document.createElement("script");
            s.src = BASE + "/assets/js/ads.js?reload=" + Date.now();
            document.body.appendChild(s);
          }
        })
        .catch(() => {
          host.innerHTML = `<div class="empty">본문을 불러오지 못했습니다.</div>`;
        });
    });
  }

  // ── 페이지별 호출 진입점 ──
  window.BullLab = {
    // 메인용: 카테고리 무관 최신 N
    loadLatestCards(hostId, limit) {
      const host = document.getElementById(hostId);
      if (!host) return;
      loadIndex().then((idx) => renderCards(host, idx.posts || [], limit));
    },
    // 카테고리별 카드
    loadCategoryCards(hostId, category, limit) {
      const host = document.getElementById(hostId);
      if (!host) return;
      loadIndex().then((idx) => {
        const filtered = (idx.posts || []).filter((p) => p.category === category);
        renderCards(host, filtered, limit);
      });
    },
    // 카테고리별 리스트
    loadCategoryList(hostId, category, limit) {
      const host = document.getElementById(hostId);
      if (!host) return;
      loadIndex().then((idx) => {
        const filtered = (idx.posts || []).filter((p) => p.category === category);
        renderList(host, filtered, limit);
      });
    },
    // 게시판 통합 리스트
    loadAllList(hostId, limit) {
      const host = document.getElementById(hostId);
      if (!host) return;
      loadIndex().then((idx) => renderList(host, idx.posts || [], limit));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderArticle);
  } else {
    renderArticle();
  }
})();
