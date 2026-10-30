// '오늘의 시장' 실시간 시세: /api/quotes
// 항목마다 네이버 증권을 먼저 읽고, 실패하면 Yahoo Finance로 대신합니다.
// 응답은 Netlify CDN에서 30초간 캐시되어, 보는 사람이 많아도 원본 호출은 30초에 한 번 정도입니다.

const ITEMS = {
  kospi: { naver: 'https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI', yahoo: '%5EKS11', label: '네이버 증권' },
  usdkrw: { naver: 'https://api.stock.naver.com/marketindex/exchange/FX_USDKRW', yahoo: 'KRW=X', label: '하나은행 고시 · 네이버' },
  nasdaq: { naver: 'https://polling.finance.naver.com/api/realtime/worldstock/index/.IXIC', yahoo: '%5EIXIC', label: '네이버 증권' },
  ust10y: { naver: 'https://api.stock.naver.com/marketindex/bond/US10YT=RR', yahoo: '%5ETNX', label: '네이버 증권' },
  oil: { naver: 'https://api.stock.naver.com/marketindex/energy/CLcv1', yahoo: 'CL=F', label: 'WTI · 10분 지연' },
};

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kimyoungik-board/1.0)', referer: 'https://m.stock.naver.com/' };
const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(String(v).replace(/[,+%\s]/g, '')));
const ok = (n) => (isFinite(n) ? n : null);

async function fromNaver(url, label) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error('naver http ' + res.status);
  const j = await res.json();
  const d = (j.datas && j.datas[0]) || j.exchangeInfo || j.result || j;
  const price = num(d.closePrice ?? d.nowVal);
  if (!isFinite(price) || price <= 0) throw new Error('naver parse');
  let change = num(d.compareToPreviousClosePrice ?? d.fluctuations ?? d.changeVal);
  let pct = num(d.fluctuationsRatio ?? d.changeRate);
  const dir = d.compareToPreviousPrice || d.fluctuationsType || {};
  if (['4', '5'].includes(String(dir.code)) || ['FALLING', 'LOWER_LIMIT'].includes(dir.name)) {
    change = -Math.abs(change);
    pct = -Math.abs(pct);
  }
  const status = String(d.marketStatus || '').toUpperCase();
  return { price, change: ok(change), changePct: ok(pct), open: status === 'OPEN', time: d.localTradedAt || null, source: label };
}

async function fromYahoo(symbol) {
  const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?interval=5m&range=1d', { headers: UA });
  if (!res.ok) throw new Error('yahoo http ' + res.status);
  const j = await res.json();
  const m = j?.chart?.result?.[0]?.meta;
  const price = m?.regularMarketPrice;
  const prev = m?.chartPreviousClose ?? m?.previousClose;
  if (!isFinite(price) || !isFinite(prev) || prev <= 0) throw new Error('yahoo parse');
  const now = Date.now() / 1000;
  const tp = m.currentTradingPeriod?.regular;
  return {
    price,
    change: Math.round((price - prev) * 10000) / 10000,
    changePct: Math.round((price / prev - 1) * 10000) / 100,
    open: tp ? now >= tp.start && now <= tp.end : false,
    time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
    source: 'Yahoo Finance (지연)',
  };
}

async function quote(cfg) {
  try { return await fromNaver(cfg.naver, cfg.label); } catch (e) { /* 다음 출처로 */ }
  try { return await fromYahoo(cfg.yahoo); } catch (e) { return null; }
}

export default async () => {
  const keys = Object.keys(ITEMS);
  const values = await Promise.all(keys.map((k) => quote(ITEMS[k])));
  const body = { fetchedAt: new Date().toISOString() };
  keys.forEach((k, i) => { if (values[i]) body[k] = values[i]; });
  const any = keys.some((k) => body[k]);
  return new Response(JSON.stringify(body), {
    status: any ? 200 : 502,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': any ? 'public, s-maxage=30, stale-while-revalidate=60' : 'no-store',
    },
  });
};

export const config = { path: ['/api/quotes', '/api/kospi'] };
