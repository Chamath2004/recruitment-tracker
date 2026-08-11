function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  if (!icon) return;
  icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
  if (window.lucide) lucide.createIcons();
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

document.addEventListener('DOMContentLoaded', function () {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  updateThemeIcon(current);
});
