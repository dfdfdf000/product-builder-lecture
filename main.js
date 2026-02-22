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
const HISTORY_LIMIT = 12;
const DATA_URL = '/data/lotto.json';

let draws = [...SAMPLE_DRAWS];

const generateBtn = document.getElementById('generateBtn');
const recommendationsEl = document.getElementById('recommendations');
const historyBody = document.getElementById('historyBody');
const rangeText = document.getElementById('rangeText');
const dataUpdated = document.getElementById('dataUpdated');
const topNumbersEl = document.getElementById('topNumbers');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const pastRecommendationsEl = document.getElementById('pastRecommendations');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let currentPage = 1;

const getMode = () => {
  const selected = document.querySelector('input[name="mode"]:checked');
  return selected ? selected.value : 'hot';
};

const countFrequency = () => {
  const freq = Array.from({ length: MAX_NUMBER + 1 }, () => 0);
  draws.forEach((draw) => {
    draw.nums.forEach((num) => {
      freq[num] += 1;
    });
  });
  return freq;
};


const pickWeighted = (pool, weights, count) => {
  const picked = new Set();
  while (picked.size < count && pool.length > 0) {
    const total = pool.reduce((sum, n) => sum + weights[n], 0);
    let r = Math.random() * total;
    for (const n of pool) {
      r -= weights[n];
      if (r <= 0) {
        picked.add(n);
        break;
      }
    }
  }
  return Array.from(picked);
};

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

const generateHotSet = (freq) => {
  const top = [...Array(MAX_NUMBER).keys()].map((n) => n + 1)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 25);
  const weights = freq.map((v) => (v === 0 ? 1 : v));
  const picked = pickWeighted(top, weights, 6);
  while (picked.length < 6) {
    const next = Math.floor(Math.random() * MAX_NUMBER) + 1;
    if (!picked.includes(next)) picked.push(next);
  }
  return picked.sort((a, b) => a - b);
};

const generateColdSet = (freq) => {
  const sorted = [...Array(MAX_NUMBER).keys()].map((n) => n + 1)
    .sort((a, b) => freq[a] - freq[b]);
  const cold = sorted.slice(0, 18);
  const mixed = [...cold, ...sorted.slice(18, 30)];
  const picked = shuffle(mixed).slice(0, 6);
  return picked.sort((a, b) => a - b);
};

const generateBalancedSet = () => {
  const low = shuffle([...Array(22).keys()].map((n) => n + 1)).slice(0, 3);
  const high = shuffle([...Array(23).keys()].map((n) => n + 23)).slice(0, 3);
  const combined = [...low, ...high];
  const odds = combined.filter((n) => n % 2 === 1);
  if (odds.length < 2 || odds.length > 4) {
    return generateBalancedSet();
  }
  return combined.sort((a, b) => a - b);
};

const generateSetByMode = (mode, freq) => {
  if (mode === 'cold') return generateColdSet(freq);
  if (mode === 'balanced') return generateBalancedSet();
  return generateHotSet(freq);
};

const generateRecommendationSets = () => {
  const mode = getMode();
  const freq = countFrequency();
  const sets = [];

  for (let i = 0; i < SET_COUNT; i += 1) {
    sets.push(generateSetByMode(mode, freq));
  }
  return { mode, sets };
};

const renderRecommendationSets = (sets) => {
  recommendationsEl.innerHTML = '';
  sets.forEach((numbers, idx) => {
    const row = document.createElement('div');
    row.className = 'recommendation-row';

    const label = document.createElement('span');
    label.className = 'recommendation-label';
    label.textContent = `SET ${idx + 1}`;

    row.appendChild(label);
    numbers.forEach((num) => {
      const ball = document.createElement('span');
      ball.className = 'number-ball';
      ball.textContent = num;
      row.appendChild(ball);
    });

    recommendationsEl.appendChild(row);
  });
};

const saveRecommendationHistory = (record) => {
  const raw = localStorage.getItem('recommendationHistory');
  const list = raw ? JSON.parse(raw) : [];
  list.unshift(record);
  const trimmed = list.slice(0, HISTORY_LIMIT);
  localStorage.setItem('recommendationHistory', JSON.stringify(trimmed));
};

const renderPastRecommendations = () => {
  if (!pastRecommendationsEl) return;
  pastRecommendationsEl.innerHTML = '';
  const raw = localStorage.getItem('recommendationHistory');
  const list = raw ? JSON.parse(raw) : [];
  if (list.length === 0) {
    pastRecommendationsEl.innerHTML = '<p class="muted">아직 저장된 추천 기록이 없습니다.</p>';
    return;
  }

  list.forEach((item, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'recommendation-row';

    const label = document.createElement('span');
    label.className = 'recommendation-label';
    const date = new Date(item.ts);
    label.textContent = `${idx + 1}. ${date.toLocaleString('ko-KR')} · ${item.modeLabel}`;
    wrapper.appendChild(label);

    item.sets.forEach((set) => {
      const group = document.createElement('div');
      group.className = 'recommendation-row';
      set.forEach((num) => {
        const ball = document.createElement('span');
        ball.className = 'number-ball';
        ball.textContent = num;
        group.appendChild(ball);
      });
      wrapper.appendChild(group);
    });

    pastRecommendationsEl.appendChild(wrapper);
  });
};

const renderRecommendations = ({ save = false } = {}) => {
  const { mode, sets } = generateRecommendationSets();
  const modeLabelMap = {
    hot: '핫 넘버 집중',
    cold: '콜드+랜덤 믹스',
    balanced: '밸런스 조합'
  };
  renderRecommendationSets(sets);
  if (save) {
    saveRecommendationHistory({
      ts: new Date().toISOString(),
      mode,
      modeLabel: modeLabelMap[mode] || mode,
      sets
    });
    renderPastRecommendations();
  }
};

const renderHistory = () => {
  historyBody.innerHTML = '';
  const sorted = [...draws].sort((a, b) => b.round - a.round);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  pageItems.forEach((draw) => {
    const tr = document.createElement('tr');
    const numbers = draw.nums.map((n) => n.toString().padStart(2, '0')).join(', ');

    tr.innerHTML = `
      <td>${draw.round}</td>
      <td>${draw.date}</td>
      <td>${numbers}</td>
      <td>${draw.bonus.toString().padStart(2, '0')}</td>
    `;
    historyBody.appendChild(tr);
  });

  const minRound = sorted[sorted.length - 1]?.round ?? '-';
  const maxRound = sorted[0]?.round ?? '-';
  rangeText.textContent = `${minRound}회 ~ ${maxRound}회 (${sorted.length}개 회차)`;

  if (pageInfo) {
    pageInfo.textContent = `페이지 ${currentPage} / ${totalPages}`;
  }
  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
  }
  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
  }
};

const renderTopNumbers = () => {
  const freq = countFrequency();
  const ranking = [...Array(MAX_NUMBER).keys()].map((n) => n + 1)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 8);

  topNumbersEl.innerHTML = '';
  ranking.forEach((num) => {
    const li = document.createElement('li');
    li.textContent = `${num} (${freq[num]}회)`;
    topNumbersEl.appendChild(li);
  });
};

const loadDrawsFromJson = async () => {
  rangeText.textContent = '로또 데이터를 불러오는 중...';
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('data fetch failed');
    const data = await res.json();
    if (!Array.isArray(data.draws) || data.draws.length === 0) {
      throw new Error('invalid data');
    }
    draws = data.draws;
    if (dataUpdated) {
      dataUpdated.textContent = `데이터 업데이트: ${data.updatedAt?.slice(0, 10) || '-'} · ${data.count}개 회차`;
    }
  } catch (err) {
    console.warn('데이터 로딩 실패, 샘플 데이터를 사용합니다.', err);
    rangeText.textContent = '데이터 로딩 실패: 샘플 데이터를 표시합니다.';
    draws = [...SAMPLE_DRAWS];
  }
  renderRecommendations();
  renderHistory();
  renderTopNumbers();
  renderPastRecommendations();
};

['change'].forEach((evt) => {
  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener(evt, () => renderRecommendations());
  });
});

generateBtn.addEventListener('click', () => renderRecommendations({ save: true }));
if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    currentPage -= 1;
    renderHistory();
  });
}
if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    currentPage += 1;
    renderHistory();
  });
}
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('recommendationHistory');
    renderPastRecommendations();
  });
}

loadDrawsFromJson();
