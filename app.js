// Header/nav, hero parallax, global slide clock,
// index card sliders (cache + absolute URL handoff),
// product gallery (index->product sync + variant switching + lightbox),
// sticky "Back to catalog" is handled in CSS via position: sticky (place the link above the gallery in your HTML).
(function(){
  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  const heroImg = hero ? hero.querySelector('.hero-bg img') : null;

  const getScrollTop = () => window.pageYOffset || document.documentElement.scrollTop || 0;

  // Keep header height in a CSS var for layout offsets
  function setHeaderVar(){
    const h = header ? header.offsetHeight : 64;
    document.documentElement.style.setProperty('--headerH', h + 'px');
  }
  setHeaderVar();
  addEventListener('resize', setHeaderVar);

  function toggleHeader(){
    if (!header) return;
    header.classList.toggle('is-visible', window.scrollY > 10);
  }
  addEventListener('scroll', toggleHeader, { passive:true });
  toggleHeader();

  // Mobile menu
  (function(){
    const nav = document.querySelector('.menu');
    const btn = document.querySelector('.menu-btn');
    const links = document.querySelector('.menu .links');
    function closeMenu(){ nav && nav.classList.remove('open'); btn && btn.setAttribute('aria-expanded','false'); }
    btn && btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links && links.addEventListener('click', e => { if (e.target.matches('a')) closeMenu(); });
    document.addEventListener('click', e => { if (!nav || !btn) return; if (!nav.contains(e.target) && !btn.contains(e.target)) closeMenu(); });
  })();

  // Smooth in-page anchors
  document.addEventListener('click', function(e){
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + getScrollTop() - (header ? header.offsetHeight : 0) - 12;
    window.scrollTo({ top, behavior:'smooth' });
    history.pushState(null,'','#'+id);
  });

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Hero parallax (gentle)
  if (hero && heroImg){
    let ticking = false;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function computeFitMode(){
      const vw = innerWidth || 1, vh = innerHeight || 1;
      const iw = heroImg.naturalWidth || 2774, ih = heroImg.naturalHeight || 4174;
      const imgHeightAt100vw = vw * (ih/iw);
      const fitWidth = imgHeightAt100vw >= vh;
      hero.classList.toggle('fit-width', fitWidth);
      hero.classList.toggle('fit-height', !fitWidth);
    }
    function update(){
      const vw = innerWidth || 1, vh = innerHeight || 1;
      const iw = heroImg.naturalWidth || 2774, ih = heroImg.naturalHeight || 4174;
      const isFitWidth = hero.classList.contains('fit-width');
      const imgH = isFitWidth ? (vw * (ih/iw)) : vh;
      const heroH = vh;
      const travel = Math.max(imgH - heroH, 0);
      const start = hero.offsetTop;
      const products = document.getElementById('products');
      const end = products ? products.offsetTop : (start + heroH);
      const total = Math.max(end - start, 1);
      const scrolled = Math.min(Math.max(getScrollTop() - start, 0), total);
      const p = Math.min(Math.max(scrolled / total, 0), 1);
      const tiny = (innerWidth||0) <= 360 || (innerHeight||0) <= 600;
      const zoomMax = prefersReduced ? 0 : (tiny ? 0.08 : 0.12);
      hero.style.setProperty('--zoom', (p * zoomMax).toFixed(3));
      hero.style.setProperty('--offset', (-p * (tiny ? travel*0.9 : travel)).toFixed(1) + 'px');
      ticking = false;
    }
    function onScroll(){ if (!ticking){ requestAnimationFrame(update); ticking = true; } }
    function onResize(){ if (!heroImg.complete) return; computeFitMode(); onScroll(); }
    if (heroImg.complete) { computeFitMode(); update(); }
    else heroImg.addEventListener('load', () => { computeFitMode(); update(); });
    addEventListener('scroll', onScroll, { passive:true });
    addEventListener('resize', onResize);
  }

  // ---- Global Slide Clock: keeps all auto-swipers in sync ----
  const SlideClock = (() => {
    const interval = 7000;
    const listeners = new Set();
    let base = performance.now();
    let timer = 0;
    function scheduleNext(){
      const now = performance.now();
      const elapsed = now - base;
      const remainder = interval - (elapsed % interval);
      timer = window.setTimeout(tick, remainder);
    }
    function tick(){ listeners.forEach(fn => { try { fn(); } catch{} }); scheduleNext(); }
    function start(){ if (timer) return; base = performance.now(); scheduleNext(); }
    function stop(){ if (timer){ clearTimeout(timer); timer = 0; } }
    function subscribe(fn){ listeners.add(fn); }
    function unsubscribe(fn){ listeners.delete(fn); }
    return { start, stop, subscribe, unsubscribe, interval };
  })();
  document.addEventListener('visibilitychange', () => { if (document.hidden) SlideClock.stop(); else SlideClock.start(); });

  // ---------- Utilities ----------
  const CACHE_KEY = 'edelhart:images:v5';
  const HANDOFF_KEY = 'edelhart:handoff:v2';

  function readImageCache(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || ''); } catch { return null; }
  }
  function writeImageCache(items){
    const payload = { ts: Date.now(), items };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch {}
    return payload;
  }
  function readHandoff(){
    try { return JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || ''); } catch { return null; }
  }
  function writeHandoff(slug, imagesAbs){
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ slug, images: imagesAbs, ts: Date.now() })); } catch {}
  }
  function clearHandoff(){
    try { sessionStorage.removeItem(HANDOFF_KEY); } catch {}
  }
  function slugFromPath(p){
    if (!p) return '';
    const segs = p.split('/').filter(Boolean);
    const last = segs[segs.length-1] || '';
    return last.replace(/\.html?$/i,'');
  }
  function listFromCSV(csv){ return (csv || '').split(',').map(s=>s.trim()).filter(Boolean); }
  function toAbsList(list, baseUrl){
    return list.map(src => {
      try { return new URL(src, baseUrl).href; } catch { return src; }
    });
  }

  async function fetchIndexHTMLWithUrl(){
    // Try multiple candidates, return both html and the url it was fetched from (for base resolution)
    const candidates = [
      new URL('../index.html', location.href).href,
      new URL('../../index.html', location.href).href,
      new URL('./index.html', location.href).href,
      new URL('/index.html', location.origin).href
    ];
    const hdr = document.querySelector('a[href*="index.html"]') || document.querySelector('a.brand');
    if (hdr){
      try {
        const u = new URL(hdr.getAttribute('href') || '', location.href);
        u.hash = '';
        if (!/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/?$/, '/') + 'index.html';
        candidates.unshift(u.href);
      } catch {}
    }
    for (const url of candidates){
      try {
        const res = await fetch(url, { cache:'no-store', mode:'same-origin' });
        if (res.ok){
          const html = await res.text();
          return { html, url };
        }
      } catch {}
    }
    return { html:'', url: location.href };
  }

  // ---------- Index cards (build sliders + cache + absolute URL handoff) ----------
  function initCatalogCards(){
    const cards = document.querySelectorAll('.catalog .card');
    if (!cards.length) { SlideClock.start(); return; }

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = ('IntersectionObserver' in window)
        ? new IntersectionObserver((entries)=>{
          entries.forEach(entry => {
            const media = entry.target;
            const api = media.__api;
            if (!api) return;
            api.inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            api.updateSubscription();
          });
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] })
        : null;

    const imagesMap = {};

    cards.forEach(card => {
      const media = card.querySelector('.media');
      const viewUrl = card.getAttribute('data-view') || '#';
      const title = card.querySelector('.title')?.textContent || 'product';
      const slug = slugFromPath(viewUrl);

      const listRaw = media ? listFromCSV(media.getAttribute('data-images')) : [];
      const listAbs = toAbsList(listRaw, location.href);

      if (slug && listAbs.length) imagesMap[slug] = { images: listAbs };

      // Hand off the absolute list before navigating
      const navigateTo = () => { if (viewUrl && viewUrl !== '#') window.location.href = viewUrl; };

      // Capture anchor clicks inside the card first
      card.querySelectorAll('a[href]').forEach(a=>{
        a.addEventListener('click', () => {
          if (slug && listAbs.length) writeHandoff(slug, listAbs);
        }, { capture:true });
      });

      // Make whole card clickable (except controls)
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('.slider-btn') || t.closest('.dot') || t.closest('.btn') || t.closest('a')) return;
        if (slug && listAbs.length) writeHandoff(slug, listAbs);
        navigateTo();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (slug && listAbs.length) writeHandoff(slug, listAbs);
          navigateTo();
        }
      });
      card.tabIndex = 0; card.setAttribute('role','link'); card.setAttribute('aria-label', `Open ${title}`);

      if (!media || !listAbs.length) return;

      // Slider UI in cards
      const slidesWrap = document.createElement('div');
      slidesWrap.className = 'slides';
      listAbs.forEach(src => {
        const slide = document.createElement('div'); slide.className = 'slide';
        const img = document.createElement('img'); img.src = src; img.alt = title; img.loading='lazy';
        slide.appendChild(img); slidesWrap.appendChild(slide);
      });
      media.innerHTML = ''; media.appendChild(slidesWrap);

      const dots = document.createElement('div'); dots.className = 'dots';
      listAbs.forEach((_, i) => {
        const d = document.createElement('div'); d.className = 'dot' + (i===0?' active':''); d.dataset.index=String(i);
        dots.appendChild(d);
      });
      media.appendChild(dots);

      const prev = document.createElement('button');
      prev.className='slider-btn slider-prev'; prev.type='button'; prev.setAttribute('aria-label','Previous image'); prev.innerHTML='&#10094;';
      const next = document.createElement('button');
      next.className='slider-btn slider-next'; next.type='button'; next.setAttribute('aria-label','Next image'); next.innerHTML='&#10095;';
      media.appendChild(prev); media.appendChild(next);

      let idx=0; const total=listAbs.length;
      function render(){
        slidesWrap.style.transform = `translateX(${idx * -100}%)`;
        Array.from(dots.children).forEach((el,i)=>el.classList.toggle('active', i===idx));
      }
      function go(n){ idx = (n + total) % total; render(); }
      const stopNav = e => e.stopPropagation();
      prev.addEventListener('click', e=>{ stopNav(e); go(idx-1); });
      next.addEventListener('click', e=>{ stopNav(e); go(idx+1); });
      dots.addEventListener('click', e=>{
        const t=e.target; if (!(t instanceof HTMLElement)) return;
        if (t.classList.contains('dot')){ stopNav(e); go(Number(t.dataset.index||0)); }
      });

      const api = {
        paused:false, inView:true, subscribed:false,
        subscribe(){ if (!this.subscribed){ SlideClock.subscribe(tick); this.subscribed = true; } },
        unsubscribe(){ if (this.subscribed){ SlideClock.unsubscribe(tick); this.subscribed = false; } },
        updateSubscription(){
          if (prefersReduced || total<=1){ this.unsubscribe(); return; }
          if (!this.paused && this.inView) this.subscribe(); else this.unsubscribe();
        }
      };
      const tick = () => { if (total>1) go(idx+1); };
      media.__api = api;

      media.addEventListener('mouseenter', ()=>{ api.paused = true; api.updateSubscription(); });
      media.addEventListener('mouseleave', ()=>{ api.paused = false; api.updateSubscription(); });
      media.addEventListener('touchstart', ()=>{ api.paused = true; api.updateSubscription(); }, { passive:true });
      media.addEventListener('touchend', ()=>{ api.paused = false; api.updateSubscription(); });

      // Swipe
      let startX=0, dist=0, dragging=false;
      function onStart(e){ dragging=true; startX=('touches'in e)? e.touches[0].clientX : e.clientX; dist=0; api.paused=true; api.updateSubscription(); }
      function onMove(e){ if (!dragging) return; const x=('touches'in e)? e.touches[0].clientX : e.clientX; dist = x - startX; }
      function onEnd(e){ if (!dragging) return; dragging=false; if (Math.abs(dist)>40){ if (dist<0) go(idx+1); else go(idx-1); } e && e.stopPropagation(); api.paused=false; api.updateSubscription(); }
      media.addEventListener('mousedown', onStart); addEventListener('mousemove', onMove); addEventListener('mouseup', onEnd);
      media.addEventListener('touchstart', onStart, { passive:true }); media.addEventListener('touchmove', onMove, { passive:true }); media.addEventListener('touchend', onEnd);

      if (io) io.observe(media);
      render();
    });

    // Persist cache (useful for direct product landings)
    if (Object.keys(imagesMap).length){
      const current = readImageCache();
      const merged = { ...(current?.items||{}), ...imagesMap };
      writeImageCache(merged);
    }
    SlideClock.start();
  }

  // Auto-swiping strips (On‑Body & Related)
  function initAutoStrips(){
    const tracks = document.querySelectorAll('.featured-track[data-auto="true"], .related-track[data-auto="true"]');
    tracks.forEach(track => {
      const slides = track.querySelectorAll('.feat-slide, .related-card');
      if (!slides.length) return;
      let idx = 0;
      const isFeatured = track.classList.contains('featured-track');
      const advance = () => {
        idx = (idx + 1) % slides.length;
        if (isFeatured){
          track.style.transform = `translateX(${idx * -100}%)`;
        } else {
          const card = slides[0];
          const cardW = (card.getBoundingClientRect().width || 0) + 12;
          track.style.transform = `translateX(${idx * -cardW}px)`;
          if (idx === slides.length - 1){
            setTimeout(()=>{ track.style.transition='none'; track.style.transform='translateX(0)'; idx=0; requestAnimationFrame(()=>{ track.offsetHeight; track.style.transition='transform .6s cubic-bezier(.5,1,.5,1)'; }); }, SlideClock.interval * 0.6);
          }
        }
      };
      const tick = () => advance();
      let inView = true;
      const io = ('IntersectionObserver' in window)
          ? new IntersectionObserver((entries)=>{
            entries.forEach(entry => { inView = entry.isIntersecting && entry.intersectionRatio>=0.4; });
          }, { threshold:[0, .4, 1] })
          : null;
      if (io) io.observe(track);
      const sub = () => { if (inView) SlideClock.subscribe(tick); };
      const unsub = () => SlideClock.unsubscribe(tick);
      sub(); addEventListener('beforeunload', unsub);
    });
  }

  // ---------- Product gallery (sync + variants + lightbox) ----------
  async function initProductGallery(){
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;

    const slidesWrap = gallery.querySelector('.slides');
    const dots = gallery.querySelector('.thumbs');
    const prev = gallery.querySelector('.slider-prev');
    const next = gallery.querySelector('.slider-next');

    const thisSlug = slugFromPath(location.pathname);

    async function ensureImagesMap(){
      // 1) Try cache
      const cached = readImageCache()?.items || null;
      if (cached && Object.keys(cached).length) return cached;

      // 2) If file:// protocol, cannot fetch — return empty to force inline fallback
      if (location.protocol === 'file:') return {};

      // 3) Fetch index.html and resolve image paths against that index URL
      const { html, url: indexUrl } = await fetchIndexHTMLWithUrl();
      if (!html) return {};
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = doc.querySelectorAll('.catalog .card');
      const map = {};
      cards.forEach(card=>{
        const vu = card.getAttribute('data-view') || '';
        const slug = slugFromPath(vu);
        const imagesRaw = listFromCSV(card.querySelector('.media')?.getAttribute('data-images'));
        const imagesAbs = toAbsList(imagesRaw, indexUrl);
        if (slug && imagesAbs.length) map[slug] = { images: imagesAbs };
      });
      if (Object.keys(map).length) writeImageCache(map);
      return map;
    }

    // Variant helpers (stay within collection)
    function metalToSlug(val){
      const s = (val || '').toLowerCase().trim();
      if (s.includes('black')) return 'black-rhodium';
      if (s.includes('18k')) return 'gold-18k';
      if (s.includes('14k')) return 'gold-14k';
      if (s.includes('gold')) return 'gold';
      if (s.includes('silver')) return 'silver';
      return s.replace(/[^a-z0-9]+/g,'-');
    }
    function baseFromSlug(slug){
      return slug.replace(/-(gold-18k|gold-14k|black-rhodium|gold|silver)$/,'');
    }
    function variantSlug(currentSlug, metalSlug){
      const base = baseFromSlug(currentSlug);
      return metalSlug ? `${base}-${metalSlug}` : currentSlug;
    }

    // Build / rebuild UI from image list
    let strip, row, sPrev, sNext;
    function ensureThumbStrip(list){
      if (!strip){
        strip = document.createElement('div');
        strip.className = 'thumb-strip';
        strip.innerHTML = `
          <button class="strip-btn strip-prev" aria-label="Scroll thumbnails left">‹</button>
          <div class="thumb-row" role="tablist"></div>
          <button class="strip-btn strip-next" aria-label="Scroll thumbnails right">›</button>
        `;
        gallery.insertAdjacentElement('afterend', strip);
      }
      row = strip.querySelector('.thumb-row');
      row.innerHTML = '';
      list.forEach((src, i)=>{
        const b = document.createElement('button');
        b.type='button'; b.className='thumb-item'+(i===0?' active':''); b.dataset.index=String(i);
        b.setAttribute('role','tab'); b.setAttribute('aria-selected', i===0?'true':'false');
        b.innerHTML = `<img src="${src}" alt="Preview ${i+1}">`;
        row.appendChild(b);
      });
      sPrev = strip.querySelector('.strip-prev');
      sNext = strip.querySelector('.strip-next');
      const scrollBy = (dir)=>{
        const first = row.querySelector('.thumb-item');
        const w = first ? first.getBoundingClientRect().width + 8 : 88;
        row.scrollBy({ left: dir * (w * 4), behavior:'smooth' });
      };
      sPrev.onclick = ()=> scrollBy(-1);
      sNext.onclick = ()=> scrollBy(1);
      row.onclick = (e)=>{
        const btn = e.target.closest('.thumb-item'); if (!btn) return;
        go(Number(btn.dataset.index||0));
      };
      function updateArrows(){
        const overflow = row.scrollWidth > row.clientWidth + 2;
        sPrev.classList.toggle('hidden', !overflow);
        sNext.classList.toggle('hidden', !overflow);
      }
      row.addEventListener('scroll', updateArrows, { passive:true });
      addEventListener('resize', updateArrows);
      setTimeout(updateArrows, 150);
    }

    let idx=0, total=0;
    function setActive(){
      if (dots) Array.from(dots.children).forEach((el,i)=>el.classList.toggle('active', i===idx));
      if (row){
        Array.from(row.children).forEach((el,i)=>{
          el.classList.toggle('active', i===idx);
          el.setAttribute('aria-selected', i===idx?'true':'false');
        });
        const active = row.children[idx];
        active && active.scrollIntoView({ inline:'nearest', block:'nearest', behavior:'smooth' });
      }
    }
    function render(){ slidesWrap.style.transform = `translateX(${idx * -100}%)`; setActive(); }
    function go(n){ idx = (n + total) % total; render(); }

    // Lightbox
    function openLightbox(list, startIndex){
      let lb = document.querySelector('.lightbox');
      if (!lb){
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
      function show(){ imgEl.src = list[i]; imgEl.alt = `Image ${i+1} of ${list.length}`; }
      function prevImg(){ i = (i - 1 + list.length) % list.length; show(); }
      function nextImg(){ i = (i + 1) % list.length; show(); }
      function close(){ lb.classList.remove('open'); document.body.style.overflow=''; cleanup(); }
      function onKey(e){ if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') prevImg(); else if (e.key === 'ArrowRight') nextImg(); }
      function cleanup(){ document.removeEventListener('keydown', onKey); }
      btnPrev.onclick = prevImg;
      btnNext.onclick = nextImg;
      btnClose.onclick = close;
      lb.onclick = (e)=>{ if (e.target === lb) close(); };
      document.addEventListener('keydown', onKey);
      document.body.style.overflow='hidden';
      lb.classList.add('open'); show();
    }

    function buildFromImages(listAbs){
      slidesWrap.innerHTML = '';
      listAbs.forEach((src, i)=>{
        const slide=document.createElement('div'); slide.className='slide';
        const img=document.createElement('img'); img.src=src; img.alt=`Product image ${i+1}`; img.decoding='async'; img.loading='lazy';
        slide.appendChild(img); slidesWrap.appendChild(slide);
      });
      if (dots){
        dots.innerHTML = '';
        listAbs.forEach((_,i)=>{
          const d=document.createElement('div'); d.className='thumb'+(i===0?' active':''); d.dataset.index=String(i);
          dots.appendChild(d);
        });
        dots.addEventListener('click', (e)=>{
          const t=e.target; if (!(t instanceof HTMLElement)) return;
          if (t.classList.contains('thumb')) go(Number(t.dataset.index||0));
        });
      }
      ensureThumbStrip(listAbs);
      slidesWrap.querySelectorAll('img').forEach((img, i)=>{
        img.addEventListener('click', ()=> openLightbox(listAbs, i));
      });
      idx=0; total=listAbs.length;
      render(); updateClockSub();
    }

    prev && prev.addEventListener('click', ()=>go(idx-1));
    next && next.addEventListener('click', ()=>go(idx+1));

    // Swipe + pause/visibility
    let startX=0, dist=0, dragging=false, paused=false, inView=true;
    function onStart(e){ dragging=true; startX=('touches'in e)? e.touches[0].clientX : e.clientX; dist=0; paused=true; updateClockSub(); }
    function onMove(e){ if (!dragging) return; const x=('touches'in e)? e.touches[0].clientX : e.clientX; dist = x - startX; }
    function onEnd(){ if (!dragging) return; dragging=false; if (Math.abs(dist)>40){ if (dist<0) go(idx+1); else go(idx-1); } paused=false; updateClockSub(); }
    slidesWrap.addEventListener('mousedown', onStart); addEventListener('mousemove', onMove); addEventListener('mouseup', onEnd);
    slidesWrap.addEventListener('touchstart', onStart, { passive:true }); slidesWrap.addEventListener('touchmove', onMove, { passive:true }); slidesWrap.addEventListener('touchend', onEnd);
    gallery.addEventListener('mouseenter', ()=>{ paused=true; updateClockSub(); });
    gallery.addEventListener('mouseleave', ()=>{ paused=false; updateClockSub(); });

    const io = ('IntersectionObserver' in window)
        ? new IntersectionObserver((entries)=>{
          entries.forEach(entry => { inView = entry.isIntersecting && entry.intersectionRatio>=0.5; updateClockSub(); });
        }, { threshold:[0,.5,1] })
        : null;
    if (io) io.observe(gallery);

    const tick = () => { if (total>1 && !paused && inView) go(idx+1); };
    function updateClockSub(){ SlideClock.unsubscribe(tick); if (!paused && inView && total>1) SlideClock.subscribe(tick); }

    // Prefer click handoff (absolute URLs), then cache, then inline fallback (resolved absolute)
    const hand = readHandoff();
    let imagesMap = await ensureImagesMap(); // may be empty

    let initial = null;
    if (hand && (hand.slug === thisSlug || baseFromSlug(hand.slug) === baseFromSlug(thisSlug))){
      initial = Array.isArray(hand.images) ? hand.images : [];
      // Merge handoff into cache/map for variant lookups
      const merged = { ...(imagesMap||{}) };
      if (initial.length){
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
    // Inline fallback if still nothing: resolve relative to current page
    if (!initial || !initial.length){
      const inlineRaw = listFromCSV(gallery.getAttribute('data-images'));
      initial = toAbsList(inlineRaw, location.href);
    }

    if (initial && initial.length) buildFromImages(initial);

    // Variant switching within same collection (use index map first, then inline variant attrs)
    const metalSelect = document.getElementById('metal');
    if (metalSelect){
      metalSelect.addEventListener('change', ()=>{
        const mSlug = metalToSlug(metalSelect.value);
        const altSlug = variantSlug(thisSlug, mSlug);
        const fromIndex = imagesMap?.[altSlug]?.images || null;
        if (fromIndex && fromIndex.length){ buildFromImages(fromIndex); return; }
        const attr = `data-variant-metal-${mSlug}`;
        const raw = gallery.getAttribute(attr);
        const listAbs = toAbsList(listFromCSV(raw), location.href);
        if (listAbs.length){ buildFromImages(listAbs); }
      });
    }

    SlideClock.start();
  }

  // Checkout → WhatsApp
  function initCheckout(){
    const form = document.querySelector('.checkout form');
    if (!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = new FormData(form);
      const product = form.getAttribute('data-product') || document.title.replace(/ · .*$/, '');
      const size = data.get('size') || 'N/A';
      const metal = data.get('metal') || 'N/A';
      const qty = data.get('qty') || 1;
      const msg = `Hello EDELHART,%0A%0AI'd like to order:%0A- Product: ${encodeURIComponent(product)}%0A- Metal: ${encodeURIComponent(metal)}%0A- Size: ${encodeURIComponent(size)}%0A- Quantity: ${encodeURIComponent(qty)}%0A%0APlease confirm availability and lead time.`;
      const phone = '84944445084';
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
    });
  }

  function onReady(){
    initCatalogCards();   // builds index sliders + writes image cache + sets click handoff (absolute URLs)
    initAutoStrips();     // on-body and related
    initProductGallery(); // prefers handoff/cache; resolves all images to absolute
    initCheckout();       // WhatsApp flow
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();