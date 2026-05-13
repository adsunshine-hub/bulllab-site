/* =========================================================
   공용 헤더 / 푸터 / 네비게이션 주입
   - 페이지마다 <header id="site-header"></header>
              <footer id="site-footer"></footer> 만 두면 자동 채워짐
   ========================================================= */
(function () {
  // 사이트 루트 경로 추정 (서브폴더 배포 대비)
  const path = location.pathname;
  const inSub = path.indexOf("/pages/") !== -1;
  const BASE = inSub ? ".." : ".";
  window.SITE_BASE = BASE === "." ? "" : BASE;

  const NAV = [
    { href: BASE + "/index.html",                  label: "메인",       match: ["/index.html", "/"] },
    { href: BASE + "/pages/today-report.html",     label: "오늘의 불장", match: ["/pages/today-report.html"] },
    { href: BASE + "/pages/coin.html",             label: "코인 이슈",   match: ["/pages/coin.html"] },
    { href: BASE + "/pages/stock.html",            label: "주식 이슈",   match: ["/pages/stock.html"] },
    { href: BASE + "/pages/board.html",            label: "투자자 게시판", match: ["/pages/board.html"] },
    { href: BASE + "/pages/humor.html",            label: "유머/짤",     match: ["/pages/humor.html"] },
    { href: BASE + "/pages/resources.html",        label: "자료실",      match: ["/pages/resources.html"] }
  ];

  function currentMatch(item) {
    return item.match.some((m) => path.endsWith(m) || (m === "/" && path === "/"));
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;

    const navHtml = NAV.map((n) => {
      const active = currentMatch(n) ? " active" : "";
      return `<a href="${n.href}" class="${active.trim()}">${n.label}</a>`;
    }).join("");

    host.outerHTML = `
      <header class="site-header">
        <div class="container site-header__inner">
          <a href="${BASE}/index.html" class="brand">
            <span class="brand__mark">🔥</span>
            <span class="brand__name">불장<em>연구소</em></span>
          </a>
          <nav class="nav" id="main-nav">${navHtml}</nav>
          <button class="menu-toggle" aria-label="메뉴 열기" onclick="document.getElementById('main-nav').classList.toggle('open')">☰</button>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    const y = new Date().getFullYear();

    host.outerHTML = `
      <footer class="site-footer">
        <div class="container site-footer__inner">
          <div>
            <h5>🔥 불장연구소</h5>
            <p style="margin:0;line-height:1.6;">
              코인 · 주식 · 경제 이슈를 가볍게 정리하는<br>
              개인 운영 정보 큐레이션 사이트입니다.
            </p>
            <p style="margin-top:10px;color:var(--text-mute);font-size:12px;">
              본 사이트는 투자 권유가 아니며,<br>
              모든 판단과 책임은 이용자 본인에게 있습니다.
            </p>
          </div>
          <div>
            <h5>카테고리</h5>
            <ul>
              <li><a href="${BASE}/pages/today-report.html">오늘의 불장 리포트</a></li>
              <li><a href="${BASE}/pages/coin.html">코인 이슈</a></li>
              <li><a href="${BASE}/pages/stock.html">주식 이슈</a></li>
              <li><a href="${BASE}/pages/board.html">투자자 게시판</a></li>
              <li><a href="${BASE}/pages/humor.html">유머/짤</a></li>
              <li><a href="${BASE}/pages/resources.html">자료실</a></li>
            </ul>
          </div>
          <div>
            <h5>사이트 정보</h5>
            <ul>
              <li><a href="${BASE}/pages/contact.html">광고 / 제휴 문의</a></li>
              <li><a href="${BASE}/pages/privacy.html">개인정보처리방침</a></li>
              <li><a href="${BASE}/pages/terms.html">이용약관</a></li>
            </ul>
          </div>
        </div>
        <div class="container copyright">
          © ${y} bulllab.kr · 불장연구소 · All rights reserved.
        </div>
      </footer>
    `;
  }

  function init() {
    renderHeader();
    renderFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
