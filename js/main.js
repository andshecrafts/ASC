/* ===================================================================
   And She Crafts — shared site JS
   Sections: nav toggle, reveal-on-scroll, service configurator,
   quote builder (persisted via localStorage across pages),
   story galleries, inquiry form, lightbox.
=================================================================== */

/* ---------- Quote Builder core (namespaced, no globals leak) ---------- */
const ASCQuote = (function () {
  const STORAGE_KEY = 'asc_quote_v1';

  function getQuote() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveQuote(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadges();
  }
  function addToQuote(item) {
    const items = getQuote();
    items.push(item);
    saveQuote(items);
  }
  function removeFromQuote(index) {
    const items = getQuote();
    items.splice(index, 1);
    saveQuote(items);
  }
  function updateQuoteItem(index, changes) {
    const items = getQuote();
    if (!items[index]) return;
    items[index] = Object.assign({}, items[index], changes);
    saveQuote(items);
  }
  function parsePrice(priceStr) {
    const match = (priceStr || '').match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, ''), 10) : null;
  }
  function estimateTotal(items) {
    let total = 0, hasUnknown = false;
    items.forEach(item => {
      if (item.priceValue === null || item.priceValue === undefined) { hasUnknown = true; return; }
      total += item.priceValue * (item.hasQty ? (item.qty || 1) : 1);
    });
    return { total, hasUnknown };
  }
  function updateBadges() {
    const count = getQuote().length;
    document.querySelectorAll('.quote-badge').forEach(b => { b.textContent = count; });
  }

  return { getQuote, saveQuote, addToQuote, removeFromQuote, updateQuoteItem, parsePrice, estimateTotal, updateBadges };
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Header nav (mobile toggle) ---------- */
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  if (navToggle && navList) {
    navToggle.addEventListener('click', () => navList.classList.toggle('open'));
    navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navList.classList.remove('open')));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- Service cards: open package configurator below the row ---------- */
  document.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('click', () => {
      const row = card.closest('.svc-row');
      const panel = row.nextElementSibling; // .svc-detail-panel right after the row

      const alreadyActive = card.classList.contains('active');
      row.querySelectorAll('.svc-card').forEach(c => c.classList.remove('active'));

      if (alreadyActive) {
        panel.classList.remove('open');
        return;
      }

      card.classList.add('active');
      const packages = JSON.parse(card.dataset.packages);
      panel.dataset.serviceName = card.dataset.name;
      panel.dataset.packagesJson = card.dataset.packages;
      panel.querySelector('.d-name').textContent = card.dataset.name;
      panel.querySelector('.d-overview').textContent = card.dataset.overview;
      panel.querySelector('.d-perfect').textContent = card.dataset.perfect;

      const tabsEl = panel.querySelector('.pkg-tabs');
      tabsEl.innerHTML = '';
      packages.forEach((pkg, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'pkg-tab' + (i === 0 ? ' active' : '');
        tab.textContent = pkg.name;
        tab.addEventListener('click', () => selectPackage(panel, packages, i));
        tabsEl.appendChild(tab);
      });

      selectPackage(panel, packages, 0);

      const qtyInput = panel.querySelector('.qty-stepper input');
      if (qtyInput) qtyInput.value = 1;

      panel.classList.add('open');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  function selectPackage(panel, packages, index) {
    const pkg = packages[index];
    panel.dataset.selectedIndex = index;
    panel.querySelectorAll('.pkg-tab').forEach((t, i) => t.classList.toggle('active', i === index));
    panel.querySelector('.d-img').src = pkg.img;
    panel.querySelector('.d-img').alt = pkg.name;
    panel.querySelector('.pkg-price').textContent = pkg.price;
    const includesEl = panel.querySelector('.pkg-includes');
    includesEl.innerHTML = pkg.includes.map(i => `<li>${i}</li>`).join('');
  }

  /* ---------- Quantity stepper (inside expanded panel, before adding) ---------- */
  document.querySelectorAll('.qty-stepper').forEach(stepper => {
    const input = stepper.querySelector('input');
    stepper.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        let val = parseInt(input.value) || 1;
        val = btn.dataset.act === 'inc' ? val + 1 : Math.max(1, val - 1);
        input.value = val;
      });
    });
  });

  /* ---------- Add to My Quote ---------- */
  document.querySelectorAll('.add-to-quote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.svc-detail-panel');
      const packages = JSON.parse(panel.dataset.packagesJson);
      const selectedIndex = parseInt(panel.dataset.selectedIndex || '0', 10);
      const pkg = packages[selectedIndex];
      const hasQty = panel.dataset.hasQty === 'true';
      let qty = 1;
      if (hasQty) {
        const qtyInput = panel.querySelector('.qty-stepper input');
        if (qtyInput) qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      }
      const category = panel.closest('.category-block').querySelector('h2').textContent.trim();

      ASCQuote.addToQuote({
        name: panel.dataset.serviceName,
        category: category,
        package: pkg.name,
        packages: packages.map(p => p.name),
        priceDisplay: pkg.price,
        priceValue: ASCQuote.parsePrice(pkg.price),
        img: pkg.img,
        hasQty: hasQty,
        qty: qty
      });

      showToast(`✓ ${pkg.name} ${panel.dataset.serviceName} added to your quote.`);
    });
  });

  /* ---------- Toast ---------- */
  function showToast(message) {
    let toast = document.getElementById('quoteToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'quoteToast';
      toast.className = 'quote-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  /* ---------- Quote drawer (open/close, render, edit) ---------- */
  function renderDrawer() {
    const body = document.querySelector('.quote-drawer-body');
    const footTotal = document.querySelector('.qd-total-value');
    if (!body) return;

    const items = ASCQuote.getQuote();
    if (!items.length) {
      body.innerHTML = '<p class="quote-empty">Your quote is empty. Browse our services and add anything that catches your eye.</p>';
      if (footTotal) footTotal.textContent = '₱0';
      return;
    }

    body.innerHTML = items.map((item, i) => {
      const qtyHtml = item.hasQty ? `
        <div class="qty-stepper" style="margin-top:6px;">
          <button type="button" data-act="dec" data-i="${i}">−</button>
          <input type="number" min="1" value="${item.qty || 1}" data-i="${i}" class="dl-qty-input">
          <button type="button" data-act="inc" data-i="${i}">+</button>
        </div>` : '';
      const pkgOptions = (item.packages || []).map(p => `<option value="${p}" ${p === item.package ? 'selected' : ''}>${p}</option>`).join('');
      const pkgHtml = pkgOptions
        ? `<select class="dl-pkg-select" data-i="${i}">${pkgOptions}</select>`
        : '';
      return `
        <div class="quote-line">
          <img src="${item.img}" alt="${item.name}">
          <div>
            <div class="q-cat">${item.category || ''}</div>
            <h4>${item.name}</h4>
            ${pkgHtml}
            <div class="q-row">
              <span class="q-price">${item.priceDisplay}${item.hasQty ? ` × ${item.qty || 1}` : ''}</span>
              <button type="button" class="q-remove" data-i="${i}">Remove</button>
            </div>
            ${qtyHtml}
          </div>
        </div>`;
    }).join('');

    const { total, hasUnknown } = ASCQuote.estimateTotal(items);
    if (footTotal) footTotal.textContent = total ? `₱${total.toLocaleString()}${hasUnknown ? ' +' : ''}` : '₱0';

    body.querySelectorAll('.q-remove').forEach(b => b.addEventListener('click', () => {
      ASCQuote.removeFromQuote(parseInt(b.dataset.i, 10));
      renderDrawer();
    }));
    body.querySelectorAll('.dl-qty-input').forEach(inp => inp.addEventListener('change', () => {
      const val = Math.max(1, parseInt(inp.value, 10) || 1);
      ASCQuote.updateQuoteItem(parseInt(inp.dataset.i, 10), { qty: val });
      renderDrawer();
    }));
    body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const items2 = ASCQuote.getQuote();
      const i = parseInt(b.dataset.i, 10);
      const cur = items2[i].qty || 1;
      const next = b.dataset.act === 'inc' ? cur + 1 : Math.max(1, cur - 1);
      ASCQuote.updateQuoteItem(i, { qty: next });
      renderDrawer();
    }));
    body.querySelectorAll('.dl-pkg-select').forEach(sel => sel.addEventListener('change', () => {
      ASCQuote.updateQuoteItem(parseInt(sel.dataset.i, 10), { package: sel.value });
      renderDrawer();
    }));
  }

  function openDrawer() {
    const overlay = document.getElementById('quoteDrawerOverlay');
    if (overlay) { renderDrawer(); overlay.classList.add('open'); }
  }
  function closeDrawer() {
    const overlay = document.getElementById('quoteDrawerOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  document.querySelectorAll('.quote-nav-btn, .quote-fab').forEach(btn => btn.addEventListener('click', openDrawer));
  const drawerOverlay = document.getElementById('quoteDrawerOverlay');
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', (e) => { if (e.target === drawerOverlay) closeDrawer(); });
    const closeBtn = drawerOverlay.querySelector('.quote-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  }

  ASCQuote.updateBadges();

  /* ---------- "Your Quote" review section (Let's Talk page) ---------- */
  const reviewSection = document.getElementById('quoteReviewSection');
  if (reviewSection) {
    const items = ASCQuote.getQuote();
    if (items.length) {
      reviewSection.style.display = '';
      const list = document.getElementById('quoteReviewList');
      list.innerHTML = items.map(item => `
        <li style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(63,58,54,0.08);font-size:0.9rem;">
          <span>${item.name} — <span style="color:#8a8580;">${item.package}</span>${item.hasQty ? ` × ${item.qty || 1}` : ''}</span>
          <span style="color:var(--rose-deep);font-weight:600;white-space:nowrap;">${item.priceDisplay}</span>
        </li>`).join('');
      const { total, hasUnknown } = ASCQuote.estimateTotal(items);
      const totalEl = document.getElementById('quoteReviewTotal');
      if (totalEl) totalEl.textContent = total ? `₱${total.toLocaleString()}${hasUnknown ? ' +' : ''}` : '₱0';
    } else {
      reviewSection.style.display = 'none';
    }
  }

  /* ---------- Story galleries: slideshow with prev/next + auto-rotate ---------- */
  document.querySelectorAll('.story-slideshow').forEach(slideshow => {
    const imgs = slideshow.querySelectorAll('img');
    if (!imgs.length) return;
    let idx = 0;
    imgs[0].classList.add('active');

    function show(newIdx) {
      imgs[idx].classList.remove('active');
      idx = (newIdx + imgs.length) % imgs.length;
      imgs[idx].classList.add('active');
    }

    let timer = setInterval(() => show(idx + 1), 5000);
    function resetTimer() { clearInterval(timer); timer = setInterval(() => show(idx + 1), 5000); }

    const prevBtn = slideshow.querySelector('.slide-arrow.prev');
    const nextBtn = slideshow.querySelector('.slide-arrow.next');
    if (prevBtn) prevBtn.addEventListener('click', () => { show(idx - 1); resetTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { show(idx + 1); resetTimer(); });
  });

  /* ---------- Thumbnail lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    document.querySelectorAll('.story-thumbs img, .story-slideshow img').forEach(img => {
      img.addEventListener('click', () => {
        lightbox.querySelector('img').src = img.src;
        lightbox.querySelector('img').alt = img.alt;
        lightbox.classList.add('open');
      });
    });
    lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
  }

  /* ---------- Inquiry form: compose email, include quote items ---------- */
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = inquiryForm;
      const fileInput = f.themefiles;
      let fileNote = 'None attached';
      if (fileInput && fileInput.files.length) {
        const names = Array.from(fileInput.files).map(file => file.name);
        fileNote = `${names.join(', ')} — please re-attach these to your email, or send them to us on Facebook Messenger, since this form can't carry file attachments automatically.`;
      }

      const lines = [
        `Name: ${f.name.value}`,
        `Email: ${f.email.value}`,
        `Contact Number: ${f.contact.value}`,
        `Occasion: ${f.occasion.value}`,
        `Event Date: ${f.eventdate.value}`,
        `Venue / Location: ${f.venue.value}`,
        `Estimated Guest Count: ${f.guests.value}`,
        `Services Interested In: ${f.services.value}`,
        `Theme / Inspiration (notes): ${f.theme.value}`,
        `Theme / Inspiration Photos: ${fileNote}`,
        `Preferred Budget: ${f.budget.value}`,
        `Other Requests: ${f.requests.value}`,
      ];

      const quoteItems = ASCQuote.getQuote();
      if (quoteItems.length) {
        lines.push('', '--- Selected from My Quote ---');
        quoteItems.forEach(item => {
          lines.push(`${item.name} — ${item.package}${item.hasQty ? ` × ${item.qty || 1}` : ''} (${item.priceDisplay})`);
        });
        const { total, hasUnknown } = ASCQuote.estimateTotal(quoteItems);
        lines.push(`Estimated Starting Total: ₱${total.toLocaleString()}${hasUnknown ? ' +' : ''}`);
      }

      const body = encodeURIComponent(lines.join('\n'));
      const subject = encodeURIComponent(`Inquiry from ${f.name.value || 'Website Visitor'}`);
      window.location.href = `mailto:andshecraftsph@gmail.com?subject=${subject}&body=${body}`;
    });
  }
});
