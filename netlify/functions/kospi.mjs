// 코스피 실시간 시세를 읽어 { price, change, changePct, open, time, source } 로 돌려줍니다.
// 네이버 증권을 먼저 시도하고, 실패하면 Yahoo Finance(지연 시세)를 씁니다.
// 응답은 Netlify CDN에서 30초간 캐시되어, 여러 사람이 보고 있어도 원본 호출은 30초에 한 번 정도입니다.

const num = (v) => {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).replace(/[,+%\s]/g, ''));
};

async function fromNaver() {
  const res = await fetch('https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI', {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; kimyoungik-board/1.0)', referer: 'https://m.stock.naver.com/' },
  });
  if (!res.ok) throw new Error('naver http ' + res.status);
  const j = await res.json();
  const d = (j.datas && j.datas[0]) || j;
  const price = num(d.closePrice ?? d.nowVal);
  if (!isFinite(price) || price <= 0) throw new Error('naver parse');
  let change = num(d.compareToPreviousClosePrice ?? d.changeVal);
  let pct = num(d.fluctuationsRatio ?? d.changeRate);
  const dir = d.compareToPreviousPrice || {};
  const falling = ['4', '5'].includes(String(dir.code)) || ['FALLING', 'LOWER_LIMIT'].includes(dir.name);
  if (falling) { change = -Math.abs(change); pct = -Math.abs(pct); }
  const status = String(d.marketStatus || '').toUpperCase();
  return {
    price,
    change: isFinite(change) ? change : null,
    changePct: isFinite(pct) ? pct : null,
    open: status === 'OPEN',
    status,
    time: d.localTradedAt || null,
    source: '네이버 증권',
  };
}

async function fromYahoo() {
  const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11?interval=5m&range=1d', {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; kimyoungik-board/1.0)' },
  });
  if (!res.ok) throw new Error('yahoo http ' + res.status);
  const j = await res.json();
  const m = j?.chart?.result?.[0]?.meta;
  const price = m?.regularMarketPrice;
  const prev = m?.chartPreviousClose ?? m?.previousClose;
  if (!isFinite(price) || !isFinite(prev) || prev <= 0) throw new Error('yahoo parse');
  const now = Date.now() / 1000;
  const tp = m.currentTradingPeriod?.regular;
  const open = tp ? now >= tp.start && now <= tp.end : false;
  return {
    price,
    change: Math.round((price - prev) * 100) / 100,
    changePct: Math.round((price / prev - 1) * 10000) / 100,
    open,
    status: open ? 'OPEN' : 'CLOSE',
    time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
    source: 'Yahoo Finance (지연 시세)',
  };
}

export default async () => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, must-revalidate',
    'netlify-cdn-cache-control': 'public, s-maxage=30, stale-while-revalidate=60',
  };
  const errors = [];
  for (const source of [fromNaver, fromYahoo]) {
    try {
      const q = await source();
      return new Response(JSON.stringify(q), { headers });
    } catch (e) {
      errors.push(String(e && e.message ? e.message : e));
    }
  }
  return new Response(JSON.stringify({ error: 'unavailable', detail: errors }), {
    status: 502,
    headers: { ...headers, 'netlify-cdn-cache-control': 'no-store' },
  });
};

export const config = { path: '/api/kospi' };
