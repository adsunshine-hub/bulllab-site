# 🔥 불장연구소 · bulllab.kr

코인 · 주식 · 경제 이슈를 가볍게 정리하는 정적 정보 큐레이션 사이트.
순수 HTML/CSS/JS + GitHub Actions + Cloudflare Pages 로 운영합니다.

---

## 📁 폴더 구조

```
.
├── index.html                  # 메인
├── pages/                      # 각 카테고리·정책 페이지
│   ├── today-report.html
│   ├── coin.html
│   ├── stock.html
│   ├── board.html
│   ├── humor.html
│   ├── resources.html
│   ├── contact.html
│   ├── privacy.html
│   ├── terms.html
│   └── post.html               # 개별 글 보기 템플릿
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── main.js             # 헤더·푸터 자동 주입
│       ├── ads.js              # 광고 영역 렌더러
│       └── posts.js            # 글 목록·본문 로더 (간이 마크다운 파서 포함)
├── data/
│   ├── ads.json                # ⭐ 광고 설정 (여기만 바꾸면 광고 노출)
│   └── posts/
│       ├── index.json          # 글 메타데이터 인덱스
│       └── *.md                # 개별 글 본문
├── scripts/
│   ├── generate-post.js        # 자동 글 생성 스크립트
│   └── package.json
├── .github/
│   └── workflows/
│       └── daily-post.yml      # 매일 09:00 KST 자동 실행
├── CNAME                       # bulllab.kr
├── robots.txt
├── sitemap.xml
├── _headers                    # Cloudflare Pages 헤더
├── _redirects
├── 404.html
└── README.md
```

---

## 🚀 배포 (Cloudflare Pages)

1. GitHub 에 본 폴더를 push (예: `bulllab-site` 저장소).
2. [Cloudflare Pages](https://pages.cloudflare.com/) 에서 **Create Project → Connect to Git** → 해당 저장소 선택.
3. 빌드 설정:
   - **Framework preset**: `None`
   - **Build command**: (비워둠)
   - **Build output directory**: `/` (루트)
4. 첫 배포가 끝나면 `xxx.pages.dev` 임시 도메인이 생깁니다.
5. **Custom domains → Set up a custom domain** 에서 `bulllab.kr` 추가.
6. 네임서버를 Cloudflare 로 위임했다면 자동으로 A/AAAA/CNAME 이 잡힙니다.
   외부 DNS 사용 중이면 안내된 `CNAME` 값을 등록합니다.
7. 끝. HTTPS 인증서는 Cloudflare 가 자동 발급합니다.

> 참고: `CNAME` 파일은 GitHub Pages 도 호환됩니다.
> 추후 GitHub Pages 로 옮겨도 동일 파일을 그대로 사용할 수 있습니다.

---

## 🤖 자동 글 생성 설정

### 1) GitHub Secrets 등록

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 값 |
|---|---|
| `OPENAI_API_KEY` | OpenAI API 키 (gpt-4o-mini 호출용) |
| `ALPHAVANTAGE_API_KEY` | https://www.alphavantage.co/ 무료 발급 키 |

### 2) 워크플로 권한 확인

저장소 → **Settings → Actions → General → Workflow permissions** 에서
"Read and write permissions" 를 체크 (글 파일을 커밋해야 하므로 필요).

### 3) 동작 방식

- `.github/workflows/daily-post.yml` 가 매일 **00:00 UTC = 09:00 KST** 에 자동 실행.
- `scripts/generate-post.js` 가
  1. Alpha Vantage 에서 BTC, USD/KRW, SPY 데이터 수집
  2. OpenAI(gpt-4o-mini) 로 800~1200자 한국어 정보 요약 글 생성
  3. `data/posts/<날짜>-<카테고리>.md` 파일과 `data/posts/index.json` 업데이트
  4. 변경 사항이 있으면 자동 커밋·푸시 → Cloudflare Pages 가 자동 재배포

### 4) 수동 실행

저장소 → **Actions → Daily Post Generator → Run workflow** 로 즉시 실행 가능.

### 5) 카테고리 분산

| 요일 | 카테고리 |
|---|---|
| 월·목 | coin |
| 화·금 | stock |
| 수·토·일 | report (오늘의 불장 리포트) |

> 환경변수 `POST_CATEGORY=coin|stock|report` 로 강제 지정도 가능합니다.

### 6) 예상 비용

- **Alpha Vantage**: 무료 (분당 5회, 일 25회 한도)
- **OpenAI gpt-4o-mini**: 글 1편 약 1,400 토큰 → 월 30편 기준 **0.1~0.3 달러** 수준
- **Cloudflare Pages**: 무료
- **GitHub Actions**: public 저장소 무료, private 도 월 2,000분 무료

월 **1~2 달러 이하**로 충분히 운영됩니다.

---

## 🪧 광고 영역 (파일조 배너 등)

광고 배너는 코드를 수정할 필요 없이 **`data/ads.json` 파일 한 곳만** 수정하면 적용됩니다.

```jsonc
{
  "top": {
    "enabled": false,                       // ← true 로 바꾸면 실제 배너 노출
    "imageUrl": "/assets/img/ads/top.png",  // ← 받은 배너 이미지 URL
    "clickUrl": "https://filezo.example.com/...",
    "alt": "파일조 광고",
    "newTab": true
  },
  ...
}
```

광고 슬롯이 위치한 곳:

| 슬롯 | 표시 위치 |
|---|---|
| `top` | 메인 상단(모든 페이지 hero 아래) |
| `side` | 사이드바 상·하단 |
| `inarticle` | 글 본문 중간 |
| `bottom` | 글 하단 |
| `mobileFixed` | 모바일 하단 고정 (선택) |

`enabled: false` 또는 `imageUrl` 가 비어있으면 자동으로
"광고 영역 준비중" placeholder 가 표시됩니다 → 현재 상태.

배너 이미지를 받으면:
1. 이미지를 `assets/img/ads/` 폴더에 넣고
2. `data/ads.json` 의 해당 슬롯에 `imageUrl`·`clickUrl`·`enabled: true` 설정
3. 커밋 → Cloudflare Pages 자동 재배포 → 끝.

---

## 📝 글을 직접 추가하고 싶을 때

1. `data/posts/내-슬러그.md` 생성 (마크다운, 첫 줄에 `# 제목`)
2. `data/posts/index.json` 의 `posts` 배열 맨 앞에 메타데이터 추가:

```json
{
  "slug": "내-슬러그",
  "title": "제목",
  "excerpt": "발췌(140자 이내 권장)",
  "category": "report",
  "date": "2026-05-13T00:00:00.000Z"
}
```

`category` 값: `report` / `coin` / `stock` / `humor` / `resource` / `board`

---

## ⚖️ 법적 안전장치

- 모든 페이지 하단/사이드에 **"투자 권유 아님"** 문구 노출
- `pages/terms.html` 이용약관 제2조에 **자본시장법상 투자자문업이 아님** 명시
- 자동 생성 글은 시스템 프롬프트로 **종목 매매 권유·가격 단정 예측 금지** 처리
- `pages/privacy.html` 에 광고 외부 링크 책임 면책 명시

사업자 정보(상호·대표·사업자등록번호·통신판매업 신고번호·주소·이메일)는 `assets/js/main.js`
푸터, `pages/privacy.html` 9조, `pages/terms.html` 8조에 일괄 반영되어 있습니다.
정보 변경 시 위 3곳을 함께 수정해주세요.

---

## 🛠 로컬에서 미리보기

정적 사이트이므로 그냥 `index.html` 더블클릭으로도 동작하지만,
`fetch()` 가 `file://` 에서 차단될 수 있어 로컬 서버 권장:

```bash
# Python 이 있다면
python -m http.server 8080

# 또는 Node
npx serve .
```

`http://localhost:8080/` 접속.

---

## 📮 문의

`help.adsunshine@gmail.com` — ㈜애드선샤인


## 앱과 서비스 게시판과 검색 등록

- 운영 연결: GitHub 저장소 https://github.com/adsunshine-hub/bulllab-site 의 main 브랜치가 Cloudflare Workers 및 Pages의 bulllab-site 프로덕션에 연결되어 있으며 사용자 설정 도메인은 bulllab.kr입니다. 2026-11-18 Cloudflare 배포 화면에서 확인했습니다.
- 별도 게시판은 /pages/apps.html, 글은 /pages/starive-chat-video-guide.html 입니다. 운영자가 작성한 정적 HTML이며 자유 글쓰기 기능은 없습니다. 메인과 공용 메뉴에는 링크하지 않습니다.
- 새 글은 pages/에 고유한 HTML 파일로 작성하고 게시판 목록과 scripts/generate-sitemap.js의 고정 페이지 목록을 갱신합니다. 공식 자료의 출처와 확인 날짜를 기록하세요.
- node scripts/generate-sitemap.js는 고정 페이지와 data/posts/index.json에 등록된 글의 주소를 sitemap.xml로 생성합니다. 본문이 없거나 슬러그가 잘못되거나 중복이면 실패합니다. 수동 변경 시 실행 후 함께 커밋하며, 자동 글 생성 워크플로도 사이트맵을 갱신합니다. 기존 글은 자바스크립트로 본문을 불러옵니다.
- main에 반영하면 Cloudflare가 빌드 및 배포합니다. 배포 상태와 게시판·글·사이트맵의 공개 내용을 확인하고 Search Console에서 색인 상태를 확인하세요. 사이트맵은 색인을 보장하지 않습니다.

### 2026-11-18 공개 확인

커밋 37738df가 원격 main에 반영된 것을 확인했습니다. /pages/apps.html, /pages/starive-chat-video-guide.html, /sitemap.xml은 HTTP 200으로 응답했고 사이트맵의 202개 URL에 두 페이지가 포함되었습니다. 공개 메인 HTML과 공용 메뉴 스크립트에서 새 게시판 링크가 없음을 확인했습니다. Cloudflare 프로덕션에서 커밋 37738df의 main 빌드가 준비 완료 및 100% 배포된 것을 확인했습니다 (버전 57bd5cb1). Search Console의 개별 페이지 색인 상태는 미확인입니다. Git 인증은 명령 실행 시 저장소 경로와 adsunshine-hub 계정을 지정했으며 해당 계정의 쓰기 권한을 확인했습니다. 기존 전역 설정은 변경하지 않았습니다.
