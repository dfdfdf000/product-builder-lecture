/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=';
const OUT_PATH = path.join(__dirname, '..', 'data', 'lotto.json');
const LOAD_COUNT = 200;
const SEED_ROUND = Number(process.env.SEED_ROUND || 1200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOldShape = (obj) => (
  obj
  && typeof obj === 'object'
  && obj.drwtNo1 !== undefined
  && obj.drwtNo6 !== undefined
  && obj.drwNo !== undefined
);

const isNewShape = (obj) => (
  obj
  && typeof obj === 'object'
  && obj.tm1WnNo !== undefined
  && obj.tm6WnNo !== undefined
  && obj.ltEpsd !== undefined
);

const normalizeRecord = (obj) => {
  if (isOldShape(obj)) {
    return {
      round: Number(obj.drwNo),
      date: obj.drwNoDate || obj.drwNoDateYmd || obj.drwNoDateStr || '',
      nums: [obj.drwtNo1, obj.drwtNo2, obj.drwtNo3, obj.drwtNo4, obj.drwtNo5, obj.drwtNo6].map(Number),
      bonus: Number(obj.bnusNo)
    };
  }
  if (isNewShape(obj)) {
    return {
      round: Number(obj.ltEpsd),
      date: obj.ltRflYmd || obj.ltRflDt || obj.ltRflYmdStr || '',
      nums: [obj.tm1WnNo, obj.tm2WnNo, obj.tm3WnNo, obj.tm4WnNo, obj.tm5WnNo, obj.tm6WnNo].map(Number),
      bonus: Number(obj.bnsWnNo)
    };
  }
  return null;
};

const findRecord = (data, targetRound) => {
  const queue = [{ value: data, depth: 0 }];
  const maxDepth = 6;
  while (queue.length > 0) {
    const { value, depth } = queue.shift();
    if (!value || depth > maxDepth) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = normalizeRecord(item);
        if (normalized && normalized.round === targetRound) return normalized;
        queue.push({ value: item, depth: depth + 1 });
      }
    } else if (typeof value === 'object') {
      const normalized = normalizeRecord(value);
      if (normalized && normalized.round === targetRound) return normalized;
      for (const key of Object.keys(value)) {
        queue.push({ value: value[key], depth: depth + 1 });
      }
    }
  }

  // fallback: return any record found
  const fallbackQueue = [data];
  while (fallbackQueue.length > 0) {
    const value = fallbackQueue.shift();
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = normalizeRecord(item);
        if (normalized) return normalized;
        fallbackQueue.push(item);
      }
    } else if (typeof value === 'object') {
      const normalized = normalizeRecord(value);
      if (normalized) return normalized;
      for (const key of Object.keys(value)) {
        fallbackQueue.push(value[key]);
      }
    }
  }

  return null;
};

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
      if (data.returnValue && data.returnValue !== 'success') return null;
      const normalized = findRecord(data, round);
      if (!normalized) return null;
      return normalized;
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
