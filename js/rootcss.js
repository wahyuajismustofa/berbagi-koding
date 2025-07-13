(function updateViewportSize() {
  const root = document.documentElement;

  function setSizeVars() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    root.style.setProperty('--wam-vw', `${width}px`);
    root.style.setProperty('--wam-vh', `${height}px`);
  }

  // Inisialisasi saat file dipanggil
  setSizeVars();

  // Update saat resize
  window.addEventListener("resize", setSizeVars);
  document.addEventListener("DOMContentLoaded", setSizeVars);
})();
