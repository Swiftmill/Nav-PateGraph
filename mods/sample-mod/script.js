export function mount(node) {
  const banner = node.querySelector('.mod-banner');
  if (!banner) return;
  banner.addEventListener('click', () => {
    banner.classList.toggle('mod-banner--alt');
  });
}

export function unmount() {
  // Nettoyage éventuel
}
