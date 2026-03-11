/**
 * CERTITRACK - Shared Theme Toggle
 * Runs on every page. Reads/writes theme preference to localStorage.
 */
(function () {
    // Apply saved theme immediately (before paint) to avoid flash
    const saved = localStorage.getItem('certitrack-theme') || 'dark';
    document.body.classList.toggle('theme-light', saved === 'light');
    document.body.classList.toggle('theme-dark', saved !== 'light');

    function updateIcon() {
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = document.body.classList.contains('theme-light') ? '🌙' : '☀️';
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateIcon();
        document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('theme-light');
            document.body.classList.toggle('theme-dark', !isLight);
            localStorage.setItem('certitrack-theme', isLight ? 'light' : 'dark');
            updateIcon();
        });
    });
})();
