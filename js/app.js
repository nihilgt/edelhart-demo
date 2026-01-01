(function () {
  // ---- Data saver detection ----
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const DATA_SAVER =
      (conn && (conn.saveData || /(^slow-2g|2g)$/i.test(conn.effectiveType || ''))) ||
      false;
  const AUTO_SLIDE_ALLOWED = !DATA_SAVER;

  // Detect base URL (works when site is served from a subfolder, e.g. /project/ or GitHub Pages)
  const SCRIPT_URL = (() => {
    try {
      return new URL(document.currentScript?.src || location.href);
    } catch {
      const scripts = document.getElementsByTagName('script');
      const last = scripts[scripts.length - 1];
      try { return new URL(last.src); } catch { return new URL(location.href); }
    }
  })();

  // Allow an explicit override (e.g., set window.__BASE_URL_OVERRIDE in HTML before this script)
  const BASE_URL = (() => {
    if (window.__BASE_URL_OVERRIDE) {
      try { return new URL(window.__BASE_URL_OVERRIDE, `${SCRIPT_URL.origin}/`).href; } catch { /* fallthrough */ }
    }
    const path = SCRIPT_URL.pathname;
    const m = path.match(/^(.*?\/)js\/app\.js/i);
    const basePath = m ? m[1] : '/';
    return new URL(basePath, `${SCRIPT_URL.origin}/`).href;
  })();

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  const scrollOptions = { passive: true };

  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  const heroImg = hero ? hero.querySelector('.hero-bg img') : null;

  const PRODUCT_PAGE_MAP = window.EDELHART_PRODUCT_PAGES || {};
  const PRODUCTS = Array.isArray(window.EDELHART_PRODUCTS_CENTRAL)
      ? window.EDELHART_PRODUCTS_CENTRAL
      : [];
  const COLLECTIONS = window.EDELHART_COLLECTIONS || {};

  const COLLECTION_PAGE_MAP = {
    SSS: './collections/sss.html',
    ECHO: './collections/ECHO.html',
    WA: './collections/whispering-a.html',
  };

  const getScrollTop = () =>
      window.pageYOffset || document.documentElement.scrollTop || 0;

  /* ---------- Path helpers ---------- */
  function slugFromPath(p) {
    if (!p) return '';
    const segs = p.split('/').filter(Boolean);
    const last = segs[segs.length - 1] || '';
    return last.replace(/\.html?$/i, '');
  }
  function normalizeSlug(str = '') {
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
  }
  function reverseLookupSlugByPage() {
    const path = location.pathname.replace(/^\//, '');
    const match = Object.entries(PRODUCT_PAGE_MAP).find(([slug, pagePath]) => {
      const normPage = (pagePath || '').replace(/^\.?\//, '').toLowerCase();
      return path.toLowerCase().endsWith(normPage);
    });
    return match ? match[0] : '';
  }
  function resolveProductSlug() {
    const mainSlug = document.querySelector('main.product-page')?.dataset.productSlug;
    const bodySlug = document.body?.dataset?.productSlug;
    const attrSlug = mainSlug || bodySlug || '';
    if (attrSlug) return attrSlug;
    const reverse = reverseLookupSlugByPage();
    if (reverse) return reverse;
    return slugFromPath(location.pathname);
  }

  function viewFromSlug(slug) {
    if (!slug) return '#';
    const target = PRODUCT_PAGE_MAP[slug] || `products/${slug}.html`;
    try {
      return new URL(target, BASE_URL).href;
    } catch {
      return target;
    }
  }

  function ensureNavCurrencySelector() {
    const navs = document.querySelectorAll('nav.menu');
    navs.forEach(nav => {
      let utilities = nav.querySelector('.nav-utilities');
      if (!utilities) {
        utilities = document.createElement('div');
        utilities.className = 'nav-utilities';
        nav.appendChild(utilities);
      }
      let select = utilities.querySelector('.currency-select, [data-role="currency-select"]');
      if (!select) {
        select = document.createElement('select');
        select.className = 'currency-select';
        select.setAttribute('data-role', 'currency-select');
        select.setAttribute('aria-label', 'Select currency');
        select.innerHTML = `
          <option value="VND">VND</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        `;
        utilities.appendChild(select);
      }
      let cartBtn = utilities.querySelector('.cart-toggle');
      if (!cartBtn) {
        cartBtn = document.createElement('button');
        cartBtn.type = 'button';
        cartBtn.className = 'cart-toggle';
        cartBtn.setAttribute('aria-label', 'Open cart');
        cartBtn.innerHTML = `Cart <span class="cart-count" aria-hidden="true">0</span>`;
        utilities.insertBefore(cartBtn, select);
      }
    });
  }

  function setHeaderVar() {
    if (!header) return;
    const h = header.offsetHeight;
    document.documentElement.style.setProperty('--headerH', h + 'px');
  }
  setHeaderVar();
  window.addEventListener('resize', debounce(setHeaderVar, 100), scrollOptions);

  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function onWindowScroll() {
    const y = getScrollTop();
    if (header) header.classList.toggle('is-visible', y > 10);
    if (backBtn) backBtn.classList.toggle('visible', y > 300);
  }
  window.addEventListener('scroll', onWindowScroll, scrollOptions);
  onWindowScroll();

  /* Nav spy & smooth scroll */
  (function () {
    const links = Array.from(
        document.querySelectorAll('.menu .links a[data-spy], .menu .links .drop-btn[data-spy]')
    );
    if (!links.length) return;

    const sections = links
        .map(link => {
          const sel = link.getAttribute('data-spy');
          const target = sel ? document.querySelector(sel) : null;
          return target ? { id: target.id, el: target } : null;
        })
        .filter(Boolean);

    const setActive = id => {
      links.forEach(link => {
        const targetId = link.getAttribute('data-spy').replace('#', '');
        link.classList.toggle('active', targetId === id);
      });
    };

    document.addEventListener('click', e => {
      const link = e.target.closest('.menu .links a[data-spy], .menu .links .drop-btn[data-spy]');
      if (!link) return;
      const sel = link.getAttribute('data-spy');
      const target = sel ? document.querySelector(sel) : null;
      if (!target) return;
      e.preventDefault();
      const headerOffset = (header ? header.offsetHeight : 64) + 20;
      const top = target.getBoundingClientRect().top + getScrollTop() - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });

    function updateActive() {
      if (!sections.length) return;
      const hOff = (header ? header.offsetHeight : 64) + 12;
      const scrollY = getScrollTop();
      const viewLine = scrollY + hOff;
      const docBottom = document.documentElement.scrollHeight - window.innerHeight - 4;

      if (scrollY >= docBottom) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      const contact = document.getElementById('contact');
      if (contact) {
        const top = contact.offsetTop - hOff;
        const bottom = top + contact.offsetHeight;
        if (viewLine >= top && viewLine < bottom) {
          setActive('contact');
          return;
        }
      }

      let current = sections[0].id;
      for (const sec of sections) {
        const top = sec.el.offsetTop - hOff;
        if (viewLine >= top) current = sec.id;
        else break;
      }
      setActive(current);
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, scrollOptions);
    window.addEventListener('resize', debounce(() => requestAnimationFrame(updateActive), 100));
    updateActive();
  })();

  /* Mobile nav */
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

    btn && btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    if (dropBtn) {
      dropBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        dropBtn.setAttribute('aria-expanded', dropdown.classList.contains('open') ? 'true' : 'false');
      });
      document.addEventListener('click', e => {
        if (dropdown && !dropdown.contains(e.target)) {
          dropdown.classList.remove('open');
          dropBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    links && links.addEventListener('click', e => {
      if (e.target.matches('a')) closeMenu();
    });

    document.addEventListener('click', e => {
      if (!nav || !btn) return;
      if (!nav.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });
  })();

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

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- HERO PARALLAX ---------------- */
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
      hero.style.setProperty('--offset', (-p * (tiny ? travel * 0.85 : travel)).toFixed(1) + 'px');
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
    if (heroImg.complete) { computeFitMode(); update(); }
    else heroImg.addEventListener('load', () => { computeFitMode(); update(); });

    window.addEventListener('scroll', onScroll, scrollOptions);
    window.addEventListener('resize', debounce(onResize, 100));
  }

  /* Slide clock (centralized timer) */
  const SlideClock = (() => {
    const interval = 7000;
    const listeners = new Set();
    let base = performance.now();
    let timer = 0;
    function scheduleNext() {
      if (!AUTO_SLIDE_ALLOWED || listeners.size === 0) return;
      const now = performance.now();
      const elapsed = now - base;
      const remainder = interval - (elapsed % interval);
      timer = window.setTimeout(tick, remainder);
    }
    function tick() {
      listeners.forEach(fn => { try { fn(); } catch { } });
      scheduleNext();
    }
    function start() {
      if (!AUTO_SLIDE_ALLOWED) return;
      if (!timer && listeners.size) { base = performance.now(); scheduleNext(); }
    }
    function stop() {
      if (timer) { clearTimeout(timer); timer = 0; }
    }
    function subscribe(fn) {
      if (!AUTO_SLIDE_ALLOWED) return;
      listeners.add(fn);
      start();
    }
    function unsubscribe(fn) {
      listeners.delete(fn);
      if (!listeners.size) stop();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    return { start, stop, subscribe, unsubscribe, interval };
  })();

  /* Helper: enable hover/focus autoplay */
  function enableHoverAutoplay(el, tickFn) {
    if (!el || !tickFn || !AUTO_SLIDE_ALLOWED) return;
    const play = () => SlideClock.subscribe(tickFn);
    const stop = () => SlideClock.unsubscribe(tickFn);
    el.addEventListener('mouseenter', play);
    el.addEventListener('focusin', play);
    el.addEventListener('mouseleave', stop);
    el.addEventListener('focusout', stop);
    stop(); // default paused
  }

  const CACHE_KEY = 'edelhart:images:v5';
  const HANDOFF_KEY = 'edelhart:handoff:v2';
  const CART_KEY = 'edelhart:cart:v3';

  function readImageCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || ''); } catch { return null; }
  }
  function writeImageCache(items) {
    const payload = { ts: Date.now(), items };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { }
    return payload;
  }
  function readHandoff() {
    try { return JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || ''); } catch { return null; }
  }
  function writeHandoff(slug, imagesAbs) {
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ slug, images: imagesAbs, ts: Date.now() })); } catch { }
  }
  function clearHandoff() {
    try { sessionStorage.removeItem(HANDOFF_KEY); } catch { }
  }
  function toAbsList(list) {
    const base = BASE_URL;
    return (list || []).map(src => {
      if (!src) return src;
      try {
        if (/^https?:\/\//i.test(src)) return src;
        return new URL(src, base).href;
      } catch {
        try { return new URL(src, base).href; } catch { return src; }
      }
    });
  }
  function listFromCSV(csv) {
    return (csv || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  function parsePrice(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  }
  function writeCart(arr) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(arr)); } catch { }
  }

  function buildOrderMessageFromForm(form) {
    const data = new FormData(form);
    const product = form.getAttribute('data-product') || document.title.replace(/ · .*$/, '');
    const size = data.get('size') || 'Consultation';
    const metal = data.get('metal') || data.get('material') || 'N/A';
    const finish = data.get('finish') || 'N/A';
    const qty = data.get('qty') || 1;
    const style = data.get('style') || '';
    const stone = data.get('stone') || '';

    const lines = [
      `I'm interested in ordering this beautiful piece:`,
      `- Product: ${product}`,
      `- Metal: ${metal}`,
      stone ? `- Stone: ${stone}` : '',
      style ? `- Style: ${style}` : '',
      `- Finish: ${finish}`,
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
          `Hello EDELHART,\n\n` +
          `My cart is currently empty, but I'm interested in your pieces.\n` +
          `Could you please share more information about availability and pricing?\n\n` +
          `Thank you.`;
      return { plainEmpty, encoded: encodeURIComponent(plainEmpty) };
    }

    let grandTotalVND = 0;

    const lines = [
      `Hello EDELHART,\n`,
      `I would love to order the following pieces from your collection:`,
      '',
      ...cart.map(item => {
        const qty = item.qty || 1;
        const priceVND = Number(item.priceVND || 0);
        const lineTotal = priceVND * qty;
        if (priceVND) grandTotalVND += lineTotal;

        const parts = [];
        parts.push(`- ${qty} × ${item.p || 'Item'}`);
        if (item.bespoke) parts.push(`BESPOKE`);
        if (item.metal) parts.push(`Metal: ${item.metal}`);
        if (item.stone) parts.push(`Stone: ${item.stone}`);
        if (item.finish) parts.push(`Finish: ${item.finish}`);
        if (item.size) parts.push(`Size: ${item.size}`);
        if (item.notes) parts.push(`Notes: ${item.notes}`);
        if (priceVND) parts.push(`Line total: ${priceVND} VND`);

        return parts.join(' · ');
      }),
    ];

    if (grandTotalVND > 0) {
      lines.push('', `Estimated cart total: ${grandTotalVND} VND`);
    }

    lines.push(
        '',
        `Could you please confirm availability, lead time, and next steps for payment?`,
        '',
        `Thank you.`
    );

    const plain = lines.join('\n');
    return { plain, encoded: encodeURIComponent(plain) };
  }

  function updateTransformIndicator(track, indicator, totalSlides, idx) {
    if (!indicator) return;
    const thumb = indicator.querySelector('.thumb');
    if (!thumb) return;
    const pct = totalSlides > 1 ? (idx / totalSlides) * 100 : 100;
    thumb.style.left = pct + '%';
    thumb.style.width = 100 / totalSlides + '%';
  }

  function populateAllProducts() {
    const grid = document.getElementById('all-catalog');
    if (!grid || !PRODUCTS.length) return;

    grid.innerHTML = '';
    PRODUCTS.forEach(p => {
      const imgs = (p.images || []).join(',');
      const view = viewFromSlug(p.slug);
      const priceBase = p.sale && p.sale.enabled && p.finalPriceVND ? p.finalPriceVND : (p.priceVND || 0);
      const priceHtml = (p.sale && p.sale.enabled && p.finalPriceVND)
          ? `<s>₫${p.priceVND || 0}</s> ₫${p.finalPriceVND}`
          : (p.priceVND ? `₫${p.priceVND}` : 'Price on request');

      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('data-view', view);
      card.setAttribute('data-price', priceBase);
      card.setAttribute('data-sold-out', p.soldOut ? 'true' : 'false');
      card.innerHTML = `
        <div class="media" data-images="${imgs}">
          <div class="media-fallback">${(p.name || '').split(' ')[0]}</div>
        </div>
        <div class="content">
          <div class="title">${p.name}</div>
          <div class="price" data-price-vnd="${priceBase}">${priceHtml}</div>
          <div class="meta">${p.description || ''}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="${view}" aria-label="View ${p.name}" ${p.soldOut ? 'aria-disabled="true"' : ''}>${p.soldOut ? 'Sold out' : 'View'}</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function populateCollectionStrip() {
    const track = document.querySelector('.collection-track');
    if (!track) return;

    track.innerHTML = '';

    const explicitCards = Array.isArray(window.EDELHART_COLLECTION_CARDS)
        ? window.EDELHART_COLLECTION_CARDS
        : [];

    if (explicitCards.length) {
      explicitCards.forEach(cardData => {
        const imgs = toAbsList(cardData.images || []);
        const card = document.createElement('article');
        card.className = 'collection-card';
        const view = cardData.href ? new URL(cardData.href, BASE_URL).href : '#';
        card.setAttribute('data-view', view);
        card.innerHTML = `
          <div class="collection-media" data-images="${imgs.join(',')}">
            <div class="media-fallback">${cardData.name || cardData.id || 'Collection'}</div>
          </div>
          <div class="collection-name">${cardData.name || cardData.id || 'Collection'}</div>
        `;
        if (view && view !== '#') {
          card.tabIndex = 0;
          card.setAttribute('role', 'link');
          card.setAttribute('aria-label', `Open ${cardData.name || cardData.id}`);
          const open = () => (window.location.href = view);
          card.addEventListener('click', open);
          card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          });
        }
        track.appendChild(card);
      });
      return;
    }

    if (!PRODUCTS.length) return;
    const collections = {};
    PRODUCTS.forEach(p => {
      const group = p.collection || p.groupId;
      if (!collections[group]) collections[group] = { name: group, images: [] };
      collections[group].images.push(...(p.images || []));
    });
    Object.entries(collections).forEach(([group, col]) => {
      const imgs = toAbsList(col.images.slice(0, 5));
      const card = document.createElement('article');
      card.className = 'collection-card';
      const view = COLLECTION_PAGE_MAP[group]
          ? new URL(COLLECTION_PAGE_MAP[group], BASE_URL).href
          : '#';
      card.setAttribute('data-view', view);
      card.innerHTML = `
        <div class="collection-media" data-images="${imgs.join(',')}">
          <div class="media-fallback">${col.name}</div>
        </div>
        <div class="collection-name">${col.name}</div>
      `;
      if (view && view !== '#') {
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', `Open ${col.name} collection`);
        const open = () => (window.location.href = view);
        card.addEventListener('click', open);
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        });
      }
      track.appendChild(card);
    });
  }

  function populateCollectionPageCatalog() {
    const grid = document.getElementById('collection-catalog');
    if (!grid || !PRODUCTS.length) return;
    const collection = (grid.getAttribute('data-collection') || '').toLowerCase().trim();
    if (!collection) return;

    const prods = PRODUCTS.filter(
        p => (p.collection || '').toLowerCase() === collection
    );

    grid.innerHTML = '';
    prods.forEach(p => {
      const imgs = (p.images || []).join(',');
      const view = viewFromSlug(p.slug);
      const priceBase = p.sale && p.sale.enabled && p.finalPriceVND ? p.finalPriceVND : (p.priceVND || 0);
      const priceHtml = (p.sale && p.sale.enabled && p.finalPriceVND)
          ? `<s>₫${p.priceVND || 0}</s> ₫${p.finalPriceVND}`
          : (p.priceVND ? `₫${p.priceVND}` : 'Price on request');

      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('data-view', view);
      card.setAttribute('data-price', priceBase);
      card.setAttribute('data-sold-out', p.soldOut ? 'true' : 'false');
      card.innerHTML = `
        <div class="media" data-images="${imgs}">
          <div class="media-fallback">${(p.name || '').split(' ')[0]}</div>
        </div>
        <div class="content">
          <div class="title">${p.name}</div>
          <div class="price" data-price-vnd="${priceBase}">${priceHtml}</div>
          <div class="meta">${p.availableDesign ? (p.availableDesign.finishes || []).join(', ') : ''}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="${view}" aria-label="View ${p.name}" ${p.soldOut ? 'aria-disabled="true"' : ''}>${p.soldOut ? 'Sold out' : 'View'}</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // RENDER AVAILABLE DESIGN UI (updated for combined Finish/Variant)
  function renderAvailableDesignUI(product, container) {
    if (!product || !container) return;
    const avail = product.availableDesign || {};

    let block = container.querySelector('.available-block');
    if (!block) {
      block = document.createElement('div');
      block.className = 'bespoke-block available-block';
      const actions = container.querySelector('.actions');
      if (actions) container.insertBefore(block, actions);
      else container.appendChild(block);
    }

    function fieldRow(labelText, fieldEl) {
      const wrap = document.createElement('div');
      wrap.className = 'bespoke-field';
      if (labelText) {
        const label = document.createElement('label');
        label.textContent = labelText;
        wrap.appendChild(label);
      }
      wrap.appendChild(fieldEl);
      return wrap;
    }

    // Finishes selector with variant detection
    const finishes = Array.isArray(avail.finishes) && avail.finishes.length ? avail.finishes.slice() : [];
    const finishSel = document.createElement('select');
    finishSel.name = 'finish';
    finishSel.id = 'finish';

    if (!finishes.length) finishes.push('Default');

    // Check variantLinks to map finishes
    const variantLinks = Array.isArray(product.variantLinks) ? product.variantLinks : [];

    finishes.forEach(f => {
      const o = document.createElement('option');
      o.value = f;
      o.textContent = f;

      // If this finish name matches a variant label, set data attr
      const variant = variantLinks.find(v => v.label === f);
      if (variant && variant.slug) {
        o.setAttribute('data-variant-slug', variant.slug);
      }
      finishSel.appendChild(o);
    });

    // Handle navigation when variant finish is selected
    finishSel.addEventListener('change', () => {
      const selectedOption = finishSel.options[finishSel.selectedIndex];
      const slug = selectedOption.getAttribute('data-variant-slug');

      ensureHidden('finish', finishSel.value);

      if (slug) {
        const href = viewFromSlug(slug);
        if (href && href !== '#') {
          // write handoff images if available so transition looks smooth
          const vprod = PRODUCTS.find(pp => pp.slug === slug);
          if (vprod && Array.isArray(vprod.images) && vprod.images.length) {
            writeHandoff(slug, toAbsList(vprod.images));
          }
          window.location.href = href;
        }
      }
    });

    // Stones
    const stones = Array.isArray(avail.stones) && avail.stones.length ? avail.stones.slice() : [];
    const stoneSel = document.createElement('select');
    stoneSel.name = 'stone';
    stoneSel.id = 'stone';
    if (stones.length) {
      stoneSel.innerHTML = stones.map(s => `<option value="${s}">${s}</option>`).join('');
    } else {
      stoneSel.innerHTML = `<option value="">N/A</option>`;
    }

    // Materials
    const materials = Array.isArray(avail.materials) && avail.materials.length ? avail.materials.slice() : [];
    const materialSel = document.createElement('select');
    materialSel.name = 'material';
    materialSel.id = 'material';
    if (materials.length) {
      materialSel.innerHTML = materials.map(m => `<option value="${m}">${m}</option>`).join('');
    } else {
      materialSel.innerHTML = `<option value="">N/A</option>`;
    }

    // Style / chooseMenu
    const styles = Array.isArray(avail.chooseMenu) && avail.chooseMenu.length ? avail.chooseMenu.slice() : [];
    const styleSel = document.createElement('select');
    styleSel.name = 'style';
    styleSel.id = 'style';
    if (styles.length) {
      styleSel.innerHTML = styles.map(s => `<option value="${s}">${s}</option>`).join('');
    } else {
      styleSel.innerHTML = `<option value="">Default</option>`;
    }

    // Size
    let sizeField;
    if (Array.isArray(avail.size) && avail.size.length) {
      const sizeSel = document.createElement('select');
      sizeSel.name = 'size';
      sizeSel.id = 'size';
      sizeSel.innerHTML = avail.size.map(s => `<option value="${s}">${s}</option>`).join('');
      sizeField = sizeSel;
    } else {
      const txt = document.createElement('div');
      txt.className = 'bespoke-size-note';
      txt.textContent = (avail.size && typeof avail.size === 'string') ? `Size: ${avail.size}` : 'Size: Consultation';
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'size';
      hidden.value = (avail.size && typeof avail.size === 'string') ? avail.size : 'Consultation';
      const containerDiv = document.createElement('div');
      containerDiv.appendChild(txt);
      containerDiv.appendChild(hidden);
      sizeField = containerDiv;
    }

    // Quantity
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.name = 'qty';
    qtyInput.id = 'qty';
    qtyInput.value = '1';
    qtyInput.min = '1';
    qtyInput.step = '1';
    qtyInput.className = 'qty-input';

    block.innerHTML = '';
    const h = document.createElement('h4');
    h.textContent = 'Available designs';
    block.appendChild(h);

    block.appendChild(fieldRow('Finish', finishSel));
    block.appendChild(fieldRow('Stone', stoneSel));
    block.appendChild(fieldRow('Material', materialSel));
    block.appendChild(fieldRow('Style', styleSel));

    const sizeLabel = document.createElement('div');
    sizeLabel.className = 'available-field';
    const sizeLabelTitle = document.createElement('div');
    sizeLabelTitle.className = 'label';
    sizeLabelTitle.textContent = 'Size';
    sizeLabel.appendChild(sizeLabelTitle);
    sizeLabel.appendChild(sizeField);
    block.appendChild(sizeLabel);

    block.appendChild(fieldRow('Quantity', qtyInput));

    function ensureHidden(name, value) {
      let h = container.querySelector(`input[name="${name}"]`);
      if (!h) {
        h = document.createElement('input');
        h.type = 'hidden';
        h.name = name;
        container.appendChild(h);
      }
      h.value = value || '';
      return h;
    }

    ensureHidden('finish', finishSel.value);
    ensureHidden('material', materialSel.value);
    ensureHidden('stone', stoneSel.value);
    ensureHidden('style', styleSel.value);
    ensureHidden('qty', qtyInput.value);

    if (!container.querySelector('input[name="size"]')) {
      const sEl = sizeField.querySelector('input[name="size"]');
      if (sEl) container.appendChild(sEl.cloneNode());
    }

    finishSel.addEventListener('change', () => ensureHidden('finish', finishSel.value));
    materialSel.addEventListener('change', () => ensureHidden('material', materialSel.value));
    stoneSel.addEventListener('change', () => ensureHidden('stone', stoneSel.value));
    styleSel.addEventListener('change', () => ensureHidden('style', styleSel.value));
    qtyInput.addEventListener('change', () => ensureHidden('qty', qtyInput.value));
  }

  function applyProductDataToPage() {
    const page = document.querySelector('main.product-page, body');
    if (!page) return;
    const slugAttr =
        page.getAttribute('data-product-slug') ||
        document.body.getAttribute('data-product-slug') ||
        resolveProductSlug();

    const product = PRODUCTS.find(
        p => (p.slug || '').toLowerCase() === (slugAttr || '').toLowerCase()
    );
    if (!product) {
      const titleEl = document.querySelector('.checkout .title');
      if (titleEl) titleEl.textContent = 'Product not found';
      const priceEl = document.querySelector('.checkout .price');
      if (priceEl) {
        priceEl.setAttribute('data-price-vnd', 0);
        priceEl.textContent = 'Price on request';
      }
      return;
    }

    const titleEl = document.querySelector('.checkout .title');
    if (titleEl) titleEl.textContent = product.name || titleEl.textContent;

    const priceEl = document.querySelector('.checkout .price');
    if (priceEl) {
      const baseVND = product.sale && product.sale.enabled && product.finalPriceVND
          ? product.finalPriceVND
          : (product.priceVND || 0);
      priceEl.setAttribute('data-price-vnd', baseVND);
      if (product.sale && product.sale.enabled && product.finalPriceVND) {
        priceEl.innerHTML = `<s>₫${product.priceVND || 0}</s> ₫${product.finalPriceVND}`;
      } else {
        priceEl.textContent = baseVND ? `₫${baseVND}` : 'Price on request';
      }
      priceEl.dataset.originalPriceVnd = product.priceVND || 0;
    }

    const formEl = document.querySelector('.checkout form');
    if (formEl && !formEl.getAttribute('data-product')) {
      formEl.setAttribute('data-product', product.name || product.slug || '');
    }

    if (formEl && product.soldOut) {
      formEl.querySelectorAll('button, select, input').forEach(el => { el.disabled = true; });
      const sold = document.createElement('div');
      sold.className = 'soldout-label';
      sold.textContent = 'Sold out';
      formEl.prepend(sold);
    }

    renderAvailableDesignUI(product, formEl);

    const descContainer = document.querySelector('.product-description p');
    if (descContainer && product.description) descContainer.textContent = product.description;

    const breadcrumbCurrent = document.querySelector('.breadcrumbs span[aria-current="page"]');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name || breadcrumbCurrent.textContent;

    if (window.CurrencyManager && typeof window.CurrencyManager.refresh === 'function') {
      window.CurrencyManager.refresh();
    }
  }

  function initCatalogCards() {
    const cards = document.querySelectorAll(
        '.catalog .card, .collection-card, .slider-strip[data-slider="recommended"] .card'
    );
    if (!cards.length) { SlideClock.start(); return; }

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
      const media = card.querySelector('.media, .collection-media');
      const viewUrl = card.getAttribute('data-view') || '#';
      const title =
          card.querySelector('.title')?.textContent ||
          card.querySelector('.collection-name')?.textContent ||
          'product';
      const slug = slugFromPath(viewUrl);

      const listRaw = media ? listFromCSV(media.getAttribute('data-images')) : [];
      const listAbs = toAbsList(listRaw);
      if (slug && listAbs.length) imagesMap[slug] = { images: listAbs };

      if (!card.classList.contains('collection-card')) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', e => {
          const t = e.target;
          if (t.closest('.slider-btn') || t.closest('.dot') || t.closest('.btn') || t.closest('a')) return;
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

      if (!media || !listAbs.length) return;

      if (!card.classList.contains('collection-card')) {
        card.querySelectorAll('a[href]').forEach(a => {
          a.addEventListener('click', () => {
            if (slug && listAbs.length) writeHandoff(slug, listAbs);
          }, { capture: true });
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
        img.decoding = 'async';
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
        Array.from(dots.children).forEach((el, i) => el.classList.toggle('active', i === idx));
      }
      function go(n) { idx = (n + total) % total; render(); }

      const stopNav = e => { e.preventDefault(); e.stopPropagation(); };
      prev.addEventListener('click', e => { stopNav(e); go(idx - 1); media.classList.add('show-controls'); });
      next.addEventListener('click', e => { stopNav(e); go(idx + 1); media.classList.add('show-controls'); });
      dots.addEventListener('click', e => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.classList.contains('dot')) {
          stopNav(e);
          go(Number(t.dataset.index || 0));
          media.classList.add('show-controls');
        }
      });

      const api = {
        paused: true,
        inView: false,
        subscribed: false,
        pauseTimeout: null,
        subscribe() { if (!this.subscribed) { SlideClock.subscribe(tick); this.subscribed = true; } },
        unsubscribe() { if (this.subscribed) { SlideClock.unsubscribe(tick); this.subscribed = false; } },
        updateSubscription() {
          if (prefersReduced || total <= 1) { this.unsubscribe(); return; }
          if (!this.paused && this.inView) this.subscribe();
          else this.unsubscribe();
        },
      };
      const tick = () => { if (total > 1) go(idx + 1); };
      media.__api = api;

      if (!card.classList.contains('collection-card')) {
        let startX = 0, dist = 0, dragging = false;
        function onStart(e) {
          dragging = true;
          startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
          dist = 0;
          clearTimeout(api.pauseTimeout);
          api.paused = true;
          api.updateSubscription();
          media.classList.add('show-controls');
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
        card.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        card.addEventListener('touchstart', onStart, scrollOptions);
        window.addEventListener('touchmove', onMove, scrollOptions);
        window.addEventListener('touchend', onEnd);
      }

      media.classList.remove('show-controls');

      card.addEventListener('mouseenter', () => { api.paused = false; api.updateSubscription(); });
      card.addEventListener('mouseleave', () => { api.paused = true; api.updateSubscription(); });

      if (io) io.observe(media);
      render();

      // Hover/focus gated autoplay
      enableHoverAutoplay(media, () => { if (!api.paused && api.inView) render(go(idx + 1)); });
      api.updateSubscription(); // will stay paused until hover
    });

    if (Object.keys(imagesMap).length) {
      const current = readImageCache()?.items || null;
      const merged = { ...(current || {}), ...imagesMap };
      writeImageCache(merged);
    }
    SlideClock.start();
  }

  function initRecommended() {
    const track = document.querySelector('.slider-strip[data-slider="recommended"] .slider-track');
    if (!track) return;

    track.innerHTML = '';

    const cfg = (window.EDELHART_CONFIG && window.EDELHART_CONFIG.recommended) || {};
    const pinned = Array.isArray(cfg.pinned) ? cfg.pinned : [];
    const pool = Array.isArray(cfg.pool) ? cfg.pool : [];

    const slugs = [...new Set([...pinned, ...pool])];
    const cards = slugs
        .map(slug => PRODUCTS.find(p => p.slug === slug))
        .filter(Boolean);

    cards.forEach(p => {
      const viewUrl = viewFromSlug(p.slug);
      const title = p.name || 'Product';
      const price = p.sale && p.sale.enabled && p.finalPriceVND
          ? `<s>₫${p.priceVND || 0}</s> ₫${p.finalPriceVND}`
          : (p.priceVND ? `₫${p.priceVND}` : 'Price on request');
      const imagesRaw = (p.images || []).join(',');

      const cardEl = document.createElement('article');
      cardEl.className = 'card';
      cardEl.setAttribute('data-view', viewUrl);
      cardEl.setAttribute('data-price', p.finalPriceVND || p.priceVND || 0);
      cardEl.setAttribute('data-sold-out', p.soldOut ? 'true' : 'false');
      cardEl.innerHTML = `
        <div class="media" data-images="${imagesRaw}">
          <div class="media-fallback">${title}</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="price" data-price-vnd="${p.finalPriceVND || p.priceVND || 0}">${price}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="${viewUrl}" aria-label="View ${title}" ${p.soldOut ? 'aria-disabled="true"' : ''}>${p.soldOut ? 'Sold out' : 'View'}</a>
        </div>
      `;
      track.appendChild(cardEl);
    });
  }

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

      let prev = isCollectionStrip
          ? container.querySelector('.col-prev')
          : container.querySelector('.slider-arrow-prev');
      let next = isCollectionStrip
          ? container.querySelector('.col-next')
          : container.querySelector('.slider-arrow-next');

      if (!prev || !next) {
        prev = document.createElement('button');
        prev.className = isCollectionStrip ? 'col-btn col-prev' : 'slider-arrow slider-arrow-prev';
        prev.setAttribute('aria-label', 'Previous');
        prev.textContent = '‹';

        next = document.createElement('button');
        next.className = isCollectionStrip ? 'col-btn col-next' : 'slider-arrow slider-arrow-next';
        next.setAttribute('aria-label', 'Next');
        next.textContent = '›';

        container.appendChild(prev);
        container.appendChild(next);
      }

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
        const gap = parseFloat(style.columnGap || style.gap || '12') || 12;
        return (first.getBoundingClientRect().width || track.getBoundingClientRect().width) + gap;
      }

      function hasOverflow() { return slides.length > 1; }

      function goCollection(n) {
        idx = (n + slides.length) % slides.length;
        track.style.transform = `translateX(${idx * -100}%)`;
        updateTransformIndicator(track, indicator, slides.length, idx);
        container.classList.add('show-controls');
      }

      function goStrip(n) {
        if (!hasOverflow()) return;
        idx = (n + slides.length) % slides.length;
        const w = cardWidth();
        track.style.transform = `translateX(${idx * -w}px)`;
        updateTransformIndicator(track, indicator, slides.length, idx);
        container.classList.add('show-controls');
      }

      const go = isCollectionStrip ? goCollection : goStrip;

      prev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx - 1); });
      next.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx + 1); });

      if (isCollectionStrip) {
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
        if (io) io.observe(container);

        const tick = () => { if (inView && slides.length > 1) goCollection(idx + 1); };

        window.addEventListener('resize', debounce(() => {
          track.style.transform = 'translateX(0%)';
          idx = 0;
          requestAnimationFrame(() => {
            updateTransformIndicator(track, indicator, slides.length, idx);
            updateClockSubscription();
          });
        }, 100));

        requestAnimationFrame(() => {
          updateTransformIndicator(track, indicator, slides.length, idx);
          updateClockSubscription();
        });

        function updateClockSubscription() {
          SlideClock.unsubscribe(tick);
          if (!AUTO_SLIDE_ALLOWED) return;
          if (inView && slides.length > 1) SlideClock.subscribe(tick);
        }

        enableHoverAutoplay(container, tick);
        return;
      }

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
      if (io) io.observe(container);

      const tick = () => { if (hasOverflow() && inView) goStrip(idx + 1); };

      function updateClockSubscription() {
        SlideClock.unsubscribe(tick);
        if (!AUTO_SLIDE_ALLOWED) return;
        if (hasOverflow() && inView) SlideClock.subscribe(tick);
      }

      let startX = 0;
      let dist = 0;
      let dragging = false;

      function onStart(e) {
        dragging = true;
        startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = 0;
        container.classList.add('show-controls');
        SlideClock.unsubscribe(tick);
      }

      function onMove(e) {
        if (!dragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = x - startX;
      }

      function onEnd() {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(dist) > 12) {
          if (dist < 0) goStrip(idx + 1);
          else goStrip(idx - 1);
        }
        updateClockSubscription();
      }

      track.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      track.addEventListener('touchstart', onStart, scrollOptions);
      window.addEventListener('touchmove', onMove, scrollOptions);
      window.addEventListener('touchend', onEnd);

      window.addEventListener('resize', debounce(() => {
        track.style.transform = 'translateX(0px)';
        idx = 0;
        requestAnimationFrame(() => {
          updateTransformIndicator(track, indicator, slides.length, idx);
          updateClockSubscription();
        });
      }, 100));

      requestAnimationFrame(() => {
        updateTransformIndicator(track, indicator, slides.length, idx);
        updateClockSubscription();
      });

      enableHoverAutoplay(container, tick);
    });
  }

  async function initProductGallery() {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;

    const slidesWrap = gallery.querySelector('.slides');
    const dots = gallery.querySelector('.thumbs');
    const prev = gallery.querySelector('.slider-prev');
    const next = gallery.querySelector('.slider-next');

    const thisSlug = resolveProductSlug();
    let images = [];

    // Try to get from product data first
    if (PRODUCTS.length) {
      const productFromData = PRODUCTS.find(
          p => (p.slug || '').toLowerCase() === thisSlug.toLowerCase()
      );
      if (productFromData && Array.isArray(productFromData.images)) {
        images = toAbsList(productFromData.images);
      }
    }

    // Fallback to inline data-images
    if (!images.length) {
      const inlineRaw = listFromCSV(gallery.getAttribute('data-images') || '');
      images = toAbsList(inlineRaw);
    }

    // Fallback to handoff
    if (!images.length) {
      const handoff = readHandoff();
      if (handoff && (handoff.slug || '').toLowerCase() === thisSlug.toLowerCase() && Array.isArray(handoff.images)) {
        images = toAbsList(handoff.images);
        clearHandoff();
      }
    }

    // If still no images, show fallback
    if (!images.length) {
      const fallback = gallery.querySelector('.media-fallback');
      if (fallback) fallback.style.display = 'flex';
      return;
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
        dots.addEventListener('click', e => {
          const t = e.target;
          if (!(t instanceof HTMLElement)) return;
          if (t.classList.contains('thumb')) {
            go(Number(t.dataset.index || 0));
          }
        }, { passive: true });
      }

      const thumbStrip = document.querySelector('.thumb-strip');
      let thumbRow;

      if (!thumbStrip) {
        const ts = document.createElement('div');
        ts.className = 'thumb-strip';
        thumbRow = document.createElement('div');
        thumbRow.className = 'thumb-row';
        ts.appendChild(thumbRow);
        gallery.insertAdjacentElement('afterend', ts);
      } else {
        thumbRow = thumbStrip.querySelector('.thumb-row') || document.createElement('div');
        thumbRow.className = 'thumb-row';
        if (!thumbStrip.contains(thumbRow)) thumbStrip.appendChild(thumbRow);
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
        im.loading = 'lazy';
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
      function prevImg() { i = (i - 1 + list.length) % list.length; show(); }
      function nextImg() { i = (i + 1) % list.length; show(); }
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
      lb.onclick = e => { if (e.target === lb) close(); }
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      lb.classList.add('open');
      show();
    }

    let idx = 0, total = 0;
    function setActive() {
      if (dots)
        Array.from(dots.children).forEach((el, i) => el.classList.toggle('active', i === idx));
      const strip = document.querySelector('.thumb-strip');
      const row = strip?.querySelector('.thumb-row');
      if (row) {
        Array.from(row.children).forEach((el, i) => el.classList.toggle('active', i === idx));
      }
    }
    function render() {
      slidesWrap.style.transform = `translateX(${idx * -100}%)`;
      setActive();
    }
    function go(n) { idx = (n + total) % total; render(); }

    if (prev) prev.addEventListener('click', () => { go(idx - 1); gallery.classList.add('show-controls'); });
    if (next) next.addEventListener('click', () => { go(idx + 1); gallery.classList.add('show-controls'); });

    let startX = 0, dist = 0, dragging = false, paused = true, inView = false;
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
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 40) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
      paused = true;
      updateClockSub();
    }
    slidesWrap.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    slidesWrap.addEventListener('touchstart', onStart, scrollOptions);
    window.addEventListener('touchmove', onMove, scrollOptions);
    window.addEventListener('touchend', onEnd);
    gallery.addEventListener('mouseenter', () => { paused = false; updateClockSub(); });
    gallery.addEventListener('mouseleave', () => { paused = true; updateClockSub(); });

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

    const tick = () => { if (total > 1 && !paused && inView) go(idx + 1); };
    function updateClockSub() {
      SlideClock.unsubscribe(tick);
      if (!AUTO_SLIDE_ALLOWED) return;
      if (!paused && inView && total > 1) SlideClock.subscribe(tick);
    }

    enableHoverAutoplay(gallery, tick);
    buildFromImages(images);
  }

  async function ensureImagesMap() {
    const cached = readImageCache()?.items || null;
    if (cached && Object.keys(cached).length) return cached;
    return {};
  }

  async function initDynamicRelated() {
    const relatedStrip = document.getElementById('dynamic-related');
    if (!relatedStrip) return;

    const track = relatedStrip.querySelector('.related-track');
    if (!track) return;

    const currentSlug = resolveProductSlug();
    const cfg = (window.EDELHART_CONFIG && window.EDELHART_CONFIG.related) || {};
    const pinned = (cfg.pinnedBySlug && cfg.pinnedBySlug[currentSlug]) || [];
    const pool = Array.isArray(cfg.pool) ? cfg.pool : [];

    const ordered = [...new Set([...pinned, ...pool])].filter(slug => slug !== currentSlug);
    const selected = ordered.slice(0, 8)
        .map(slug => PRODUCTS.find(p => p.slug === slug))
        .filter(Boolean);

    track.innerHTML = '';

    selected.forEach(product => {
      const card = document.createElement('a');
      card.className = 'related-card';
      const href = viewFromSlug(product.slug);
      card.href = href;
      card.setAttribute('data-view', href);

      const imagesCsv = (product.images || []).join(',');
      const priceBase = product.sale && product.sale.enabled && product.finalPriceVND ? product.finalPriceVND : (product.priceVND || 0);
      const priceHtml = (product.sale && product.sale.enabled && product.finalPriceVND)
          ? `<s>₫${product.priceVND || 0}</s> ₫${product.finalPriceVND}`
          : (product.priceVND ? `₫${product.priceVND}` : 'Price on request');

      card.innerHTML = `
        <div class="related-media" data-images="${imagesCsv}">
          <div class="media-fallback">${product.name}</div>
        </div>
        <div class="related-info">
          <div class="title">${product.name}</div>
          <div class="price" data-price-vnd="${priceBase}">${priceHtml}</div>
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
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '12') || 12;
      return (first.getBoundingClientRect().width || track.getBoundingClientRect().width) + gap;
    }
    function hasOverflow() { return slides.length > 1; }
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

    prev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx - 1); });
    next.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx + 1); });

    let startX = 0, dist = 0, dragging = false;

    function onStart(e) {
      dragging = true;
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = 0;
      relatedStrip.classList.add('show-controls');
      SlideClock.unsubscribe(tick);
    }

    function onMove(e) {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dist = x - startX;
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 12) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
      update();
    }

    track.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    track.addEventListener('touchstart', onStart, scrollOptions);
    window.addEventListener('touchmove', onMove, scrollOptions);
    window.addEventListener('touchend', onEnd);

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
    if (io) io.observe(relatedStrip);

    const tick = () => { if (inView && hasOverflow()) go(idx + 1); };
    function update() {
      SlideClock.unsubscribe(tick);
      if (!AUTO_SLIDE_ALLOWED) return;
      if (hasOverflow() && inView) SlideClock.subscribe(tick);
    }
    window.addEventListener('resize', debounce(() => {
      track.style.transform = 'translateX(0px)';
      idx = 0;
      requestAnimationFrame(() => {
        updateTransformIndicator(
            track,
            relatedStrip.querySelector('.swipe-indicator'),
            slides.length,
            idx
        );
        update();
      });
    }, 100));
    requestAnimationFrame(() => {
      updateTransformIndicator(
          track,
          relatedStrip.querySelector('.swipe-indicator'),
          slides.length,
          idx
      );
      update();
    });

    enableHoverAutoplay(relatedStrip, tick);
  }

  function initRelatedInnerSliders() {
    const cards = document.querySelectorAll('#dynamic-related .related-card');
    if (!cards.length) return;

    cards.forEach(card => {
      const media = card.querySelector('.related-media');
      if (!media) return;

      const raw = media.getAttribute('data-images') || '';
      const list = listFromCSV(raw);
      if (!list.length) return;

      const absList = toAbsList(list);

      const slidesWrap = document.createElement('div');
      slidesWrap.className = 'slides';
      absList.forEach(src => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const img = document.createElement('img');
        img.src = src;
        img.alt = card.querySelector('.title')?.textContent || 'Product';
        img.loading = 'lazy';
        slide.appendChild(img);
        slidesWrap.appendChild(slide);
      });

      media.innerHTML = '';
      media.appendChild(slidesWrap);

      const dots = document.createElement('div');
      dots.className = 'dots';
      absList.forEach((_, i) => {
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
      const total = absList.length;

      function render() {
        slidesWrap.style.transform = `translateX(${idx * -100}%)`;
        Array.from(dots.children).forEach((el, i) =>
            el.classList.toggle('active', i === idx)
        );
      }

      function go(n) { idx = (n + total) % total; render(); }

      const stopNav = e => { e.preventDefault(); e.stopPropagation(); };

      prev.addEventListener('click', e => { stopNav(e); go(idx - 1); media.classList.add('show-controls'); });
      next.addEventListener('click', e => { stopNav(e); go(idx + 1); media.classList.add('show-controls'); });
      dots.addEventListener('click', e => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.classList.contains('dot')) {
          stopNav(e);
          go(Number(t.dataset.index || 0));
          media.classList.add('show-controls');
        }
      });

      let startX = 0, dist = 0, dragging = false;
      function onStart(e) {
        dragging = true;
        startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dist = 0;
        media.classList.add('show-controls');
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

      card.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      card.addEventListener('touchstart', onStart, scrollOptions);
      window.addEventListener('touchmove', onMove, scrollOptions);
      window.addEventListener('touchend', onEnd);

      render();
    });
  }

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
        dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
      }
      if (indicator) updateTransformIndicator(track, indicator, total, idx);
    }

    function go(n) { idx = (n + total) % total; render(); }

    if (prevBtn) prevBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx - 1); strip.classList.add('show-controls'); });
    if (nextBtn) nextBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(idx + 1); strip.classList.add('show-controls'); });

    if (dotsContainer) {
      dotsContainer.addEventListener('click', e => {
        const dot = e.target;
        if (dot.classList.contains('dot')) {
          const i = parseInt(dot.dataset.index || '0', 10);
          go(i);
        }
      });
    }

    let startX = 0, dist = 0, dragging = false;
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
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dist) > 50) {
        if (dist < 0) go(idx + 1);
        else go(idx - 1);
      }
      setTimeout(() => strip.classList.remove('show-controls'), 2000);
    }

    track.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    track.addEventListener('touchstart', onStart, scrollOptions);
    window.addEventListener('touchmove', onMove, scrollOptions);
    window.addEventListener('touchend', onEnd);

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

    const tick = () => { if (inView) go(idx + 1); };
    enableHoverAutoplay(strip, tick); // autoplay only on hover/focus
    render();
  }

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
  }

  /* ---------- PRICE HYDRATION ------------- */
  function normalizeSlug(str = '') {
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
  }

  function findProduct(slugGuess, titleGuess) {
    const candidates = PRODUCTS || [];
    const slugNorm = normalizeSlug(slugGuess || '');
    const titleNorm = normalizeSlug(titleGuess || '');

    return (
        candidates.find(p => normalizeSlug(p.slug || p.name) === slugNorm) ||
        candidates.find(p => normalizeSlug(p.slug || p.name) === titleNorm) ||
        null
    );
  }

  function formatPriceIntl(value, currency = 'VND') {
    if (value === 0 || value === '0') return 'Price on request';
    if (!value) return 'Price on request';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    } catch {
      return value;
    }
  }

  function hydrateProductPrice() {
    const page = document.querySelector('body, main.product-page');
    if (!page) return;

    const slugAttr =
        page.getAttribute('data-product-slug') ||
        document.body.getAttribute('data-product-slug');

    const product = findProduct(slugAttr, '');
    if (!product) return;

    const vnd = product.finalPriceVND ?? product.priceVND ?? product.price?.vnd ?? product.price;

    const priceEls = document.querySelectorAll('.checkout .price, .cart-total');
    priceEls.forEach(el => {
      if (vnd != null) el.dataset.priceVnd = vnd;
      if (product.sale && product.sale.enabled && product.finalPriceVND) {
        el.innerHTML = `<s>${formatPriceIntl(product.priceVND, 'VND')}</s> ${formatPriceIntl(product.finalPriceVND, 'VND')}`;
      } else {
        el.textContent = vnd ? formatPriceIntl(vnd, 'VND') : 'Price on request';
      }
    });
  }
  document.addEventListener('DOMContentLoaded', hydrateProductPrice);
  /* --------- END PRICE HYDRATION ----------- */

  function eagerizeCriticalImages() {
    const critical = document.querySelectorAll(
        '#home img, .collection-card img, .media img, .featured-track img, .collage-surround img'
    );
    critical.forEach(img => {
      // For data saver we keep lazy; otherwise keep existing eager defaults
      if (!DATA_SAVER) {
        if (img.loading === 'lazy') img.loading = 'eager';
        img.decoding = 'async';
        try { if (!img.fetchPriority) img.fetchPriority = 'high'; } catch { }
      } else {
        img.loading = 'lazy';
        try { img.fetchPriority = 'low'; } catch {}
      }
    });
  }

  function warmFirstImages() {
    if (DATA_SAVER) return;
    const urls = new Set();
    const addSrc = img => {
      if (!img) return;
      const src = img.currentSrc || img.src;
      if (src) urls.add(src);
    };
    addSrc(heroImg);
    document.querySelectorAll('.media .slide img, .collection-media .slide img, .featured-track img, .collage-surround img').forEach(addSrc);
    Array.from(urls).slice(0, 30).forEach(src => {
      const im = new Image();
      im.decoding = 'async';
      im.loading = 'eager';
      im.src = src;
    });
  }

  function prewarmAllProductImages() {
    if (DATA_SAVER) return;
    const seen = new Set();
    if (PRODUCTS.length) {
      PRODUCTS.forEach(p => {
        (p.images || []).forEach(src => {
          if (seen.has(src)) return;
          seen.add(src);
          const im = new Image();
          im.decoding = 'async';
          im.loading = 'lazy';
          im.src = toAbsList([src])[0];
        });
      });
    }
  }

  function rebaseStaticMedia() {
    // Select images with relative paths
    const rebasedImgs = document.querySelectorAll('img[src^="../img/"], img[src^="./img/"], img[src^="img/"]');

    rebasedImgs.forEach(img => {
      let src = img.getAttribute('src');
      if (!src) return;

      // Strip leading ./ or ../ characters
      src = src.replace(/^(\.\.\/|\.\/)+/, '');

      try {
        img.src = new URL(src, BASE_URL).href;
      } catch (e) {
        // Ignore errors
      }
    });

    // Select links (stylesheets, icons)
    const links = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="stylesheet"]');

    links.forEach(link => {
      let href = link.getAttribute('href');
      // Skip if empty or already absolute (http://...)
      if (!href || /^https?:\/\//i.test(href)) return;

      // Strip leading ./ or ../ characters
      href = href.replace(/^(\.\.\/|\.\/)+/, '');

      try {
        link.href = new URL(href, BASE_URL).href;
      } catch (e) {
        // Ignore errors
      }
    });
  }

  /* ---------- Cart helpers ---------- */
  const getCurrentCurrency = () => window.CurrencyManager?.getCurrent?.() || 'VND';
  const formatPriceWithCurrency = (vndAmount) => {
    if (!window.CurrencyManager) return formatPriceIntl(vndAmount, 'VND');
    return window.CurrencyManager.formatPrice(vndAmount, getCurrentCurrency());
  };

  /* -------- BESPOKE MODULE ---------- */
  function injectBespokeUI(form, productSlug, priceVND) {
    if (!form || form.__hasBespoke) return;
    form.__hasBespoke = true;

    const product = PRODUCTS.find(p => p.slug === productSlug);
    const bespoke = product?.bespokeDesign || {};
    const bespokeFinishes = Array.isArray(bespoke.finishes) ? bespoke.finishes : ["Silver", "Gold", "Black rhodium"];

    const block = document.createElement('div');
    block.className = 'bespoke-block';
    block.innerHTML = `
      <hr class="bespoke-sep" aria-hidden="true">
      <h4 class="bespoke-title">Bespoke request</h4>
      <div class="bespoke-field">
        <label for="bespoke-metal">Metal</label>
        <select id="bespoke-metal" name="bespoke-metal" required>
          <option value="">Select metal</option>
          <option>E silver</option>
          <option>10K gold</option>
          <option>14K gold</option>
          <option>18K gold</option>
        </select>
      </div>
      <div class="bespoke-field">
        <label for="bespoke-stone">Stone</label>
        <select id="bespoke-stone" name="bespoke-stone" required>
          <option value="">Select stone</option>
          <option>Gemstones</option>
          <option>Diamond</option>
        </select>
      </div>
      <div class="bespoke-field">
        <label for="bespoke-finish">Finish</label>
        <select id="bespoke-finish" name="bespoke-finish" required>
          ${bespokeFinishes.map(f => `<option>${f}</option>`).join('')}
        </select>
      </div>
      <div class="bespoke-field">
        <label>Size</label>
        <div class="bespoke-size-note">Size: by consultation</div>
      </div>
      <div class="bespoke-field">
        <label for="bespoke-notes">Notes (optional)</label>
        <textarea id="bespoke-notes" name="bespoke-notes" rows="3" placeholder="Share preferences (finish, timeline, reference photos, etc.)"></textarea>
      </div>
      <div class="bespoke-actions">
        <button type="button" class="btn primary bespoke-request">Request Bespoke</button>
        <a class="btn outline bespoke-contact" target="_blank" rel="noopener">Contact for Bespoke</a>
      </div>
    `;
    form.appendChild(block);

    const metalSel = block.querySelector('#bespoke-metal');
    const stoneSel = block.querySelector('#bespoke-stone');
    const finishSel = block.querySelector('#bespoke-finish');
    const notesEl = block.querySelector('#bespoke-notes');
    const requestBtn = block.querySelector('.bespoke-request');
    const contactBtn = block.querySelector('.bespoke-contact');

    const ensureSelections = () => metalSel.value && stoneSel.value && finishSel.value;

    const openCart = () => {
      const drawer = document.querySelector('.cart-drawer');
      if (drawer) {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    };

    function addBespokeToCart() {
      if (!ensureSelections()) {
        alert('Please select metal, stone, and finish for your bespoke request.');
        return;
      }
      const cart = readCart();
      const newItem = {
        bespoke: true,
        p: form.getAttribute('data-product') || document.title.replace(/ · .*$/, ''),
        productSlug: productSlug || slugFromPath(location.pathname),
        metal: metalSel.value,
        stone: stoneSel.value,
        finish: finishSel.value,
        size: 'By consultation',
        notes: (notesEl.value || '').trim(),
        qty: 1,
        priceVND: Number(priceVND || 0) || 0,
        at: Date.now(),
        url: location.href,
      };
      cart.push(newItem);
      writeCart(cart);
      renderCart();
      openCart();
    }

    requestBtn.addEventListener('click', addBespokeToCart);

    contactBtn.addEventListener('click', e => {
      e.preventDefault();
      const msg = `Hello EDELHART, I'd like a bespoke version of ${form.getAttribute('data-product') || 'this piece'}.\nMetal: ${metalSel.value || 'N/A'}\nStone: ${stoneSel.value || 'N/A'}\nFinish: ${finishSel.value || 'N/A'}\nSize: by consultation\nNotes: ${(notesEl.value || '').trim() || 'N/A'}`;
      const url = `https://wa.me/84944445084?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---------- Checkout & Cart ---------- */
  function initCheckout() {
    const form = document.querySelector('.checkout form');
    if (!form) return;

    const priceEl = document.querySelector('.checkout .price');
    const priceVND = Number(priceEl?.dataset.priceVnd || priceEl?.getAttribute('data-price-vnd') || 0) || 0;
    const productSlug = document.querySelector('main.product-page')?.dataset.productSlug || resolveProductSlug();

    injectBespokeUI(form, productSlug, priceVND);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = buildOrderMessageFromForm(form);
      window.open(`https://wa.me/84944445084?text=${msg.encoded}`, '_blank', 'noopener');
    });

    const ig = form.querySelector('a[aria-label*="Instagram"]');
    const fb = form.querySelector('a[aria-label*="Facebook"]');
    [ig, fb].forEach(a => {
      if (!a) return;
      a.addEventListener('click', () => {
        const msg = buildOrderMessageFromForm(form);
        try { navigator.clipboard?.writeText(msg.plain); } catch { }
      });
    });

    const addBtn = form.querySelector('.add-to-cart');

    function addToCart() {
      const data = new FormData(form);
      const vndFromData = Number(priceEl?.dataset.priceVnd || 0) || 0;
      const parsed = parsePrice(priceEl?.textContent || '');
      const priceNum = vndFromData || parsed || 0;

      const newItem = {
        bespoke: false,
        p: form.getAttribute('data-product') || document.title.replace(/ · .*$/, ''),
        productSlug: productSlug,
        metal: data.get('metal') || data.get('material') || '',
        stone: data.get('stone') || '',
        finish: data.get('finish') || '',
        size: data.get('size') || 'Consultation',
        qty: Number(data.get('qty') || 1) || 1,
        priceVND: priceNum,
        at: Date.now(),
        url: location.href,
      };
      const cart = readCart();
      const existingIndex = cart.findIndex(
          item =>
              !item.bespoke &&
              item.p === newItem.p &&
              item.metal === newItem.metal &&
              item.stone === newItem.stone &&
              item.finish === newItem.finish &&
              item.size === newItem.size
      );
      if (existingIndex >= 0) cart[existingIndex].qty += newItem.qty;
      else cart.push(newItem);
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

      if (typeof updateCartCount === 'function') updateCartCount();
    }
    if (addBtn) addBtn.addEventListener('click', addToCart);
  }

  let updateCartCount = () => {};
  let renderCart = () => {};

  function initCartDrawer() {
    const drawer = document.querySelector('.cart-drawer');
    if (!drawer) return;

    const overlay = drawer.querySelector('.cart-overlay');
    const closeBtn = drawer.querySelector('.cart-close');
    const itemsEl = drawer.querySelector('.cart-items');
    const emptyEl = drawer.querySelector('.cart-empty');
    const totalEl = drawer.querySelector('.cart-total');
    const countEls = document.querySelectorAll('.cart-count');
    const toggleBtns = document.querySelectorAll('.cart-toggle');

    const footer = drawer.querySelector('.cart-footer') || document;
    const checkoutBtn = footer.querySelector('.cart-checkout');
    let igBtn = footer.querySelector('.cart-copy[data-platform="Instagram"]');
    let fbBtn = footer.querySelector('.cart-copy[data-platform="Facebook"]');

    if (!igBtn) {
      igBtn = document.createElement('button');
      igBtn.type = 'button';
      igBtn.className = 'btn outline cart-copy';
      igBtn.dataset.platform = 'Instagram';
      igBtn.textContent = 'Copy cart & Inquire on Instagram';
      footer.appendChild(igBtn);
    }
    if (!fbBtn) {
      fbBtn = document.createElement('button');
      fbBtn.type = 'button';
      fbBtn.className = 'btn outline cart-copy';
      fbBtn.dataset.platform = 'Facebook';
      fbBtn.textContent = 'Copy cart & Inquire on Facebook';
      footer.appendChild(fbBtn);
    }

    updateCartCount = function () {
      const cart = readCart();
      const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
      countEls.forEach(el => (el.textContent = String(totalQty)));
    };

    function render() {
      const cart = readCart();
      itemsEl.innerHTML = '';

      if (!cart.length) {
        emptyEl.style.display = '';
        itemsEl.style.display = 'none';
        totalEl.textContent = formatPriceWithCurrency(0);
        updateCartCount();

        const msg = buildOrderMessageFromCart(cart);
        if (checkoutBtn)
          checkoutBtn.href = `https://wa.me/84944445084?text=${msg.encoded}`;
        return;
      }

      emptyEl.style.display = 'none';
      itemsEl.style.display = '';

      let totalVND = 0;
      cart.forEach((item, index) => {
        const priceVND = Number(item.priceVND || 0);
        const qty = item.qty || 1;
        const lineTotalVND = priceVND * qty;
        totalVND += lineTotalVND;

        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <button type="button" class="cart-item-remove" aria-label="Remove item">✕</button>
          <div>
            <div class="cart-item-title">${item.p || 'Item'} ${item.bespoke ? '<span class="badge-bespoke">BESPOKE</span>' : ''}</div>
            <div class="cart-item-meta">
              ${(item.metal ? `Metal: ${item.metal}` : '')}
              ${(item.stone ? ` · Stone: ${item.stone}` : '')}
              ${(item.finish ? ` · Finish: ${item.finish}` : '')}
              ${(item.size ? ` · Size: ${item.size}` : '')}
              ${(item.notes ? ` · Notes: ${item.notes}` : '')}
            </div>
          </div>
          <div>
            <div class="cart-item-qty" role="group" aria-label="Quantity">
              <button type="button" class="qty-btn qty-dec" aria-label="Decrease quantity">−</button>
              <span class="qty-value" aria-live="polite">${qty}</span>
              <button type="button" class="qty-btn qty-inc" aria-label="Increase quantity">+</button>
            </div>
            <div class="cart-item-price">${priceVND ? formatPriceWithCurrency(lineTotalVND) : 'Price on request'}</div>
          </div>
        `;

        li.querySelector('.cart-item-remove').addEventListener('click', () => {
          const c = readCart();
          c.splice(index, 1);
          writeCart(c);
          render();
        });

        const decBtn = li.querySelector('.qty-dec');
        const incBtn = li.querySelector('.qty-inc');

        const updateQty = (delta) => {
          const c = readCart();
          const nextQty = Math.max(1, (c[index]?.qty || 1) + delta);
          c[index].qty = nextQty;
          writeCart(c);
          render();
        };

        decBtn.addEventListener('click', () => updateQty(-1));
        incBtn.addEventListener('click', () => updateQty(+1));

        itemsEl.appendChild(li);
      });

      totalEl.textContent = formatPriceWithCurrency(totalVND);
      updateCartCount();

      document.addEventListener('click', handleCartCopy);
    }

    renderCart = render;

    function handleCartCopy(e) {
      const target = e.target;
      if (!target.classList.contains('cart-copy')) return;

      const button = target;
      const platform = button.dataset.platform || '';
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

        if (/instagram/i.test(platform)) {
          showToast('Your order message has been copied.\n\nIn the Instagram tab that opens, paste it into your DM to @edelhartvx and send.');
        } else if (/facebook/i.test(platform)) {
          showToast('Your order message has been copied.\n\nIn the Facebook tab that opens, paste it into your message to Edelhart and send.');
        } else {
          showToast('Message copied to clipboard.');
        }

        setTimeout(() => {
          try {
            if (/instagram/i.test(platform)) {
              window.open('https://www.instagram.com/edelhartvx/', '_blank', 'noopener');
            } else if (/facebook/i.test(platform)) {
              window.open('https://www.facebook.com/people/Edelhart/61578850709155/', '_blank', 'noopener');
            }
          } catch (err) {
            console.error('Failed to open platform:', err);
          }
        }, 5000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy. Please try again.');
      });
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

  function showToast(message) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4000,
    });

    const box = document.createElement('div');
    box.textContent = message;
    Object.assign(box.style, {
      maxWidth: '420px',
      margin: '0 20px',
      background: '#141516',
      color: '#f6f7f9',
      padding: '18px 20px',
      borderRadius: '18px',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 18px 50px rgba(0, 0, 0, 0.75)',
      fontSize: '14px',
      lineHeight: '1.6',
      textAlign: 'center',
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }
    overlay.addEventListener('click', close);
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey, { once: true });
    setTimeout(close, 8000);
  }

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
  }

  function initFilterToggle() {
    const btn = document.querySelector('.filter-toggle');
    const panel = document.getElementById('sort-panel');
    if (!btn || !panel) return;
    const setOpen = open => {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { panel.hidden = false; panel.classList.add('open'); }
      else { panel.classList.remove('open'); panel.hidden = true; }
    };
    btn.addEventListener('click', () => setOpen(panel.hidden));
    document.addEventListener('click', e => {
      if (!panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('copy-order')) {
      const button = e.target;
      const platform = button.dataset.platform;
      const productTitle = document.querySelector('.checkout .title')?.textContent || 'Product';
      const metal = document.getElementById('metal')?.value || document.querySelector('input[name="material"]')?.value || 'N/A';
      const stone = document.getElementById('stone')?.value || 'N/A';
      const finish = document.querySelector('input[name="finish"]')?.value || document.getElementById('finish')?.value || 'N/A';
      const size = document.getElementById('size')?.value || 'Consultation';
      const qty = document.getElementById('qty')?.value || '1';

      const orderText = `Hello EDELHART, I'm interested in ${productTitle}. Metal: ${metal}, Stone: ${stone}, Finish: ${finish}, Size: ${size}, Quantity: ${qty}. Please provide details and next steps. Shared from ${platform}.`;

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
  });

  /* --- Ready --- */
  async function onReady() {
    ensureNavCurrencySelector();
    rebaseStaticMedia();

    populateAllProducts();
    populateCollectionStrip();
    populateCollectionPageCatalog();
    applyProductDataToPage();
    initRecommended();
    initCatalogCards();
    initAutoStrips();
    initProductGallery();
    await initDynamicRelated();
    initRelatedInnerSliders();
    initFeaturedSlideshow();
    initCollectionStrip();
    initAllProductsSort();
    initFilterToggle();
    initCheckout();
    initCartDrawer();
    eagerizeCriticalImages();
    warmFirstImages();
    prewarmAllProductImages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
    window.addEventListener('load', onReady);
  } else {
    onReady();
  }
})();