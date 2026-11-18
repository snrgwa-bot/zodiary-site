'use strict';
document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrances: heading, then text, then picture, each a beat after the last. */
(function () {
  const els = $$('.rise');
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => io.observe(e));
})();

/* The stage: the fixed phone turns to the matching page as each section arrives. */
(function () {
  const figs = $$('.stage figure');
  if (!figs.length) return;
  const cap = $('.stage .cap b');
  const show = (k, label) => {
    figs.forEach(f => f.classList.toggle('on', f.dataset.k === k));
    if (cap && label) cap.textContent = label;
  };
  show(figs[0].dataset.k, figs[0].dataset.label);
  const io = new IntersectionObserver(es => {
    const hit = es.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (hit) show(hit.target.dataset.stage, hit.target.dataset.label);
  }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.01, 0.5] });
  $$('[data-stage]').forEach(s => io.observe(s));
})();

/* The live thing: type a birthday, read your sun sign and your Chinese animal. */
(function () {
  const inp = $('#dob');
  if (!inp) return;
  const out = $('#result');
  const STEMS = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
  const STEM_TXT = { Wood: 'growth and cooperation', Fire: 'passion and visibility', Earth: 'stability and care', Metal: 'focus and determination', Water: 'intuition and adaptability' };
  // First day of each sign (month, day, sign index). Cusp days shift by the year and the hour, so the app uses your exact birth time.
  const CUSPS = [[1, 20, 10], [2, 19, 11], [3, 21, 0], [4, 20, 1], [5, 21, 2], [6, 21, 3], [7, 23, 4], [8, 23, 5], [9, 23, 6], [10, 23, 7], [11, 22, 8], [12, 22, 9]];
  const signOf = (m, d) => { let s = 9; for (const [cm, cd, i] of CUSPS) { if (m > cm || (m === cm && d >= cd)) s = i; } return s; };
  const animalOf = (y, m, d) => { const Y = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y; return { a: ((Y - 4) % 12 + 12) % 12, e: STEMS[((Y - 4) % 10 + 10) % 10] }; };
  let data = null;
  const render = () => {
    if (!data) return;
    const v = inp.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    const [y, m, d] = v.split('-').map(Number);
    const s = data.signs[signOf(m, d)], c = animalOf(y, m, d), an = data.animals[c.a];
    out.classList.add('swap');
    setTimeout(() => {
      $('.sign', out).textContent = s.n;
      $('.core', out).textContent = s.c;
      $('.animal', out).textContent = c.e + ' ' + an.n + ' ' + an.z;
      $('.atxt', out).textContent = an.t + ' ' + c.e + ' adds ' + STEM_TXT[c.e] + '.';
      out.classList.remove('swap');
    }, reduce ? 0 : 160);
  };
  fetch('data.json').then(r => r.json()).then(j => { data = j; render(); }).catch(() => { /* the static example stays */ });
  inp.addEventListener('input', render);
  inp.addEventListener('change', render);
})();

/* Feedback: the phone leans a little toward the pointer. */
(function () {
  if (reduce || !matchMedia('(hover: hover)').matches) return;
  const st = $('.stage');
  if (!st) return;
  st.addEventListener('pointermove', e => {
    const r = st.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    st.style.setProperty('--tx', (x * 10).toFixed(2) + 'px');
    st.style.setProperty('--ty', (y * 10).toFixed(2) + 'px');
  });
  st.addEventListener('pointerleave', () => { st.style.setProperty('--tx', '0px'); st.style.setProperty('--ty', '0px'); });
})();

/* The moving picture: a real recording of the app, played only while it is on screen. */
(function () {
  const v = $('#loop');
  if (!v || reduce) return;           // reduced motion: the poster frame stays
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
  }), { threshold: 0.25 });
  io.observe(v);
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); });
})();
