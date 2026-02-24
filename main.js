const SAMPLE_DRAWS = [
  { round: 1120, date: '2024-09-07', nums: [1, 6, 11, 23, 33, 42], bonus: 7 },
  { round: 1119, date: '2024-08-31', nums: [4, 12, 14, 25, 32, 38], bonus: 45 },
  { round: 1118, date: '2024-08-24', nums: [2, 3, 17, 27, 31, 40], bonus: 9 },
  { round: 1117, date: '2024-08-17', nums: [5, 8, 19, 26, 30, 41], bonus: 12 },
  { round: 1116, date: '2024-08-10', nums: [7, 13, 21, 29, 35, 44], bonus: 16 },
  { round: 1115, date: '2024-08-03', nums: [10, 15, 18, 24, 36, 43], bonus: 2 },
  { round: 1114, date: '2024-07-27', nums: [9, 20, 22, 28, 34, 39], bonus: 11 },
  { round: 1113, date: '2024-07-20', nums: [3, 6, 16, 27, 37, 45], bonus: 30 },
  { round: 1112, date: '2024-07-13', nums: [1, 14, 19, 25, 33, 41], bonus: 8 },
  { round: 1111, date: '2024-07-06', nums: [5, 9, 12, 24, 31, 42], bonus: 2 },
  { round: 1110, date: '2024-06-29', nums: [4, 7, 17, 26, 35, 44], bonus: 10 },
  { round: 1109, date: '2024-06-22', nums: [2, 11, 21, 28, 36, 40], bonus: 18 },
  { round: 1108, date: '2024-06-15', nums: [6, 13, 20, 27, 34, 43], bonus: 15 },
  { round: 1107, date: '2024-06-08', nums: [1, 8, 19, 24, 32, 45], bonus: 5 },
  { round: 1106, date: '2024-06-01', nums: [3, 9, 16, 23, 30, 41], bonus: 12 },
  { round: 1105, date: '2024-05-25', nums: [7, 10, 18, 25, 33, 40], bonus: 11 },
  { round: 1104, date: '2024-05-18', nums: [4, 12, 22, 29, 37, 44], bonus: 6 },
  { round: 1103, date: '2024-05-11', nums: [2, 14, 20, 26, 31, 42], bonus: 17 },
  { round: 1102, date: '2024-05-04', nums: [5, 11, 21, 28, 36, 45], bonus: 8 },
  { round: 1101, date: '2024-04-27', nums: [1, 6, 15, 27, 34, 43], bonus: 9 }
];

const MAX_NUMBER = 45;
const SET_COUNT = 5;
const PAGE_SIZE = 20;
const HISTORY_LIMIT = 8;
const STORAGE_KEY = 'recommendationHistory';
const DATA_URL = '/data/lotto.json';
const MODE_LABELS = {
  hot: '핫 넘버 집중',
  cold: '콜드+랜덤 믹스',
  balanced: '밸런스 조합'
};

const refs = {
  generateBtn: document.getElementById('generateBtn'),
  recommendations: document.getElementById('recommendations'),
  historyBody: document.getElementById('historyBody'),
  rangeText: document.getElementById('rangeText'),
  dataUpdated: document.getElementById('dataUpdated'),
  topNumbers: document.getElementById('topNumbers'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageNumbers: document.getElementById('pageNumbers'),
  pastRecommendations: document.getElementById('pastRecommendations'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn')
};

if (!refs.generateBtn || !refs.recommendations || !refs.historyBody || !refs.rangeText || !refs.topNumbers) {
  throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
}

let draws = [...SAMPLE_DRAWS];
let currentPage = 1;

const toPadded = (value) => String(value).padStart(2, '0');

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getMode = () => {
  const selected = document.querySelector('input[name="mode"]:checked');
  return selected ? selected.value : 'hot';
};

const allNumbers = () => Array.from({ length: MAX_NUMBER }, (_, idx) => idx + 1);

const countFrequency = () => {
  const freq = Array.from({ length: MAX_NUMBER + 1 }, () => 0);
  draws.forEach((draw) => {
    draw.nums.forEach((num) => {
      freq[num] += 1;
    });
  });
  return freq;
};

const weightedPickUnique = (pool, weights, size) => {
  const available = [...pool];
  const picked = [];

  while (picked.length < size && available.length > 0) {
    const total = available.reduce((sum, num) => sum + Math.max(1, weights[num]), 0);
    let cursor = Math.random() * total;
    let targetIndex = 0;

    for (let i = 0; i < available.length; i += 1) {
      cursor -= Math.max(1, weights[available[i]]);
      if (cursor <= 0) {
        targetIndex = i;
        break;
      }
    }

    picked.push(available[targetIndex]);
    available.splice(targetIndex, 1);
  }

  return picked;
};

const generateHotSet = (freq) => {
  const topPool = allNumbers()
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 24);

  const picked = weightedPickUnique(topPool, freq, 6);
  const fillPool = allNumbers();

  while (picked.length < 6) {
    const fallback = fillPool[Math.floor(Math.random() * fillPool.length)];
    if (!picked.includes(fallback)) {
      picked.push(fallback);
    }
  }

  return picked.sort((a, b) => a - b);
};

const generateColdSet = (freq) => {
  const sorted = allNumbers().sort((a, b) => freq[a] - freq[b]);
  const pool = [...sorted.slice(0, 20), ...sorted.slice(20, 30)];
  const picked = shuffle(pool).slice(0, 6);
  return picked.sort((a, b) => a - b);
};

const generateBalancedSet = () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const low = shuffle(Array.from({ length: 22 }, (_, idx) => idx + 1)).slice(0, 3);
    const high = shuffle(Array.from({ length: 23 }, (_, idx) => idx + 23)).slice(0, 3);
    const candidate = [...low, ...high];
    const oddCount = candidate.filter((num) => num % 2 === 1).length;
    if (oddCount >= 2 && oddCount <= 4) {
      return candidate.sort((a, b) => a - b);
    }
  }
  return shuffle(allNumbers()).slice(0, 6).sort((a, b) => a - b);
};

const generateSetByMode = (mode, freq) => {
  if (mode === 'cold') return generateColdSet(freq);
  if (mode === 'balanced') return generateBalancedSet();
  return generateHotSet(freq);
};

const pickBonus = (numbers, freq) => {
  const pool = allNumbers().filter((num) => !numbers.includes(num));
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, num) => sum + Math.max(1, freq[num]), 0);
  let cursor = Math.random() * total;

  for (let i = 0; i < pool.length; i += 1) {
    cursor -= Math.max(1, freq[pool[i]]);
    if (cursor <= 0) return pool[i];
  }
  return pool[0];
};

const getBallClass = (num) => {
  if (num <= 10) return 'ball-range-1';
  if (num <= 20) return 'ball-range-2';
  if (num <= 30) return 'ball-range-3';
  if (num <= 40) return 'ball-range-4';
  return 'ball-range-5';
};

const getBallColor = (num) => {
  if (num <= 10) return '#f9d648';
  if (num <= 20) return '#4aa6ff';
  if (num <= 30) return '#ff6b5c';
  if (num <= 40) return '#9aa1ab';
  return '#59c271';
};

const createBall = (num) => {
  const ball = document.createElement('span');
  ball.className = `number-ball ${getBallClass(num)}`;
  ball.textContent = String(num);
  return ball;
};

const createBonusSep = () => {
  const sep = document.createElement('span');
  sep.className = 'bonus-sep';
  sep.textContent = '+';
  return sep;
};

const createSetRow = (set, setIdx) => {
  const row = document.createElement('div');
  row.className = 'recommendation-row';

  const label = document.createElement('span');
  label.className = 'recommendation-label';
  label.textContent = `SET ${setIdx + 1}`;
  row.appendChild(label);

  set.numbers.forEach((num) => {
    row.appendChild(createBall(num));
  });

  if (set.bonus !== null) {
    row.appendChild(createBonusSep());
    row.appendChild(createBall(set.bonus));
  }

  return row;
};

const generateRecommendationSets = () => {
  const mode = getMode();
  const freq = countFrequency();
  const sets = Array.from({ length: SET_COUNT }, () => {
    const numbers = generateSetByMode(mode, freq);
    return {
      numbers,
      bonus: pickBonus(numbers, freq)
    };
  });
  return { mode, sets };
};

const renderRecommendationSets = (sets, mountEl) => {
  mountEl.innerHTML = '';
  const fragment = document.createDocumentFragment();
  sets.forEach((set, idx) => fragment.appendChild(createSetRow(set, idx)));
  mountEl.appendChild(fragment);
};

const normalizeHistoryRecord = (item) => {
  if (!item || !Array.isArray(item.sets) || !item.ts) return null;
  const mode = typeof item.mode === 'string' ? item.mode : 'hot';
  const modeLabel = MODE_LABELS[mode] || item.modeLabel || mode;
  const sets = item.sets
    .map((set) => {
      if (!set || !Array.isArray(set.numbers)) return null;
      const numbers = set.numbers
        .map((num) => Number(num))
        .filter((num) => Number.isInteger(num) && num >= 1 && num <= MAX_NUMBER)
        .slice(0, 6)
        .sort((a, b) => a - b);
      if (numbers.length !== 6) return null;
      const bonus = Number.isInteger(set.bonus) && set.bonus >= 1 && set.bonus <= MAX_NUMBER ? set.bonus : null;
      return { numbers, bonus };
    })
    .filter(Boolean);

  if (sets.length === 0) return null;
  return { ts: item.ts, mode, modeLabel, sets };
};

const getRecommendationHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeHistoryRecord)
      .filter(Boolean)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
};

const setRecommendationHistory = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
};

const saveRecommendationHistory = (mode, sets) => {
  const history = getRecommendationHistory();
  history.unshift({
    ts: new Date().toISOString(),
    mode,
    modeLabel: MODE_LABELS[mode] || mode,
    sets
  });
  setRecommendationHistory(history);
};

const renderPastRecommendations = () => {
  if (!refs.pastRecommendations) return;

  const history = getRecommendationHistory();
  refs.pastRecommendations.innerHTML = '';

  if (history.length === 0) {
    refs.pastRecommendations.innerHTML = '<p class="muted">아직 저장된 추천 기록이 없습니다.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  history.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'past-card';

    const dateLabel = document.createElement('div');
    dateLabel.className = 'recommendation-label';
    const date = new Date(item.ts);
    const readable = Number.isNaN(date.getTime()) ? item.ts : date.toLocaleString('ko-KR');
    dateLabel.textContent = `${idx + 1}. ${readable} · ${item.modeLabel}`;
    card.appendChild(dateLabel);

    const setsWrap = document.createElement('div');
    setsWrap.className = 'past-sets';

    item.sets.forEach((set, setIdx) => {
      const row = document.createElement('div');
      row.className = 'set-row';

      const setLabel = document.createElement('span');
      setLabel.className = 'set-label';
      setLabel.textContent = `SET ${setIdx + 1}`;
      row.appendChild(setLabel);

      set.numbers.forEach((num) => row.appendChild(createBall(num)));
      if (set.bonus !== null) {
        row.appendChild(createBonusSep());
        row.appendChild(createBall(set.bonus));
      }

      setsWrap.appendChild(row);
    });

    card.appendChild(setsWrap);
    fragment.appendChild(card);
  });

  refs.pastRecommendations.appendChild(fragment);
};

const renderRecommendations = ({ save = false } = {}) => {
  const { mode, sets } = generateRecommendationSets();
  renderRecommendationSets(sets, refs.recommendations);
  if (save) {
    saveRecommendationHistory(mode, sets);
    renderPastRecommendations();
  }
};

const renderHistory = () => {
  const sorted = [...draws].sort((a, b) => b.round - a.round);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = sorted.slice(start, start + PAGE_SIZE);

  refs.historyBody.innerHTML = '';
  const rowFragment = document.createDocumentFragment();

  rows.forEach((draw) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${draw.round}</td>
      <td>${draw.date}</td>
      <td>${draw.nums.map((num) => toPadded(num)).join(', ')}</td>
      <td>${toPadded(draw.bonus)}</td>
    `;
    rowFragment.appendChild(tr);
  });

  refs.historyBody.appendChild(rowFragment);

  const minRound = sorted[sorted.length - 1]?.round ?? '-';
  const maxRound = sorted[0]?.round ?? '-';
  refs.rangeText.textContent = `${minRound}회 ~ ${maxRound}회 (${sorted.length}개 회차)`;

  if (refs.pageNumbers) {
    refs.pageNumbers.innerHTML = '';
    const pageFragment = document.createDocumentFragment();
    for (let page = 1; page <= totalPages; page += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(page);
      if (page === currentPage) btn.classList.add('active');
      btn.addEventListener('click', () => {
        currentPage = page;
        renderHistory();
      });
      pageFragment.appendChild(btn);
    }
    refs.pageNumbers.appendChild(pageFragment);
  }

  if (refs.prevPage) refs.prevPage.disabled = currentPage <= 1;
  if (refs.nextPage) refs.nextPage.disabled = currentPage >= totalPages;
};

const renderTopNumbers = () => {
  if (!refs.topNumbers) return;

  const freq = countFrequency();
  const ranking = allNumbers()
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 8);

  if (ranking.length === 0) {
    refs.topNumbers.innerHTML = '<p class="muted">표시할 데이터가 없습니다.</p>';
    return;
  }

  const maxFreq = Math.max(...ranking.map((num) => freq[num]), 1);
  const width = 420;
  const height = 236;
  const padTop = 24;
  const padRight = 14;
  const padBottom = 38;
  const padLeft = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const step = plotW / ranking.length;
  const barW = Math.max(15, Math.min(24, step * 0.64));

  const gridLines = Array.from({ length: 3 }, (_, idx) => {
    const ratio = idx / 2;
    const y = padTop + plotH - plotH * ratio;
    return `<g class="chart-grid-line"><line x1="${padLeft}" y1="${y.toFixed(2)}" x2="${(width - padRight).toFixed(2)}" y2="${y.toFixed(2)}"/></g>`;
  }).join('');

  const bars = ranking
    .map((num, idx) => {
      const value = freq[num];
      const ratio = value / maxFreq;
      const barH = Math.max(4, plotH * ratio);
      const x = padLeft + idx * step + (step - barW) / 2;
      const y = padTop + plotH - barH;
      const cx = x + barW / 2;
      const fill = getBallColor(num);
      const countY = Math.max(12, y - 6);

      return `
        <g class="chart-bar-group">
          <rect class="chart-bar" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${barH.toFixed(2)}" rx="4" ry="4" style="fill:${fill}">
            <title>${num}번 ${value}회</title>
          </rect>
          <text class="chart-count" x="${cx.toFixed(2)}" y="${countY.toFixed(2)}" text-anchor="middle">${value}회</text>
          <text class="chart-label" x="${cx.toFixed(2)}" y="${(padTop + plotH + 18).toFixed(2)}" text-anchor="middle">${num}</text>
        </g>
      `;
    })
    .join('');

  refs.topNumbers.innerHTML = `
    <svg class="top-number-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${gridLines}
      <line class="chart-axis" x1="${padLeft}" y1="${(padTop + plotH).toFixed(2)}" x2="${(width - padRight).toFixed(2)}" y2="${(padTop + plotH).toFixed(2)}"></line>
      ${bars}
    </svg>
    <p class="top-number-caption">상위 8개 번호 출현 횟수 그래프</p>
  `;
};

const normalizeDrawRecord = (item) => {
  if (!item || !Array.isArray(item.nums)) return null;
  const round = Number(item.round);
  const bonus = Number(item.bonus);
  const nums = item.nums
    .map((num) => Number(num))
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= MAX_NUMBER)
    .slice(0, 6);

  if (!Number.isInteger(round) || round <= 0) return null;
  if (!Number.isInteger(bonus) || bonus < 1 || bonus > MAX_NUMBER) return null;
  if (nums.length !== 6) return null;

  return {
    round,
    date: String(item.date || ''),
    nums: nums.sort((a, b) => a - b),
    bonus
  };
};

const loadDrawsFromJson = async () => {
  refs.rangeText.textContent = '로또 데이터를 불러오는 중...';
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.draws) || data.draws.length === 0) {
      throw new Error('invalid draw list');
    }

    const normalized = data.draws.map(normalizeDrawRecord).filter(Boolean);
    if (normalized.length === 0) {
      throw new Error('normalized draw list empty');
    }

    draws = normalized;
    if (refs.dataUpdated) {
      refs.dataUpdated.textContent = `데이터 업데이트: ${String(data.updatedAt || '').slice(0, 10) || '-'} · ${normalized.length}개 회차`;
    }
  } catch (err) {
    console.warn('데이터 로딩 실패, 샘플 데이터를 사용합니다.', err);
    draws = [...SAMPLE_DRAWS];
    refs.rangeText.textContent = '데이터 로딩 실패: 샘플 데이터를 표시합니다.';
    if (refs.dataUpdated) {
      refs.dataUpdated.textContent = `데이터 업데이트: ${new Date().toISOString().slice(0, 10)} · ${draws.length}개 회차`;
    }
  }

  renderRecommendations();
  renderHistory();
  renderTopNumbers();
  renderPastRecommendations();
};

refs.generateBtn.addEventListener('click', () => {
  renderRecommendations({ save: true });
});

if (refs.prevPage) {
  refs.prevPage.addEventListener('click', () => {
    currentPage -= 1;
    renderHistory();
  });
}

if (refs.nextPage) {
  refs.nextPage.addEventListener('click', () => {
    currentPage += 1;
    renderHistory();
  });
}

if (refs.clearHistoryBtn) {
  refs.clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderPastRecommendations();
  });
}

loadDrawsFromJson();
