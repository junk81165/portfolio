(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const loader = document.querySelector('.loader');

  document.querySelectorAll('.yr').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Small UI that works without GSAP ---------- */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.querySelector('.menu');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  document.querySelectorAll('.copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = btn.querySelector('span');
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        label.textContent = 'Copied ✓';
      } catch {
        label.textContent = btn.dataset.copy;
      }
      setTimeout(() => (label.textContent = 'Copy email'), 2000);
    });
  });

  // Fallback: no animation library or reduced motion → show everything.
  if (!hasGsap || reduced) {
    loader && loader.remove();
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });
    animateCountsStatic();
    return;
  }

  root.classList.add('motion');
  body.classList.add('is-loading');
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -40, duration: 1.4 });
      else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
    });
  });

  /* ---------- Preloader → hero intro ---------- */
  const num = document.querySelector('.loader__num');
  const counter = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });

  intro
    .from('.loader__name span', { yPercent: 110, duration: 1, stagger: .08 })
    .to('.loader__bar i', { scaleX: 1, duration: 1.4, ease: 'power3.inOut' }, '<.1')
    .to(counter, {
      v: 100, duration: 1.4, ease: 'power3.inOut',
      onUpdate: () => (num.textContent = Math.round(counter.v))
    }, '<')
    .to('.loader__inner', { yPercent: -30, opacity: 0, duration: .6, ease: 'power3.in' }, '+=.1')
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=.2')
    .add(() => {
      loader.remove();
      body.classList.remove('is-loading');
      lenis && lenis.start();
    })
    .to('.hero .split', { y: 0, duration: 1.4, stagger: .1 }, '-=.55')
    .to('.portrait__frame', { clipPath: 'inset(0% 0 0 0 round 220px 220px 18px 18px)', duration: 1.6, ease: 'expo.inOut' }, '<-.3')
    .from('.portrait__img', { scale: 1.3, duration: 2 }, '<')
    .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 1.1, stagger: .08 }, '<.5')
    .to(['.portrait__tag', '.portrait__badge'], { opacity: 1, duration: .8, stagger: .1 }, '<.3')
    .from('.portrait__tag', { x: -20, duration: .8 }, '<')
    .from('.portrait__badge', { scale: .6, rotate: -60, duration: 1.2 }, '<');

  /* ---------- Nav state ---------- */
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > 600 && !menu.classList.contains('is-open'));
      gsap.set('.progress i', { scaleX: self.progress });
    }
  });

  document.querySelectorAll('.nav__links a').forEach(link => {
    const sec = document.querySelector(link.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: s => link.classList.toggle('is-active', s.isActive)
    });
  });

  /* ---------- Hero parallax ---------- */
  gsap.to('.portrait__img', {
    yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__title', {
    yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- Marquee skews with scroll velocity ---------- */
  const track = document.querySelector('.marquee__track');
  const skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3' });
  ScrollTrigger.create({
    onUpdate: s => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300))
  });

  /* ---------- Statement: word-by-word reveal ---------- */
  document.querySelectorAll('[data-words]').forEach(el => {
    const wrap = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          wrap(child);
        }
      });
    };
    wrap(el);
    gsap.fromTo(el.querySelectorAll('.w'), { opacity: .12 }, {
      opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  /* ---------- Generic reveals ---------- */
  ScrollTrigger.batch('main .section .reveal-up', {
    start: 'top 88%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .09, overwrite: true })
  });
  ScrollTrigger.batch('.reveal-line', {
    start: 'top 92%',
    onEnter: els => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 })
  });

  gsap.utils.toArray('.section__head').forEach(h => {
    gsap.from(h, {
      opacity: 0, y: 16, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 90%' }
    });
  });

  gsap.from('.case__org', {
    yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.experience', start: 'top 75%' }
  });

  gsap.from('.cert', {
    y: 60, opacity: 0, rotateX: -12, duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.certs', start: 'top 85%' }
  });

  /* ---------- Impact panel: scale-in + counters ---------- */
  gsap.from('.impact', {
    scale: .94, borderRadius: 80, ease: 'none',
    scrollTrigger: { trigger: '.impact', start: 'top bottom', end: 'top 30%', scrub: true }
  });
  gsap.from('.stat', {
    y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.stats', start: 'top 80%' }
  });
  document.querySelectorAll('.count').forEach(el => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    gsap.to(o, {
      v: to, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => (el.textContent = o.v.toFixed(dec))
    });
  });

  /* ---------- Contact headline ---------- */
  gsap.to('.contact .split', {
    y: 0, duration: 1.4, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.contact', start: 'top 70%' }
  });
  gsap.from('.contact__mail, .contact__row', {
    y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.contact', start: 'top 55%' }
  });

  /* ---------- Pointer niceties (desktop only) ---------- */
  if (!fine) return;

  const cursor = document.querySelector('.cursor');
  const cursorLabel = cursor.querySelector('.cursor__label');
  const cx = gsap.quickTo(cursor, 'x', { duration: .45, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: .45, ease: 'power3' });
  const darkZones = [...document.querySelectorAll('.impact, .contact, .marquee')];
  const labels = { hello: 'Hello', read: 'Read', write: 'Write' };

  window.addEventListener('pointermove', e => {
    cursor.style.opacity = 1;
    cx(e.clientX); cy(e.clientY);
    const t = e.target;
    const labelHost = t.closest('[data-cursor]');
    const isLink = t.closest('a, button');
    cursor.classList.toggle('is-label', !!labelHost && !isLink);
    cursor.classList.toggle('is-link', !!isLink);
    if (labelHost) cursorLabel.textContent = labels[labelHost.dataset.cursor] || '';
    cursor.classList.toggle('on-dark', darkZones.some(z => z.contains(t)) && !labelHost);
  });
  document.addEventListener('pointerleave', () => (cursor.style.opacity = 0));

  document.querySelectorAll('.magnetic').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * .3);
      yTo((e.clientY - (r.top + r.height / 2)) * .4);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  document.querySelectorAll('.tilt').forEach(card => {
    const rx = gsap.quickTo(card, 'rotateX', { duration: .6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotateY', { duration: .6, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      ry((px - .5) * 10);
      rx((.5 - py) * 10);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  /* ---------- helpers ---------- */
  function animateCountsStatic() {
    document.querySelectorAll('.count').forEach(el => {
      el.textContent = parseFloat(el.dataset.to).toFixed(parseInt(el.dataset.dec || '0', 10));
    });
  }
})();
