/**
 * 불장연구소 - 자동 글 생성 스크립트
 *
 * 동작 흐름:
 *   1) Alpha Vantage 무료 API로 BTC, 환율, 미국 주요 지수 데이터를 가져옴
 *   2) OpenAI(gpt-4o-mini) 로 800~1200자 분량의 한국어 정보 요약 글을 생성
 *   3) data/posts/<slug>.md 로 저장
 *   4) data/posts/index.json 에 메타데이터 추가
 *
 * 환경변수(필수):
 *   OPENAI_API_KEY        - OpenAI API 키
 *   ALPHAVANTAGE_API_KEY  - Alpha Vantage 무료 API 키 (https://www.alphavantage.co/)
 *
 * 환경변수(선택):
 *   POST_CATEGORY         - "auto" | "coin" | "stock" | "report"   (기본: auto, 요일에 따라 변경)
 *
 * 실행:
 *   node scripts/generate-post.js
 *
 * Node 20+ 의 내장 fetch 를 사용하므로 외부 의존성이 없습니다.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "data", "posts");
const INDEX_PATH = path.join(POSTS_DIR, "index.json");

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ALPHA_KEY  = process.env.ALPHAVANTAGE_API_KEY;
const CATEGORY_ENV = (process.env.POST_CATEGORY || "auto").toLowerCase();

if (!OPENAI_KEY) {
  console.error("OPENAI_API_KEY 가 설정되지 않았습니다.");
  process.exit(1);
}

/* ===================== 1) 시장 데이터 수집 ===================== */
async function fetchAlpha(params) {
  if (!ALPHA_KEY) return null;
  const qs = new URLSearchParams({ ...params, apikey: ALPHA_KEY }).toString();
  const url = "https://www.alphavantage.co/query?" + qs;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "bulllab.kr/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    // 무료 플랜 호출 제한 메시지 처리
    if (data["Information"] || data["Note"]) {
      console.warn("[alpha-vantage]", data["Information"] || data["Note"]);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("[alpha-vantage] fetch error:", e.message);
    return null;
  }
}

function pickLatest(seriesObj) {
  if (!seriesObj) return null;
  const keys = Object.keys(seriesObj).sort().reverse();
  if (!keys.length) return null;
  const top = seriesObj[keys[0]];
  // Alpha Vantage 응답의 키 표기 차이 흡수
  const close = top["4a. close (USD)"] || top["4. close"] || top["close"] || null;
  const open  = top["1a. open (USD)"]  || top["1. open"]  || top["open"]  || null;
  return { date: keys[0], close, open };
}

async function collectMarketData() {
  const data = { fetchedAt: new Date().toISOString(), items: [] };

  // BTC (디지털 통화 일일 시세)
  const btc = await fetchAlpha({
    function: "DIGITAL_CURRENCY_DAILY",
    symbol: "BTC",
    market: "USD"
  });
  if (btc && btc["Time Series (Digital Currency Daily)"]) {
    const latest = pickLatest(btc["Time Series (Digital Currency Daily)"]);
    if (latest) data.items.push({ key: "BTC/USD", date: latest.date, open: latest.open, close: latest.close });
  }

  // 환율 USD/KRW
  const fx = await fetchAlpha({
    function: "FX_DAILY",
    from_symbol: "USD",
    to_symbol: "KRW"
  });
  if (fx && fx["Time Series FX (Daily)"]) {
    const latest = pickLatest(fx["Time Series FX (Daily)"]);
    if (latest) data.items.push({ key: "USD/KRW", date: latest.date, open: latest.open, close: latest.close });
  }

  // 미국 S&P500 ETF (SPY) 일일
  const spy = await fetchAlpha({
    function: "TIME_SERIES_DAILY",
    symbol: "SPY"
  });
  if (spy && spy["Time Series (Daily)"]) {
    const latest = pickLatest(spy["Time Series (Daily)"]);
    if (latest) data.items.push({ key: "SPY (S&P500)", date: latest.date, open: latest.open, close: latest.close });
  }

  return data;
}

/* ===================== 2) 카테고리 결정 ===================== */
function decideCategory() {
  if (CATEGORY_ENV !== "auto") return CATEGORY_ENV;
  // 매일 다른 카테고리로 자연스럽게 분산
  const d = new Date();
  const dow = d.getUTCDay(); // 0=Sun
  // 월·목 = coin, 화·금 = stock, 그 외 = report
  if (dow === 1 || dow === 4) return "coin";
  if (dow === 2 || dow === 5) return "stock";
  return "report";
}

function categoryLabel(cat) {
  return ({
    coin: "코인 이슈",
    stock: "주식 이슈",
    report: "오늘의 불장 리포트"
  })[cat] || "오늘의 불장 리포트";
}

/* ===================== 3) OpenAI 글 생성 ===================== */
function buildPrompt(category, market) {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long"
  });
  const marketLines = market.items.length
    ? market.items.map((i) => `- ${i.key}: ${i.date} 종가 ${i.close}`).join("\n")
    : "- (오늘은 외부 시장 데이터 조회에 실패하여 일반적인 시장 분위기 위주로 작성)";

  const focus = ({
    coin:   "비트코인·이더리움 등 가상자산 시장 분위기와 최근 이슈",
    stock:  "코스피·코스닥·미국 증시 등 주식 시장 분위기와 최근 이슈",
    report: "오늘의 전체 시장 분위기(코인+주식+환율)를 가볍게 정리한 일일 리포트"
  })[category];

  return [
    {
      role: "system",
      content:
        "당신은 한국의 정보 큐레이션 사이트 '불장연구소'의 에디터입니다. " +
        "투자 권유/매수 추천/특정 종목 매매 조언을 절대 하지 않습니다. " +
        "공개된 시장 데이터와 일반 정보만을 사용해 '읽을거리' 톤으로 정리합니다. " +
        "법적 분쟁 소지가 있는 단정 표현, 미공개 정보, 가격 예측, 과장된 수익 약속은 사용하지 않습니다."
    },
    {
      role: "user",
      content:
`오늘은 ${today}입니다.
아래는 오늘 수집된 시장 데이터입니다.
${marketLines}

위 데이터를 참고해 '${categoryLabel(category)}' 카테고리의 글을 한국어로 작성해주세요.
주제는 ${focus}.

작성 규칙:
1) 글 분량은 800~1200자 (한국어 기준)
2) 가벼운 톤이지만 정보로서 유익할 것
3) 특정 종목·코인을 '매수/매도하라' 식으로 권유하지 말 것
4) 단정적 가격 예측 금지. ("올라갈 것이다" → "올랐을 때의 분위기" 식)
5) 마크다운 형식으로 작성. 본문에 ## 소제목 2~3개를 사용
6) 첫 줄에 글 제목을 "# 제목" 으로 작성 (이모지 1개 포함 가능)
7) 마지막에 글의 한 줄 요약을 "> 한 줄 요약: ..." 형태로 추가
8) 마지막 줄 아래에 별도 "면책 문구"는 작성하지 말 것 (사이트에서 자동으로 붙입니다)

출력은 마크다운 본문만, 다른 설명 없이.`
    }
  ];
}

async function generateArticle(category, market) {
  const messages = buildPrompt(category, market);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.85,
      max_tokens: 1400
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI API 오류 ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI 응답이 비어있습니다.");
  return text;
}

/* ===================== 4) 파일 저장 & 인덱스 갱신 ===================== */
function extractTitle(md) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  return (m && m[1].trim()) || "오늘의 불장 리포트";
}

function extractExcerpt(md) {
  // 첫 번째 일반 문단을 짧게 잘라 발췌로 사용
  const lines = md.split(/\r?\n/);
  let buf = "";
  for (const line of lines) {
    if (/^\s*#/.test(line)) continue;
    if (/^\s*>/.test(line)) continue;
    if (!line.trim()) { if (buf) break; else continue; }
    buf += (buf ? " " : "") + line.trim();
    if (buf.length >= 120) break;
  }
  return buf.replace(/[*_`#>]/g, "").slice(0, 140);
}

function slugify(category) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}-${category}`;
}

async function readIndex() {
  try {
    const txt = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(txt);
  } catch {
    return { posts: [] };
  }
}

async function writeIndex(idx) {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(idx, null, 2) + "\n", "utf8");
}

/* ===================== 메인 ===================== */
(async () => {
  const category = decideCategory();
  console.log(`[generate] 카테고리: ${category}`);

  const market = await collectMarketData();
  console.log(`[generate] 시장 데이터 ${market.items.length}건 확보`);

  const md = await generateArticle(category, market);
  const title = extractTitle(md);
  const excerpt = extractExcerpt(md);
  const slug = slugify(category);
  const date = new Date().toISOString();

  // 본문 파일
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  await fs.writeFile(filePath, md + "\n", "utf8");
  console.log(`[generate] 작성: ${filePath}`);

  // 인덱스 갱신 (최신순, 최대 300개 유지)
  const idx = await readIndex();
  idx.posts = [
    { slug, title, excerpt, category, date },
    ...(idx.posts || []).filter((p) => p.slug !== slug)
  ].slice(0, 300);
  await writeIndex(idx);
  console.log(`[generate] index.json 갱신 (${idx.posts.length}개)`);

  console.log("[generate] 완료 ✅");
})().catch((e) => {
  console.error("[generate] 실패:", e);
  process.exit(1);
});
