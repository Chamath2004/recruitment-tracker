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

function setupMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const closeBtn = document.querySelector('.sidebar-close-btn');
  if (!sidebar || !menuBtn || !backdrop) return;

  function setMenuIcon(isOpen) {
    const icon = menuBtn.querySelector('i');
    if (!icon) return;
    icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
    if (window.lucide) lucide.createIcons();
  }

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('visible');
    setMenuIcon(true);
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('visible');
    setMenuIcon(false);
  }

  menuBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('mobile-open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  backdrop.addEventListener('click', closeMobileSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);

  // Deferred so the nav item's own onclick (view switch) always runs first,
  // even if closing the drawer triggers a reflow on the same tick.
  sidebar.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      setTimeout(closeMobileSidebar, 0);
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  updateThemeIcon(current);
  setupMobileSidebar();
});
