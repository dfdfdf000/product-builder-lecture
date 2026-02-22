export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const drwNo = url.searchParams.get('drwNo');

  if (!drwNo) {
    return new Response(JSON.stringify({ error: 'drwNo is required' }), {
      status: 400,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*'
      }
    });
  }

  const target = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${encodeURIComponent(drwNo)}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'referer': 'https://www.dhlottery.co.kr/',
        'origin': 'https://www.dhlottery.co.kr'
      }
    });

    const body = await upstream.text();
    const trimmed = body.trim();
    const looksLikeJson = trimmed.startsWith('{') && trimmed.endsWith('}');

    if (!looksLikeJson) {
      return new Response(JSON.stringify({ returnValue: 'blocked', message: 'upstream returned html' }), {
        status: 503,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      });
    }

    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed' }), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
  }
}
