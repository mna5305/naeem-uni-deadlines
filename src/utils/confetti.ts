export function spawnConfetti(x: number, y: number) {
  const emojis = ['🎉', '✨', '⭐', '🎊', '💜', '🔥', '🏆', '💯'];
  const count = 16;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'fx-particle';
    el.textContent = emojis[i % emojis.length];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    const dx = Math.random() * 260 - 130;
    const dy = -Math.random() * 180 - 40;
    const r = Math.random() * 360 - 180;

    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--r', `${r}deg`);

    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 950);
  }
}
