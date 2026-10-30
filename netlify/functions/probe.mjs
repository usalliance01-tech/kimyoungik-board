// 임시 점검용: 시세 주소별 응답 상태를 확인합니다. 확인 후 삭제합니다.
const URLS = [
  'https://polling.finance.naver.com/api/realtime/worldstock/index/.IXIC',
  'https://api.stock.naver.com/index/.IXIC/basic',
  'https://api.stock.naver.com/marketindex/exchange/FX_USDKRW',
  'https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW',
  'https://api.stock.naver.com/marketindex/energy/CLcv1',
  'https://api.stock.naver.com/marketindex/bond/US10YT=RR',
  'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=5m&range=1d',
  'https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?interval=5m&range=1d',
  'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=5m&range=1d',
  'https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=5m&range=1d',
];
export default async () => {
  const out = await Promise.all(URLS.map(async (u) => {
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; kimyoungik-board/1.0)', referer: 'https://m.stock.naver.com/' } });
      const t = await r.text();
      return { u, s: r.status, b: t.slice(0, 900) };
    } catch (e) { return { u, err: String(e) }; }
  }));
  return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'netlify-cdn-cache-control': 'no-store' } });
};
export const config = { path: '/api/probe' };
