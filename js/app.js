(function () {
  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  const heroImg = hero ? hero.querySelector('.hero-bg img') : null;

  const getScrollTop = () =>
      window.pageYOffset || document.documentElement.scrollTop || 0;

  /* ------------------------------------------------------------------ */
  /*  Header height + back to top                                       */
  /* ------------------------------------------------------------------ */
  function setHeaderVar() {
    const h = header ? header.offsetHeight : 64;
    document.documentElement.style.setProperty('--headerH', h + 'px');
  }
  setHeaderVar();
  addEventListener('resize', setHeaderVar);

  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function toggleHeaderAndBackToTop() {
    if (header) {
      header.classList.toggle('is-visible', window.scrollY > 10);
    }
    const btn = document.getElementById('back-to-top');
    if (btn) {
      const show = window.scrollY > 300;
      btn.classList.toggle('visible', show);
    }
  }
  addEventListener('scroll', toggleHeaderAndBackToTop, { passive: true });
  toggleHeaderAndBackToTop();

  /* ------------------------------------------------------------------ */
  /*  ScrollSpy                                                          */
  /* ------------------------------------------------------------------ */
  (function () {
    // include dropdown button (Collections) + other links
    const links = Array.from(
        document.querySelectorAll('.menu .links a[data-spy], .menu .links .drop-btn[data-spy]')
    );
    if (!links.length) return;

    const sections = links
        .map(a => {
          const sel = a.getAttribute('data-spy');
          const el = sel ? document.querySelector(sel) : null;
          return { a, el };
        })
        .filter(x => x.el);

    const setActive = sel => {
      links.forEach(l =>
          l.classList.toggle('active', l.getAttribute('data-spy') === sel)
      );
    };

    // click -> smooth scroll + active
    document.addEventListener('click', function (e) {
      const link = e.target.closest('.menu .links a[data-spy], .menu .links .drop-btn[data-spy]');
      if (!link) return;
      const sel = link.getAttribute('data-spy');
      const target = sel ? document.querySelector(sel) : null;
      if (!target) return;
      e.preventDefault();
      setActive(sel);
      const top =
          target.getBoundingClientRect().top +
          getScrollTop() -
          (header ? header.offsetHeight : 0) -
          12;
      window.scrollTo({ top, behavior: 'smooth' });
    });

    // smooth, forgiving observer
    const io = new IntersectionObserver(
        entries => {
          const visible = entries
              .filter(e => e.isIntersecting && e.intersectionRatio > 0.2)
              .sort((a, b) => {
                if (b.intersectionRatio !== a.intersectionRatio) {
                  return b.intersectionRatio - a.intersectionRatio;
                }
                return (
                    a.target.getBoundingClientRect().top -
                    b.target.getBoundingClientRect().top
                );
              });

          if (visible[0]) {
            setActive('#' + visible[0].target.id);
          }
        },
        {
          threshold: [0.2, 0.4, 0.6, 0.8, 1],
          rootMargin: `-${(header?.offsetHeight || 64) + 12}px 0px -40% 0px`,
        }
    );

    sections.forEach(({ el }) => io.observe(el));
  })();

  /* ------------------------------------------------------------------ */
  /*  Mobile menu + dropdown                                            */
  /* ------------------------------------------------------------------ */
  (function () {
    const nav = document.querySelector('.menu');
    const btn = document.querySelector('.menu-btn');
    const links = document.querySelector('.menu .links');
    const dropdown = document.querySelector('.dropdown');
    const dropBtn = document.querySelector('.dropdown .drop-btn');

    function closeMenu() {
      nav && nav.classList.remove('open');
      btn && btn.setAttribute('aria-expanded', 'false');
    }
    btn &&
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    if (dropBtn) {
      dropBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        dropBtn.setAttribute(
            'aria-expanded',
            dropdown.classList.contains('open') ? 'true' : 'false'
        );
      });
      document.addEventListener('click', e => {
        if (dropdown && !dropdown.contains(e.target)) {
          dropdown.classList.remove('open');
          dropBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    links &&
    links.addEventListener('click', e => {
      if (e.target.matches('a')) closeMenu();
    });
    document.addEventListener('click', e => {
      if (!nav || !btn) return;
      if (!nav.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });
  })();

  /* ------------------------------------------------------------------ */
  /*  Smooth in-page anchors (non-nav)                                  */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]:not(.menu .links a)');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top =
        target.getBoundingClientRect().top +
        getScrollTop() -
        (header ? header.offsetHeight : 0) -
        12;
    window.scrollTo({ top, behavior: 'smooth' });
  });

  /* ------------------------------------------------------------------ */
  /*  Year                                                              */
  /* ------------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ */
  /*  Hero parallax                                                     */
  /* ------------------------------------------------------------------ */
  if (hero && heroImg) {
    let ticking = false;
    const prefersReduced =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function computeFitMode() {
      const vw = innerWidth || 1,
          vh = innerHeight || 1;
      const iw = heroImg.naturalWidth || 2774,
          ih = heroImg.naturalHeight || 4174;
      const imgHeightAt100vw = vw * (ih / iw);
      let fitWidth = imgHeightAt100vw >= vh;
      if (vw <= 480 || vh <= 600) fitWidth = false;
      hero.classList.toggle('fit-width', fitWidth);
      hero.classList.toggle('fit-height', !fitWidth);
    }
    function update() {
      const vw = innerWidth || 1,
          vh = innerHeight || 1;
      const iw = heroImg.naturalWidth || 2774,
          ih = heroImg.naturalHeight || 4174;
      const isFitWidth = hero.classList.contains('fit-width');
      const imgH = isFitWidth ? vw * (ih / iw) : vh;
      const heroH = vh;
      const travel = Math.max(imgH - heroH, 0);
      const start = hero.offsetTop;
      const anchor =
          document.getElementById('collections') ||
          document.getElementById('products') ||
          document.getElementById('contact');
      const end = anchor ? anchor.offsetTop : start + heroH;
      const total = Math.max(end - start, 1);
      const scrolled = Math.min(Math.max(getScrollTop() - start, 0), total);
      const p = Math.min(Math.max(scrolled / total, 0), 1);
      const tiny = (innerWidth || 0) <= 360 || (innerHeight || 0) <= 600;
      const zoomMax = prefersReduced ? 0 : tiny ? 0.06 : 0.12;
      hero.style.setProperty('--zoom', (p * zoomMax).toFixed(3));
      hero.style.setProperty(
          '--offset',
          (-p * (tiny ? travel * 0.85 : travel)).toFixed(1) + 'px'
      );
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    function onResize() {
      if (!heroImg.complete) return;
      computeFitMode();
      onScroll();
    }
    if (heroImg.complete) {
      computeFitMode();
      update();
    } else
      heroImg.addEventListener('load', () => {
        computeFitMode();
        update();
      });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
  }

  /* ------------------------------------------------------------------ */
  /*  SlideClock                                                        */
  /* ------------------------------------------------------------------ */
  const SlideClock = (() => {
    const interval = 7000;
    const listeners = new Set();
    let base = performance.now();
    let timer = 0;
    function scheduleNext() {
      const now = performance.now();
      const elapsed = now - base;
      const remainder = interval - (elapsed % interval);
      timer = window.setTimeout(tick, remainder);
    }
    function tick() {
      listeners.forEach(fn => {
        try {
          fn();
        } catch {}
      });
      scheduleNext();
    }
    function start() {
      if (timer) return;
      base = performance.now();
      scheduleNext();
    }
    function stop() {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    }
    function subscribe(fn) {
      listeners.add(fn);
    }
    function unsubscribe(fn) {
      listeners.delete(fn);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    start();
    return { start, stop, subscribe, unsubscribe, interval };
  })();

  /* ------------------------------------------------------------------ */
  /*  Shared helpers (cache / cart / URLs)                              */
  /* ------------------------------------------------------------------ */
  const CACHE_KEY = 'edelhart:images:v5';
  const HANDOFF_KEY = 'edelhart:handoff:v2';
  const CART_KEY = 'edelhart:cart:v2'; // v2 = with priceNum

  function readImageCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '');
    } catch {
      return null;
    }
  }
  function writeImageCache(items) {
    const payload = { ts: Date.now(), items };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {}
    return payload;
  }
  function readHandoff() {
    try {
      return JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || '');
    } catch {
      return null;
    }
  }
  function writeHandoff(slug, imagesAbs) {
    try {
      sessionStorage.setItem(
          HANDOFF_KEY,
          JSON.stringify({ slug, images: imagesAbs, ts: Date.now() })
      );
    } catch {}
  }
  function clearHandoff() {
    try {
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch {}
  }
  function slugFromPath(p) {
    if (!p) return '';
    const segs = p.split('/').filter(Boolean);
    const last = segs[segs.length - 1] || '';
    return last.replace(/\.html?$/i, '');
  }
  function listFromCSV(csv) {
    return (csv || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  function toAbsList(list, baseUrl) {
    return list.map(src => {
      try {
        return new URL(src, baseUrl).href;
      } catch {
        return src;
      }
    });
  }

  function parsePrice(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /* --- cart storage --- */
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }
  function writeCart(arr) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(arr));
    } catch {}
  }

  /* ------------------------------------------------------------------ */
  /*  Order message builders                                            */
  /* ------------------------------------------------------------------ */
  function buildOrderMessageFromForm(form) {
    const data = new FormData(form);
    const product =
        form.getAttribute('data-product') ||
        document.title.replace(/ · .*$/, '');
    const size = data.get('size') || 'N/A';
    const metal = data.get('metal') || 'N/A';
    const qty = data.get('qty') || 1;
    const style = data.get('style') || '';
    const stone = data.get('stone') || '';

    const lines = [
      `I'm interested in ordering this beautiful piece:`,
      `- Product: ${product}`,
      `- Metal: ${metal}`,
      stone ? `- Stone: ${stone}` : '',
      style ? `- Style: ${style}` : '',
      `- Size: ${size}`,
      `- Quantity: ${qty}`,
      `Could you please confirm availability and provide next steps?`,
    ].filter(Boolean);

    const plain = `Hello EDELHART,\n\n${lines.join('\n')}\n\nThank you.`;
    return { plain, encoded: encodeURIComponent(plain) };
  }

  function buildOrderMessageFromCart(cart) {
    if (!Array.isArray(cart) || !cart.length) {
      const plainEmpty =
          `Hello EDELHART,\n\nMy cart is currently empty, ` +
          `but I'm interested in your pieces.\n\nThank you.`;
      return { plain: plainEmpty, encoded: encodeURIComponent(plainEmpty) };
    }

    const lines = [
      `I would like to order the following items:`,
      ...cart.map(item => {
        const parts = [];
        parts.push(`- ${item.qty || 1} × ${item.p || 'Item'}`);
        if (item.metal) parts.push(`Metal: ${item.metal}`);
        if (item.stone) parts.push(`Stone: ${item.stone}`);
        if (item.size) parts.push(`Size: ${item.size}`);
        return parts.join(' · ');
      }),
      `\nYou can reply here, or I can also complete the order via Instagram or Facebook if you prefer.`,
      `\nCould you please confirm availability and provide next steps?`,
    ];
    const plain = `Hello EDELHART,\n\n${lines.join('\n')}\n\nThank you.`;
    return { plain, encoded: encodeURIComponent(plain) };
  }

  /* ------------------------------------------------------------------ */
  /*  Swipe indicator helper                                            */
  /* ------------------------------------------------------------------ */
  function updateTransformIndicator(track, indicator, totalSlides, idx) {
    if (!indicator) return;
    const thumb = indicator.querySelector('.thumb');
    if (!thumb) return;
    const pct = totalSlides > 1 ? (idx / totalSlides) * 100 : 100;
    thumb.style.left = pct + '%';
    thumb.style.width = 100 / totalSlides + '%';
  }

  function attachSwipeIndicator(scrollContainer, indicator) {
    if (!scrollContainer || !indicator) return;
    const thumb = indicator.querySelector('.thumb');
    if (!thumb) return;

    function update() {
      const scrollWidth =
          scrollContainer.scrollWidth - scrollContainer.clientWidth;
      if (scrollWidth <= 0) {
        thumb.style.width = '100%';
        thumb.style.left = '0%';
        return;
      }
      const scrolled = scrollContainer.scrollLeft;
      const pct = (scrolled / scrollWidth) * 100;
      const visiblePct =
          (scrollContainer.clientWidth / scrollContainer.scrollWidth) * 100;
      thumb.style.left = pct + '%';
      thumb.style.width = Math.max(visiblePct, 10) + '%';
    }

    update();
    scrollContainer.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }

  /* ------------------------------------------------------------------ */
  /*  Catalog cards & collection cards (index + recommended)            */
  /* ------------------------------------------------------------------ */

  /**
   * Build inner image sliders for:
   * - Catalog cards
   * - Collection cards (inner gallery only)
   * - Recommended cards (once filled)
   *
   * Inner controls (dots/arrows) only show when `media` has .show-controls:
   *  - set on hover, tap, or swipe start
   *  - never triggered by outer strip arrows
   */
  function initCatalogCards() {
    const cards = document.querySelectorAll(
        '.catalog .card, .collection-card, .slider-strip[data-slider="recommended"] .card, #dynamic-related .related-card'
    );
    if (!cards.length) {
      SlideClock.start();
      return;
    }

    const prefersReduced =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io =
        'IntersectionObserver' in window
            ? new IntersectionObserver(
                entries => {
                  entries.forEach(entry => {
                    const media = entry.target;
                    const api = media.__api;
                    if (!api) return;
                    api.inView =
                        entry.isIntersecting && entry.intersectionRatio >= 0.5;
                    api.updateSubscription();
                  });
                },
                { threshold: [0, 0.25, 0.5, 0.75, 1] }
            )
            : null;

    const imagesMap = {};

    cards.forEach(card => {
      const isRelated = card.classList.contains('related-card');
      const media = card.querySelector(
          isRelated ? '.related-media' : '.media, .collection-media'
      );
      const viewUrl = card.getAttribute('data-view') || card.getAttribute('href') || '#';
      const title =
          card.querySelector('.title')?.textContent ||
          card.querySelector('.collection-name')?.textContent ||
          'product';
      const slug = slugFromPath(viewUrl);

      // only catalog/recommended/collections have data-images; related currently single image
      const listRawAttr = isRelated
          ? null
          : media && media.getAttribute('data-images');
      const listRaw = listRawAttr ? listFromCSV(listRawAttr) : [];
      const listAbs = toAbsList(listRaw, location.href);

      if (!isRelated && slug && listAbs.length) {
        imagesMap[slug] = { images: listAbs };
      }

      // clickable product cards (excluding related-card which is <a>)
      if (
          !card.classList.contains('collection-card') &&
          !isRelated &&
          viewUrl &&
          !card.matches('a')
      ) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', e => {
          const t = e.target;
          if (
              t.closest('.slider-btn') ||
              t.closest('.dot') ||
              t.closest('.btn') ||
              t.closest('a')
          )
            return;
          if (slug && listAbs.length) writeHandoff(slug, listAbs);
          if (viewUrl && viewUrl !== '#') window.location.href = viewUrl;
        });
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (slug && listAbs.length) writeHandoff(slug, listAbs);
            if (viewUrl && viewUrl !== '#') window.location.href = viewUrl;
          }
        });
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', `Open ${title}`);
      }

      if (!media) return;

      // RELATED cards (You may also like) currently only show a single image and
      // do not have inner gallery requirements in HTML; we leave them as-is.
      if (isRelated) {
        return;
      }

      if (!listAbs.length) return;

      if (!card.classList.contains('collection-card')) {
        card.querySelectorAll('a[href]').forEach(a => {
          a.addEventListener(
              'click',
              () => {
                if (slug && listAbs.length) writeHandoff(slug, listAbs);
              },
              { capture: true }
          );
        });
      }

      const slidesWrap = document.createElement('div');
      slidesWrap.className = 'slides';
      listAbs.forEach(src => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const img = document.createElement('img');
        img.src = src;
        img.alt = title;
        img.loading = 'lazy';
        slide.appendChild(img);
        slidesWrap.appendChild(slide);
      });
      media.innerHTML = '';
      media.appendChild(slidesWrap);

      const dots = document.createElement('div');
      dots.className = 'dots';
      listAbs.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        d.dataset.index = String(i);
        dots.appendChild(d);
      });
      media.appendChild(dots);

      const prev = document.createElement('button');
      prev.className = 'slider-btn slider-prev';
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Previous image');
      prev.innerHTML = '&#10094;';
      const next = document.createElement('button');
      next.className = 'slider-btn slider-next';
      next.type = 'button';
      next.setAttribute('aria-label', 'Next image');
      next.innerHTML = '&#10095;';
      media.appendChild(prev);
      media.appendChild(next);

      let idx = 0;
      const total = listAbs.length;
      function render() {
        slidesWrap.style.transform = `translateX(${idx * -100}%)`;
        Array.from(dots.children).forEach((el, i) =>
            el.classList.toggle('active', i === idx)
        );
      }
      function go(n) {
        idx = (n + total) % total;
        render();
      }

      const stopNav = e => {
        e.preventDefault();
        e.stopPropagation();
      };

      // inner slider: show controls only when interacting
      function showInnerControls() {
        media.classList.add('show-controls');
      }

      prev.addEventListener('click', e => {
        stopNav(e);
        showInnerControls();
        go(idx - 1);
        pauseOuterForCard(card);
      });
      next.addEventListener('click', e => {
        stopNav(e);
        showInnerControls();
        go(idx + 1);
        pauseOuterForCard(card);
      });
      dots.addEventListener('click', e => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.classList.contains('dot')) {
          stopNav(e);
          showInnerControls();
          go(Number(t.dataset.index || 0));
          pauseOuterForCard(card);
        }
      });

      const api = {
        paused: false,
        inView: true,
        subscribed: false,
        pauseTimeout: null,
        subscribe() {
          if (!this.subscribed) {
            SlideClock.subscribe(tick);
            this.subscribed = true;
          }
        },
        unsubscribe() {
          if (this.subscribed) {
            SlideClock.unsubscribe(tick);
            this.subscribed = false;
          }
        },
        updateSubscription() {
          if (prefersReduced || total <= 1) {
            this.unsubscribe();
            return;
          }
          if (!this.paused && this.inView) this.subscribe();
          else this.unsubscribe();
        },
      };
      const tick = () => {
        if (total > 1) go(idx + 1);
      };
      media.__api = api;

      // swipe inner gallery
      let startX = 0,
          dist = 0,
          dragging = false;
      function onStart(e) {
        dragging = true;
        startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = 0;
        clearTimeout(api.pauseTimeout);
        api.paused = true;
        api.updateSubscription();
        showInnerControls();
        pauseOuterForCard(card);
      }
      function onMove(e) {
        if (!dragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = x - startX;
      }
      function onEnd(e) {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(dist) > 40) {
          if (dist < 0) go(idx + 1);
          else go(idx - 1);
        }
        if (e) e.stopPropagation();
        api.paused = true;
        api.pauseTimeout = setTimeout(() => {
          api.paused = false;
          api.updateSubscription();
        }, 10000);
      }

      if (!card.classList.contains('collection-card')) {
        card.addEventListener('mousedown', onStart);
        addEventListener('mousemove', onMove);
        addEventListener('mouseup', onEnd);
        card.addEventListener('touchstart', onStart, { passive: true });
        addEventListener('touchmove', onMove, { passive: true });
        addEventListener('touchend', onEnd);
      }

      // hide inner controls by default
      media.classList.remove('show-controls');

      card.addEventListener('mouseenter', () => {
        api.paused = true;
        api.updateSubscription();
      });
      card.addEventListener('mouseleave', () => {
        api.paused = false;
        api.updateSubscription();
      });

      if (io) io.observe(media);
      render();
    });

    if (Object.keys(imagesMap).length) {
      const current = readImageCache();
      const merged = { ...(current?.items || {}), ...imagesMap };
      writeImageCache(merged);
    }
    SlideClock.start();
  }

  /* Helper: pause outer slider for a card */
  function pauseOuterForCard(card) {
    const strip = card.closest('.related-strip, .slider-strip[data-slider="recommended"], .collection-strip');
    if (!strip) return;
    const api = strip.__stripApi;
    if (!api) return;
    api.pause();
  }

  /* ------------------------------------------------------------------ */
  /*  Populate Recommended from #all-catalog                           */
  /* ------------------------------------------------------------------ */
  function initRecommended() {
    const grid = document.getElementById('all-catalog');
    const track = document.querySelector('.slider-strip[data-slider="recommended"] .slider-track');
    if (!grid || !track) return;

    const cards = Array.from(grid.querySelectorAll('.card'));
    track.innerHTML = '';

    cards.forEach(card => {
      const viewUrl = card.getAttribute('data-view') || '#';
      const title = card.querySelector('.title')?.textContent || 'Product';
      const price = card.querySelector('.price')?.textContent || '$0';
      const imagesRaw = card.querySelector('.media')?.getAttribute('data-images') || '';

      const cardEl = document.createElement('article');
      cardEl.className = 'card';
      cardEl.setAttribute('data-view', viewUrl);
      cardEl.innerHTML = `
        <div class="media" data-images="${imagesRaw}">
          <div class="media-fallback">${title}</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="price">${price}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="${viewUrl}" aria-label="View ${title}">View</a>
        </div>
      `;
      track.appendChild(cardEl);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Auto-swiping strips (collections / related / recommended)         */
  /* ------------------------------------------------------------------ */

  /**
   * Shared outer strip behavior:
   * - related-strip (index / product pages)
   * - slider-strip[data-slider="recommended"]
   * - collection-strip
   *
   * One card per step, looping; pause/resume for interactions.
   */
  function initAutoStrips() {
    const containers = document.querySelectorAll(
        '.related-strip, .collection-strip, .slider-strip[data-slider="recommended"]'
    );

    containers.forEach(container => {
      const isCollectionStrip = container.classList.contains('collection-strip');
      container.style.position = container.style.position || 'relative';
      const track = container.querySelector(
          '.related-track, .collection-track, .slider-track'
      );
      if (!track) return;
      const slides = track.children;
      if (!slides.length) return;
      let idx = 0;

      // Arrows
      let prev = isCollectionStrip
          ? container.querySelector('.col-prev')
          : container.querySelector('.slider-arrow-prev');
      let next = isCollectionStrip
          ? container.querySelector('.col-next')
          : container.querySelector('.slider-arrow-next');

      if (!prev || !next) {
        prev = document.createElement('button');
        prev.className = isCollectionStrip
            ? 'col-btn col-prev'
            : 'slider-arrow slider-arrow-prev';
        prev.setAttribute('aria-label', 'Previous');
        prev.textContent = '‹';

        next = document.createElement('button');
        next.className = isCollectionStrip
            ? 'col-btn col-next'
            : 'slider-arrow slider-arrow-next';
        next.setAttribute('aria-label', 'Next');
        next.textContent = '›';

        container.appendChild(prev);
        container.appendChild(next);
      }

      // Indicator
      let indicator = container.querySelector('.swipe-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'swipe-indicator';
        indicator.innerHTML = '<div class="thumb"></div>';
        container.appendChild(indicator);
      }

      function cardWidth() {
        const first = slides[0];
        if (!first) return track.getBoundingClientRect().width || 0;
        const style = getComputedStyle(track);
        const gap =
            parseFloat(style.columnGap || style.gap || '12') || 12;
        return (
            (first.getBoundingClientRect().width ||
                track.getBoundingClientRect().width) + gap
        );
      }

      function hasOverflow() {
        return slides.length > 1;
      }

      function go(n) {
        if (!hasOverflow()) return;
        idx = (n + slides.length) % slides.length;
        const w = cardWidth();
        track.style.transform = `translateX(${idx * -w}px)`;
        updateTransformIndicator(track, indicator, slides.length, idx);
        container.classList.add('show-controls');
      }

      prev.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        stripApi.pause();
        go(idx - 1);
      });
      next.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        stripApi.pause();
        go(idx + 1);
      });

      let inView = true;
      const io =
          'IntersectionObserver' in window
              ? new IntersectionObserver(
                  entries => {
                    entries.forEach(
                        entry =>
                            (inView =
                                entry.isIntersecting &&
                                entry.intersectionRatio >= 0.4)
                    );
                    stripApi.updateSubscription();
                  },
                  { threshold: [0, 0.4, 1] }
              )
              : null;
      if (io) io.observe(container);

      let pausedByUser = false;
      let idleTimer = null;
      const idleMs = 10000;

      function setIdleResume() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          pausedByUser = false;
          stripApi.updateSubscription();
        }, idleMs);
      }

      const tick = () => {
        if (!hasOverflow() || !inView || pausedByUser) return;
        go(idx + 1);
      };

      const stripApi = {
        pause() {
          pausedByUser = true;
          SlideClock.unsubscribe(tick);
          setIdleResume();
        },
        updateSubscription() {
          SlideClock.unsubscribe(tick);
          if (hasOverflow() && inView && !pausedByUser) {
            SlideClock.subscribe(tick);
          }
        },
      };
      container.__stripApi = stripApi;

      // Swipe / drag support
      let startX = 0;
      let dist = 0;
      let dragging = false;

      function onStart(e) {
        dragging = true;
        startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = 0;
        container.classList.add('show-controls');
        stripApi.pause();
      }

      function onMove(e) {
        if (!dragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = x - startX;
      }

      function onEnd() {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(dist) > 40) {
          if (dist < 0) go(idx + 1);
          else go(idx - 1);
        }
        setIdleResume();
      }

      track.addEventListener('mousedown', onStart);
      addEventListener('mousemove', onMove);
      addEventListener('mouseup', onEnd);
      track.addEventListener('touchstart', onStart, { passive: true });
      addEventListener('touchmove', onMove, { passive: true });
      addEventListener('touchend', onEnd);

      addEventListener('resize', () => {
        track.style.transform = 'translateX(0px)';
        idx = 0;
        requestAnimationFrame(() => {
          updateTransformIndicator(track, indicator, slides.length, idx);
          stripApi.updateSubscription();
        });
      });

      requestAnimationFrame(() => {
        updateTransformIndicator(track, indicator, slides.length, idx);
        stripApi.updateSubscription();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Product gallery (on product pages)                                */
  /* ------------------------------------------------------------------ */
  async function initProductGallery() {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;

    const slidesWrap = gallery.querySelector('.slides');
    const dots = gallery.querySelector('.thumbs');
    const prev = gallery.querySelector('.slider-prev');
    const next = gallery.querySelector('.slider-next');

    const thisSlug = slugFromPath(location.pathname);

    async function ensureImagesMapInner() {
      const cached = readImageCache()?.items || null;
      if (cached && Object.keys(cached).length) return cached;
      if (location.protocol === 'file:') return {};
      const candidates = [
        new URL('../index.html', location.href).href,
        new URL('../../index.html', location.href).href,
        new URL('./index.html', location.href).href,
        new URL('/index.html', location.origin).href,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            mode: 'same-origin',
          });
          if (res.ok) {
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const cards = doc.querySelectorAll('.catalog .card');
            const map = {};
            cards.forEach(card => {
              const vu = card.getAttribute('data-view') || '';
              const slug = slugFromPath(vu);
              const imagesRaw = listFromCSV(
                  card.querySelector('.media')?.getAttribute('data-images')
              );
              const imagesAbs = toAbsList(imagesRaw, url);
              if (slug && imagesAbs.length) map[slug] = { images: imagesAbs };
            });
            if (Object.keys(map).length) {
              writeImageCache(map);
              return map;
            }
          }
        } catch {}
      }
      return {};
    }

    function buildFromImages(listAbs) {
      slidesWrap.innerHTML = '';
      listAbs.forEach((src, i) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Product image ${i + 1}`;
        img.decoding = 'async';
        img.loading = 'lazy';
        slide.appendChild(img);
        slidesWrap.appendChild(slide);
      });

      if (dots) {
        dots.innerHTML = '';
        listAbs.forEach((_, i) => {
          const d = document.createElement('div');
          d.className = 'thumb' + (i === 0 ? ' active' : '');
          d.dataset.index = String(i);
          dots.appendChild(d);
        });
        dots.addEventListener(
            'click',
            e => {
              const t = e.target;
              if (!(t instanceof HTMLElement)) return;
              if (t.classList.contains('thumb')) go(Number(t.dataset.index || 0));
            },
            { passive: true }
        );
      }

      let thumbStrip = document.querySelector('.thumb-strip');
      let thumbRow;

      if (!thumbStrip) {
        thumbStrip = document.createElement('div');
        thumbStrip.className = 'thumb-strip';
        thumbRow = document.createElement('div');
        thumbRow.className = 'thumb-row';
        thumbStrip.appendChild(thumbRow);
        gallery.insertAdjacentElement('afterend', thumbStrip);
      } else {
        thumbRow = thumbStrip.querySelector('.thumb-row');
        if (!thumbRow) {
          thumbRow = document.createElement('div');
          thumbRow.className = 'thumb-row';
          thumbStrip.appendChild(thumbRow);
        }
      }

      thumbRow.innerHTML = '';
      listAbs.forEach((src, i) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'thumb-item' + (i === 0 ? ' active' : '');
        t.dataset.index = String(i);
        const im = document.createElement('img');
        im.src = src;
        im.alt = `Preview ${i + 1}`;
        t.appendChild(im);
        t.addEventListener('click', () => go(i));
        thumbRow.appendChild(t);
      });

      slidesWrap.querySelectorAll('img').forEach((img, i) => {
        img.addEventListener('click', () => openLightbox(listAbs, i));
      });

      idx = 0;
      total = listAbs.length;
      render();
      updateClockSub();
    }

    function openLightbox(list, startIndex) {
      let lb = document.querySelector('.lightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = `
          <button class="lightbox-close" aria-label="Close">✕</button>
          <button class="lightbox-btn lightbox-prev" aria-label="Previous">‹</button>
          <img class="lightbox-img" alt="">
          <button class="lightbox-btn lightbox-next" aria-label="Next">›</button>
        `;
        document.body.appendChild(lb);
      }
      const imgEl = lb.querySelector('.lightbox-img');
      const btnPrev = lb.querySelector('.lightbox-prev');
      const btnNext = lb.querySelector('.lightbox-next');
      const btnClose = lb.querySelector('.lightbox-close');
      let i = startIndex || 0;
      function show() {
        imgEl.src = list[i];
        imgEl.alt = `Image ${i + 1} of ${list.length}`;
      }
      function prevImg() {
        i = (i - 1 + list.length) % list.length;
        show();
      }
      function nextImg() {
        i = (i + 1) % list.length;
        show();
      }
      function close() {
        lb.classList.remove('open');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      }
      function onKey(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') prevImg();
        else if (e.key === 'ArrowRight') nextImg();
      }
      btnPrev.onclick = prevImg;
      btnNext.onclick = nextImg;
      btnClose.onclick = close;
      lb.onclick = e => {
        if (e.target === lb) close();
      };
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      lb.classList.add('open');
      show();
    }

    let idx = 0,
        total = 0;
    function setActive() {
      if (dots)
        Array.from(dots.children).forEach((el, i) =>
            el.classList.toggle('active', i === idx)
        );
      const strip = document.querySelector('.thumb-strip');
      const row = strip?.querySelector('.thumb-row');
      if (row) {
        Array.from(row.children).forEach((el, i) =>
            el.classList.toggle('active', i === idx)
        );
      }
    }
    function render() {
      slidesWrap.style.transform = `translateX(${idx * -100}%)`;
      setActive();
    }
    function go(n) {
      idx = (n + total) % total;
      render();
    }

    prev &&
    prev.addEventListener('click', () => {
      go(idx - 1);
      gallery.classList.add('show-controls');
    });
    next &&
    next.addEventListener('click', () => {
      go(idx + 1);
      gallery.classList.add('show-controls');
    });

    let startX = 0,
        dist = 0,
        dragging = false,
        paused = false,
        inView = true;
    function onStart(e) {
      dragging = true;
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = 0;
      paused = true;
      updateClockSub();
      gallery.classList.add('show-controls');
    }
    function onMove(e) {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = x - startX;
    }
    function onEnd(e) {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 40) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
      paused = false;
      updateClockSub();
    }
    slidesWrap.addEventListener('mousedown', onStart);
    addEventListener('mousemove', onMove);
    addEventListener('mouseup', onEnd);
    slidesWrap.addEventListener('touchstart', onStart, { passive: true });
    addEventListener('touchmove', onMove, { passive: true });
    addEventListener('touchend', onEnd);
    gallery.addEventListener('mouseenter', () => {
      paused = true;
      updateClockSub();
    });
    gallery.addEventListener('mouseleave', () => {
      paused = false;
      updateClockSub();
    });

    const io =
        'IntersectionObserver' in window
            ? new IntersectionObserver(
                entries => {
                  entries.forEach(
                      entry =>
                          (inView =
                              entry.isIntersecting &&
                              entry.intersectionRatio >= 0.5)
                  );
                  updateClockSub();
                },
                { threshold: [0, 0.5, 1] }
            )
            : null;
    if (io) io.observe(gallery);

    const tick = () => {
      if (total > 1 && !paused && inView) go(idx + 1);
    };
    function updateClockSub() {
      SlideClock.unsubscribe(tick);
      if (!paused && inView && total > 1) SlideClock.subscribe(tick);
    }

    const hand = readHandoff();
    let imagesMap = await ensureImagesMap();
    let initial = null;

    function baseFromSlug(slug) {
      return slug
          .replace(
              /-(gold-18k|gold-14k|black-rhodium|e-silver|gold|silver)$/,
              ''
          )
          .replace(/-?$/, '');
    }

    if (
        hand &&
        (hand.slug === thisSlug ||
            baseFromSlug(hand.slug) === baseFromSlug(thisSlug))
    ) {
      initial = Array.isArray(hand.images) ? hand.images : [];
      const merged = { ...(imagesMap || {}) };
      if (initial.length) {
        merged[hand.slug] = { images: initial };
        merged[thisSlug] = merged[thisSlug] || { images: initial };
        writeImageCache(merged);
        imagesMap = merged;
      }
      clearHandoff();
    } else {
      const cached = imagesMap?.[thisSlug]?.images || [];
      if (cached.length) initial = cached;
    }
    if (!initial || !initial.length) {
      const inlineRaw = listFromCSV(gallery.getAttribute('data-images'));
      initial = toAbsList(inlineRaw, location.href);
    }
    if (initial && initial.length) buildFromImages(initial);
  }

  async function ensureImagesMap() {
    const cached = readImageCache()?.items || null;
    if (cached && Object.keys(cached).length) return cached;
    return {};
  }

  /* ------------------------------------------------------------------ */
  /*  Dynamic related strip ("You may also like")                       */
  /* ------------------------------------------------------------------ */
  async function initDynamicRelated() {
    const relatedStrip = document.getElementById('dynamic-related');
    if (!relatedStrip) return;

    const track = relatedStrip.querySelector('.related-track');
    if (!track) return;

    const currentSlug = slugFromPath(location.pathname);

    async function fetchAllProducts() {
      const candidates = [
        new URL('../index.html', location.href).href,
        new URL('../../index.html', location.href).href,
        new URL('./index.html', location.href).href,
        new URL('/index.html', location.origin).href,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            mode: 'same-origin',
          });
          if (res.ok) {
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const cards = Array.from(
                doc.querySelectorAll('#all-catalog .card')
            ).map(card => ({
              view: card.getAttribute('data-view') || '#',
              title: card.querySelector('.title')?.textContent || 'Product',
              price: card.querySelector('.price')?.textContent || '$0',
              images: listFromCSV(
                  card.querySelector('.media')?.getAttribute('data-images') || ''
              ),
            }));
            const filtered = cards.filter(
                p => p.view !== '#' && slugFromPath(p.view) !== currentSlug
            );
            if (filtered.length) return filtered;
          }
        } catch {}
      }
      return [];
    }

    let allProducts = await fetchAllProducts();
    let selected = [];
    if (allProducts.length >= 4) {
      selected = allProducts.sort(() => 0.5 - Math.random()).slice(0, 4);
    } else {
      selected = [
        {
          view: 'products/sss-pendant-gold.html',
          title: 'SSS pendant — gold',
          price: '$125',
          images: ['img/products/sss-gold-1.jpg'],
        },
        {
          view: 'products/ee-male-ring-silver.html',
          title: 'EE male ring — silver',
          price: '$200',
          images: ['img/products/EE-male-ring-silver-1.jpg'],
        },
        {
          view: 'products/foto-earring.html',
          title: 'FOTO earring',
          price: '$310',
          images: ['img/products/foto-earring-1.jpg'],
        },
        {
          view: 'products/legs-pendant.html',
          title: 'LEGS pendant',
          price: '$375',
          images: ['img/products/LEGS-pendant-1.jpg'],
        },
      ]
          .filter(p => slugFromPath(p.view) !== currentSlug)
          .slice(0, 4);
    }

    track.innerHTML = '';
    selected.forEach(product => {
      const card = document.createElement('a');
      card.className = 'related-card';
      card.href = product.view.replace('products/', '');
      card.innerHTML = `
        <div class="related-media">
          <img src="../${product.images[0] || 'img/placeholder.jpg'}" alt="${
          product.title
      }" loading="lazy">
        </div>
        <div class="related-info">
          <div class="title">${product.title}</div>
          <div class="price">${product.price}</div>
        </div>
      `;
      track.appendChild(card);
    });

    let prev = relatedStrip.querySelector('.slider-arrow-prev');
    let next = relatedStrip.querySelector('.slider-arrow-next');
    if (!prev || !next) {
      prev = document.createElement('button');
      prev.className = 'slider-arrow slider-arrow-prev';
      prev.setAttribute('aria-label', 'Previous');
      prev.textContent = '‹';
      next = document.createElement('button');
      next.className = 'slider-arrow slider-arrow-next';
      next.setAttribute('aria-label', 'Next');
      next.textContent = '›';
      relatedStrip.appendChild(prev);
      relatedStrip.appendChild(next);
    }

    let idx = 0;
    const slides = track.children;
    function cardWidth() {
      const first = slides[0];
      if (!first) return track.getBoundingClientRect().width || 0;
      const gap =
          parseFloat(
              getComputedStyle(track).columnGap ||
              getComputedStyle(track).gap ||
              '12'
          ) || 12;
      return (
          (first.getBoundingClientRect().width ||
              track.getBoundingClientRect().width) + gap
      );
    }
    function hasOverflow() {
      return slides.length > 1;
    }
    function go(n) {
      if (!hasOverflow()) return;
      idx = (n + slides.length) % slides.length;
      const w = cardWidth();
      track.style.transform = `translateX(${idx * -w}px)`;
      updateTransformIndicator(
          track,
          relatedStrip.querySelector('.swipe-indicator'),
          slides.length,
          idx
      );
      relatedStrip.classList.add('show-controls');
    }

    prev.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const api = relatedStrip.__stripApi;
      if (api) api.pause();
      go(idx - 1);
    });
    next.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const api = relatedStrip.__stripApi;
      if (api) api.pause();
      go(idx + 1);
    });

    // swipe / drag logic for mobiles / iPads
    let startX = 0;
    let dist = 0;
    let dragging = false;

    function onStart(e) {
      dragging = true;
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = 0;
      relatedStrip.classList.add('show-controls');
      const api = relatedStrip.__stripApi;
      if (api) api.pause();
    }

    function onMove(e) {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = x - startX;
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 40) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
    }

    track.addEventListener('mousedown', onStart);
    addEventListener('mousemove', onMove);
    addEventListener('mouseup', onEnd);
    track.addEventListener('touchstart', onStart, { passive: true });
    addEventListener('touchmove', onMove, { passive: true });
    addEventListener('touchend', onEnd);

    // outer auto-slide for this strip is handled by initAutoStrips via __stripApi
  }

  /* ------------------------------------------------------------------ */
  /*  Featured slideshow (On‑Body in index)                             */
  /* ------------------------------------------------------------------ */
  function initFeaturedSlideshow() {
    const strip = document.querySelector('.featured-strip.collage-main');
    if (!strip) return;

    const track = strip.querySelector('.featured-track');
    const slides = track?.querySelectorAll('.feat-slide');
    const prevBtn = strip.querySelector('.slider-prev');
    const nextBtn = strip.querySelector('.slider-next');
    const dotsContainer = strip.querySelector('.dots');
    const indicator = strip.querySelector('.swipe-indicator');

    if (!track || !slides.length) return;

    let idx = 0;
    const total = slides.length;

    function render() {
      track.style.transform = `translateX(${idx * -100}%)`;
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === idx);
        });
      }
      if (indicator) {
        updateTransformIndicator(track, indicator, total, idx);
      }
    }

    function go(n) {
      idx = (n + total) % total;
      render();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        go(idx - 1);
        strip.classList.add('show-controls');
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        go(idx + 1);
        strip.classList.add('show-controls');
      });
    }

    if (dotsContainer) {
      dotsContainer.addEventListener('click', e => {
        const dot = e.target;
        if (dot.classList.contains('dot')) {
          const i = parseInt(dot.dataset.index || '0', 10);
          go(i);
        }
      });
    }

    let startX = 0,
        dist = 0,
        dragging = false;

    function onStart(e) {
      dragging = true;
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = 0;
      strip.classList.add('show-controls');
    }
    function onMove(e) {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = x - startX;
    }
    function onEnd(e) {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 50) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
      setTimeout(() => strip.classList.remove('show-controls'), 2000);
    }

    track.addEventListener('mousedown', onStart);
    addEventListener('mousemove', onMove);
    addEventListener('mouseup', onEnd);
    track.addEventListener('touchstart', onStart, { passive: true });
    addEventListener('touchmove', onMove, { passive: true });
    addEventListener('touchend', onEnd);

    let inView = true;
    const io =
        'IntersectionObserver' in window
            ? new IntersectionObserver(
                entries => {
                  entries.forEach(
                      entry =>
                          (inView =
                              entry.isIntersecting &&
                              entry.intersectionRatio >= 0.4)
                  );
                },
                { threshold: [0, 0.4, 1] }
            )
            : null;

    if (io) io.observe(strip);

    const tick = () => {
      if (inView) go(idx + 1);
    };

    SlideClock.subscribe(tick);
    render();
  }

  /* ------------------------------------------------------------------ */
  /*  Collection strip (equalizer only)                                 */
  /* ------------------------------------------------------------------ */
  function initCollectionStrip() {
    const strip = document.querySelector('.collection-strip');
    if (!strip) return;
    const track = strip.querySelector('.collection-track');
    if (!track) return;

    function widontCollectionNames() {
      document.querySelectorAll('.collection-name').forEach(el => {
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;
        el.innerHTML = txt.replace(/\s+([^\s]+)$/, '&nbsp;$1');
      });
    }
    widontCollectionNames();

    // "View" button for each collection card, without changing layout
    const cards = track.querySelectorAll('.collection-card');
    cards.forEach(card => {
      if (card.querySelector('.actions .btn')) return;
      const viewUrl = card.getAttribute('data-view') || card.getAttribute('href') || '#';
      const title =
          card.querySelector('.collection-name')?.textContent ||
          card.querySelector('.title')?.textContent ||
          'Collection';
      let actions = card.querySelector('.actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'actions';
        card.appendChild(actions);
      }
      const btn = document.createElement('a');
      btn.className = 'btn primary';
      btn.href = viewUrl;
      btn.textContent = 'View';
      btn.setAttribute('aria-label', `View ${title}`);
      actions.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Checkout (product pages) – adds to cart with priceNum             */
  /* ------------------------------------------------------------------ */
  function initCheckout() {
    const form = document.querySelector('.checkout form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = buildOrderMessageFromForm(form);
      window.open(
          `https://wa.me/84944445084?text=${msg.encoded}`,
          '_blank',
          'noopener'
      );
    });

    const ig = form.querySelector('a[aria-label*="Instagram"]');
    const fb = form.querySelector('a[aria-label*="Facebook"]');
    [ig, fb].forEach(a => {
      if (!a) return;
      a.addEventListener('click', () => {
        const msg = buildOrderMessageFromForm(form);
        try {
          navigator.clipboard?.writeText(msg.plain);
        } catch {}
      });
    });

    const addBtn = form.querySelector('.add-to-cart');
    const priceText =
        document.querySelector('.checkout .price')?.textContent || '';
    const priceNum = parsePrice(priceText);

    function addToCart() {
      const data = new FormData(form);
      const newItem = {
        p:
            form.getAttribute('data-product') ||
            document.title.replace(/ · .*$/, ''),
        metal: data.get('metal') || '',
        stone: data.get('stone') || '',
        size: data.get('size') || '',
        qty: Number(data.get('qty') || 1) || 1,
        priceNum,
        at: Date.now(),
        url: location.href,
      };
      const cart = readCart();
      const existingIndex = cart.findIndex(
          item =>
              item.p === newItem.p &&
              item.metal === newItem.metal &&
              item.stone === newItem.stone &&
              item.size === newItem.size
      );
      if (existingIndex >= 0) {
        cart[existingIndex].qty += newItem.qty;
      } else {
        cart.push(newItem);
      }
      writeCart(cart);

      const div = document.createElement('div');
      div.textContent = 'Added to cart';
      Object.assign(div.style, {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '24px',
        background: '#141516',
        color: '#f6f7f9',
        padding: '10px 14px',
        borderRadius: '999px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        zIndex: 3000,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
      });
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 1600);

      if (typeof updateCartCount === 'function') {
        updateCartCount();
      }
    }
    if (addBtn) addBtn.addEventListener('click', addToCart);
  }

  /* ------------------------------------------------------------------ */
  /*  Cart drawer (index and product pages)                             */
  /* ------------------------------------------------------------------ */
  let updateCartCount; // so checkout can call it

  function initCartDrawer() {
    const drawer = document.querySelector('.cart-drawer');
    if (!drawer) return;

    const overlay = drawer.querySelector('.cart-overlay');
    const closeBtn = drawer.querySelector('.cart-close');
    const itemsEl = drawer.querySelector('.cart-items');
    const emptyEl = drawer.querySelector('.cart-empty');
    const totalEl = drawer.querySelector('.cart-total');
    const footer = drawer.querySelector('.cart-footer');
    const countEls = document.querySelectorAll('.cart-count');
    const toggleBtns = document.querySelectorAll('.cart-toggle');

    const checkoutBtn = footer.querySelector('.cart-checkout');
    let igBtn = footer.querySelector('.cart-copy[data-platform="Instagram"]');
    let fbBtn = footer.querySelector('.cart-copy[data-platform="Facebook"]');

    if (!igBtn) {
      igBtn = document.createElement('button');
      igBtn.type = 'button';
      igBtn.className = 'btn outline cart-copy';
      igBtn.dataset.platform = 'Instagram';
      igBtn.textContent = 'Copy for Instagram';
      footer.appendChild(igBtn);
    }
    if (!fbBtn) {
      fbBtn = document.createElement('button');
      fbBtn.type = 'button';
      fbBtn.className = 'btn outline cart-copy';
      fbBtn.dataset.platform = 'Facebook';
      fbBtn.textContent = 'Copy for Facebook';
      footer.appendChild(fbBtn);
    }

    function formatPrice(n) {
      return '$' + n.toFixed(2).replace(/\.00$/, '');
    }

    updateCartCount = function () {
      const cart = readCart();
      const totalQty = cart.reduce(
          (sum, item) => sum + (item.qty || 1),
          0
      );
      countEls.forEach(el => (el.textContent = String(totalQty)));
    };

    function render() {
      const cart = readCart();
      itemsEl.innerHTML = '';

      if (!cart.length) {
        emptyEl.style.display = '';
        itemsEl.style.display = 'none';
        totalEl.textContent = '$0';
        updateCartCount();

        const msg = buildOrderMessageFromCart(cart);
        if (checkoutBtn)
          checkoutBtn.href = `https://wa.me/84944445084?text=${msg.encoded}`;
        return;
      }

      emptyEl.style.display = 'none';
      itemsEl.style.display = '';

      let total = 0;
      cart.forEach((item, index) => {
        const price = Number(item.priceNum || 0);
        const qty = item.qty || 1;
        const lineTotal = price * qty;
        total += lineTotal;

        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <div>
            <div class="cart-item-title">${item.p || 'Item'}</div>
            <div class="cart-item-meta">
              ${item.metal ? `Metal: ${item.metal} · ` : ''}
              ${
            item.stone ? `Stone: ${item.stone} · ` : ''
        }${item.size ? `Size: ${item.size}` : ''}
            </div>
            <button type="button" class="cart-item-remove">Remove</button>
          </div>
          <div>
            <div class="cart-item-price">${
            price ? formatPrice(lineTotal) : '$0'
        }</div>
            <div class="cart-item-qty">
              <label>
                Qty:
                <input type="number" min="1" value="${qty}" />
              </label>
            </div>
          </div>
        `;
        li.querySelector('.cart-item-remove').addEventListener('click', () => {
          const c = readCart();
          c.splice(index, 1);
          writeCart(c);
          render();
        });

        const qtyInput = li.querySelector('.cart-item-qty input');
        qtyInput.addEventListener('change', () => {
          const c = readCart();
          let newQty = parseInt(qtyInput.value, 10);
          if (isNaN(newQty) || newQty < 1) newQty = 1;
          c[index].qty = newQty;
          writeCart(c);
          render();
        });

        itemsEl.appendChild(li);
      });

      totalEl.textContent = formatPrice(total);
      updateCartCount();

      const msg = buildOrderMessageFromCart(cart);
      if (checkoutBtn)
        checkoutBtn.href = `https://wa.me/84944445084?text=${msg.encoded}`;

      document.addEventListener('click', handleCartCopy);
    }

    function handleCartCopy(e) {
      if (e.target.classList.contains('cart-copy')) {
        const button = e.target;
        const platform = button.dataset.platform;
        const cart = readCart();
        const orderText = buildOrderMessageFromCart(cart).plain;

        navigator.clipboard.writeText(orderText).then(() => {
          const originalHTML = button.innerHTML;
          button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Copied!
          `;
          button.style.background = 'rgba(0, 255, 0, 0.1)';
          button.style.borderColor = 'rgba(0, 255, 0, 0.5)';

          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
            button.style.borderColor = '';
          }, 3000);
        }).catch(err => {
          console.error('Failed to copy: ', err);
          alert('Failed to copy. Please try again.');
        });
      }
    }

    function open() {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      render();
    }
    function close() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    toggleBtns.forEach(btn => btn.addEventListener('click', open));
    overlay && overlay.addEventListener('click', close);
    closeBtn && closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });

    updateCartCount();
  }

  /* ------------------------------------------------------------------ */
  /*  All products sort + filter toggle                                 */
  /* ------------------------------------------------------------------ */
  function sortGridByPrice(grid, dir) {
    const cards = Array.from(grid.querySelectorAll('.card')).filter(
        c => c.style.display !== 'none'
    );
    cards.sort((a, b) => {
      const pa = Number(a.getAttribute('data-price') || 0);
      const pb = Number(b.getAttribute('data-price') || 0);
      return dir === 'asc' ? pa - pb : pb - pa;
    });
    cards.forEach(c => grid.appendChild(c));
  }
  function initAllProductsSort() {
    const grid = document.getElementById('all-catalog');
    const sel = document.getElementById('all-sort');
    if (!grid || !sel) return;
    sel.addEventListener('change', () => sortGridByPrice(grid, sel.value));
    sortGridByPrice(grid, sel.value || 'asc');
  }

  function initFilterToggle() {
    const btn = document.querySelector('.filter-toggle');
    const panel = document.getElementById('sort-panel');
    if (!btn || !panel) return;
    const setOpen = open => {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        panel.hidden = false;
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
        panel.hidden = true;
      }
    };
    btn.addEventListener('click', () => {
      const open = panel.hidden;
      setOpen(open);
    });
    document.addEventListener('click', e => {
      if (!panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Copy order details for social platforms (product pages)           */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', e => {
    if (e.target.classList.contains('copy-order')) {
      const button = e.target;
      const platform = button.dataset.platform;
      const productTitle = document.querySelector('.checkout .title')?.textContent || 'Product';
      const metal = document.getElementById('metal')?.value || 'N/A';
      const stone = document.getElementById('stone')?.value || 'N/A';
      const size = document.getElementById('size')?.value || 'N/A';
      const qty = document.getElementById('qty')?.value || '1';

      const orderText = `Hello EDELHART, I'm interested in ${productTitle}. Metal: ${metal}, Stone: ${stone}, Size: ${size}, Quantity: ${qty}. Please provide details and next steps. Shared from ${platform}.`;

      navigator.clipboard.writeText(orderText).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Copied!
          `;
        button.style.background = 'rgba(0, 0, 0, 0.1)';
        button.style.borderColor = 'rgba(255, 255, 255, 0.5)';

        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.background = '';
          button.style.borderColor = '';
        }, 3000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy. Please try again.');
      });
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Init everything                                                   */
  /* ------------------------------------------------------------------ */
  function onReady() {
    initCatalogCards();     // builds inner sliders for catalog + collection + dynamic-related
    initRecommended();      // populate Recommended from #all-catalog
    initCatalogCards();     // re-init so Recommended cards get inner sliders
    initAutoStrips();       // Recommended + Collections + related strips
    initProductGallery();
    initDynamicRelated();   // "You may also like" (outer logic aligned)
    initFeaturedSlideshow();
    initCollectionStrip();  // collection names + view buttons
    initAllProductsSort();
    initFilterToggle();
    initCheckout();
    initCartDrawer();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();