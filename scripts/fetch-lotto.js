/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const OUT_PATH = path.join(__dirname, '..', 'data', 'lotto.json');
const LOAD_COUNT = 200;
const SEED_ROUND = Number(process.env.SEED_ROUND || 1200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDraw(round) {
  const url = `${API_BASE}${round}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'referer': 'https://www.dhlottery.co.kr/',
          'origin': 'https://www.dhlottery.co.kr'
        }
      });
      const text = await res.text();
      const trimmed = text.trim();
      if (!trimmed.startsWith('{')) throw new Error('non-json');
      const data = JSON.parse(trimmed);
      if (data.returnValue !== 'success') return null;
      return {
        round: data.drwNo,
        date: data.drwNoDate,
        nums: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
        bonus: data.bnusNo
      };
    } catch (err) {
      if (attempt === 3) return null;
      await sleep(500 * attempt);
    }
  }
  return null;
}

async function findLatestRound(seed) {
  let low = 1;
  let high = seed;
  let data = await fetchDraw(high);

  if (data) {
    let step = 1;
    while (data) {
      low = high;
      high += step;
      step *= 2;
      data = await fetchDraw(high);
      await sleep(120);
    }
  } else {
    let step = 1;
    while (!data && high > 1) {
      high = Math.max(1, high - step);
      step *= 2;
      data = await fetchDraw(high);
      await sleep(120);
    }
    if (!data) return null;
    low = high;
    high += step;
  }

  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    data = await fetchDraw(mid);
    await sleep(120);
    if (data) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

function loadExistingData() {
  try {
    const raw = fs.readFileSync(OUT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function main() {
  const existing = loadExistingData();
  const seedFromExisting = Number(existing?.latestRound) || SEED_ROUND;
  const latest = await findLatestRound(seedFromExisting);
  if (!latest) {
    console.warn('Failed to find latest round. Keeping existing data.');
    if (existing) {
      console.log('Existing data retained.');
      process.exit(0);
    }
    process.exit(1);
  }

  const draws = [];
  for (let r = latest; r > Math.max(0, latest - LOAD_COUNT); r -= 1) {
    const draw = await fetchDraw(r);
    await sleep(120);
    if (draw) draws.push(draw);
  }

  if (draws.length === 0) {
    console.error('No draws fetched.');
    process.exit(1);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    latestRound: latest,
    count: draws.length,
    draws
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Saved ${draws.length} draws to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
