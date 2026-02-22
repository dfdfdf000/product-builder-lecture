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
        'user-agent': 'Mozilla/5.0'
      }
    });

    const body = await upstream.text();

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
