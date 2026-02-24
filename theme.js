const THEME_KEY = 'theme';

const getStoredTheme = () => localStorage.getItem(THEME_KEY);
const getSystemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const setDisqusTheme = (theme) => {
  const thread = document.getElementById('disqus_thread');
  if (!thread) return;
  thread.setAttribute('data-theme', theme);
  if (window.DISQUS && typeof window.DISQUS.reset === 'function') {
    window.DISQUS.reset({
      reload: true,
      config() {
        this.page.url = window.location.href;
        this.page.identifier = window.location.pathname;
      }
    });
  }
};

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('theme-dark', isDark);
  document.body.classList.toggle('theme-dark', isDark);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = isDark ? '라이트 모드' : '다크 모드';
    themeToggle.setAttribute('aria-pressed', String(isDark));
  }
  setDisqusTheme(theme);
};

const initTheme = () => {
  const stored = getStoredTheme();
  const initial = stored || getSystemTheme();
  applyTheme(initial);
};

const bindThemeToggle = () => {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  themeToggle.addEventListener('click', () => {
    const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
};

initTheme();
bindThemeToggle();
