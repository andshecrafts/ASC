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
  document.querySelectorAll('.svc-detail-panel').forEach(panel => {
    panel.dataset.baseHasQty = panel.dataset.hasQty || 'false';
  });
  document.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('click', () => {
      const row = card.closest('.svc-row');
      const categoryBlock = card.closest('.category-block');
      // Look up the panel by category, not by DOM position — its position moves (see below),
      // so row.nextElementSibling can't be trusted after the first interaction.
      const panel = categoryBlock.querySelector('.svc-detail-panel');

      const alreadyActive = card.classList.contains('active');
      row.querySelectorAll('.svc-card').forEach(c => c.classList.remove('active'));

      if (alreadyActive) {
        panel.classList.remove('open');
        return;
      }

      card.classList.add('active');

      // On phones/tablets, cards stack in one column, so a panel placed after the whole
      // row can end up far below the card that was actually clicked. Move it to sit right
      // after that card instead. On desktop, keep it below the full row as before.
      const isNarrowScreen = window.matchMedia('(max-width: 900px)').matches;
      if (isNarrowScreen) {
        card.insertAdjacentElement('afterend', panel);
      } else {
        row.insertAdjacentElement('afterend', panel);
      }

      panel.dataset.serviceName = card.dataset.name;
      panel.dataset.hasQty = card.dataset.hasQty !== undefined
        ? (card.dataset.hasQty === 'true' ? 'true' : 'false')
        : panel.dataset.baseHasQty;

      const stepperWrap = panel.querySelector('.qty-stepper');
      if (stepperWrap) stepperWrap.style.display = panel.dataset.hasQty === 'true' ? '' : 'none';

      panel.querySelector('.d-name').textContent = card.dataset.name;
      panel.querySelector('.d-overview').textContent = card.dataset.overview;
      panel.querySelector('.d-perfect').textContent = card.dataset.perfect;

      const addonField = panel.querySelector('.d-addon-field');
      if (card.dataset.addons) {
        const addons = JSON.parse(card.dataset.addons);
        panel.querySelector('.d-addons').innerHTML = addons.map(a => `<li>${a}</li>`).join('');
        addonField.style.display = '';
      } else {
        addonField.style.display = 'none';
      }

      const noteField = panel.querySelector('.d-note-field');
      if (card.dataset.note) {
        panel.querySelector('.d-note').textContent = card.dataset.note;
        noteField.style.display = '';
      } else {
        noteField.style.display = 'none';
      }

      const tabsEl = panel.querySelector('.pkg-tabs');
      const variantEl = panel.querySelector('.variant-groups');

      if (card.dataset.variantAxes) {
        // Multi-axis picker (e.g. Ref Magnets: size × thickness × packaging)
        panel.dataset.mode = 'variant';
        tabsEl.style.display = 'none';
        tabsEl.innerHTML = '';
        panel.querySelector('.d-img').src = card.dataset.img || card.querySelector('img').src;
        panel.querySelector('.d-img').alt = card.dataset.name;
        const axes = JSON.parse(card.dataset.variantAxes);
        const matrix = JSON.parse(card.dataset.variantMatrix);
        renderVariantGroups(panel, variantEl, axes, matrix);
      } else {
        panel.dataset.mode = 'packages';
        variantEl.style.display = 'none';
        variantEl.innerHTML = '';
        tabsEl.style.display = '';
        const packages = JSON.parse(card.dataset.packages);
        panel.dataset.packagesJson = card.dataset.packages;
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
      }

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
    const priceEl = panel.querySelector('.pkg-price');
    priceEl.classList.remove('unavailable');
    priceEl.textContent = pkg.price;
    const includesEl = panel.querySelector('.pkg-includes');
    includesEl.innerHTML = pkg.includes.map(i => `<li>${i}</li>`).join('');
    const addBtn = panel.querySelector('.add-to-quote-btn');
    if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Add to My Quote'; }
  }

  function renderVariantGroups(panel, container, axes, matrix) {
    container.innerHTML = '';
    container.style.display = '';
    const selection = {};
    axes.forEach(axis => { selection[axis.key] = axis.options[0].value; });

    function renderPricing() {
      const key = axes.map(a => selection[a.key]).join('|');
      const entry = matrix[key];
      panel._variantEntry = entry;
      panel._variantLabel = axes.map(a => {
        const opt = a.options.find(o => o.value === selection[a.key]);
        return opt ? opt.label : selection[a.key];
      }).join(' · ');
      const addBtn = panel.querySelector('.add-to-quote-btn');
      const priceEl = panel.querySelector('.pkg-price');
      const includesEl = panel.querySelector('.pkg-includes');
      if (entry) {
        priceEl.classList.remove('unavailable');
        priceEl.textContent = entry.price;
        includesEl.innerHTML = entry.includes.map(i => `<li>${i}</li>`).join('');
        if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Add to My Quote'; }
      } else {
        priceEl.classList.add('unavailable');
        priceEl.textContent = 'This combination isn\u2019t available — please choose a different one.';
        includesEl.innerHTML = '';
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Not Available'; }
      }
    }

    axes.forEach(axis => {
      const group = document.createElement('div');
      group.className = 'variant-axis';
      const label = document.createElement('div');
      label.className = 'variant-axis-label';
      label.textContent = axis.label;
      group.appendChild(label);
      const pillRow = document.createElement('div');
      pillRow.className = 'pkg-tabs variant-pill-row';
      axis.options.forEach((opt, i) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'pkg-tab' + (i === 0 ? ' active' : '');
        pill.textContent = opt.label;
        pill.addEventListener('click', () => {
          pillRow.querySelectorAll('.pkg-tab').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          selection[axis.key] = opt.value;
          renderPricing();
        });
        pillRow.appendChild(pill);
      });
      group.appendChild(pillRow);
      container.appendChild(group);
    });

    renderPricing();
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
      const hasQty = panel.dataset.hasQty === 'true';
      let qty = 1;
      if (hasQty) {
        const qtyInput = panel.querySelector('.qty-stepper input');
        if (qtyInput) qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      }
      const category = panel.closest('.category-block').querySelector('h2').textContent.trim();

      if (panel.dataset.mode === 'variant') {
        const entry = panel._variantEntry;
        if (!entry) return;
        const label = panel._variantLabel;
        const img = panel.querySelector('.d-img').src;

        ASCQuote.addToQuote({
          name: panel.dataset.serviceName,
          category: category,
          package: label,
          packages: [label],
          priceDisplay: entry.price,
          priceValue: ASCQuote.parsePrice(entry.price),
          img: img,
          hasQty: hasQty,
          qty: qty
        });

        showToast(`✓ ${label} ${panel.dataset.serviceName} added to your quote.`);
        return;
      }

      const packages = JSON.parse(panel.dataset.packagesJson);
      const selectedIndex = parseInt(panel.dataset.selectedIndex || '0', 10);
      const pkg = packages[selectedIndex];

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

  /* ---------- Inquiry form: send via EmailJS if configured, else fall back to mailto ---------- */
  const inquiryForm = document.getElementById('inquiryForm');

  function getEmailJsStatus() {
    // 'ready' | 'loading' | 'failed' | 'not-configured'
    return window.ASC_EMAILJS_STATUS || 'not-configured';
  }

  // Waits for EmailJS to settle into 'ready' or 'failed' rather than judging it
  // the instant submit is clicked — this is what stops a slow-but-successful
  // script load from being mistaken for a genuine failure.
  function waitForEmailJs(maxWaitMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function poll() {
        const status = getEmailJsStatus();
        if (status !== 'loading') {
          console.log(`[ASC EmailJS] Resolved to "${status}" after ${Date.now() - start}ms.`);
          resolve(status);
          return;
        }
        if (Date.now() - start >= maxWaitMs) {
          console.warn(`[ASC EmailJS] Still "loading" after ${maxWaitMs}ms — treating as timeout, not a hard failure.`);
          resolve('timeout');
          return;
        }
        setTimeout(poll, 150);
      })();
    });
  }

  const inquiryNote = document.getElementById('inquiryFormNote');
  function updateInquiryNote() {
    if (!inquiryNote) return;
    inquiryNote.textContent = getEmailJsStatus() === 'ready'
      ? "Your inquiry is sent directly to us — you'll stay right here on the site."
      : 'This opens your email app with everything filled in, ready to send to us.';
  }
  updateInquiryNote();
  // If the script is still loading when the page first renders, update the note
  // once it settles instead of leaving a possibly-stale message in place.
  if (getEmailJsStatus() === 'loading') {
    waitForEmailJs(6000).then(updateInquiryNote);
  }

  function showInquirySuccess() {
    const mainContent = document.getElementById('inquiryMainContent');
    const successPanel = document.getElementById('inquirySuccess');
    if (mainContent) mainContent.style.display = 'none';
    if (successPanel) successPanel.style.display = 'block';

    // Mark the entire progress indicator as complete — including "Tell Us About Your Project"
    document.querySelectorAll('.progress-step').forEach((step) => {
      step.classList.add('done');
      step.classList.remove('active');
      step.querySelector('.p-dot').textContent = '✓';
    });

    // Clear My Quote — the inquiry has been submitted
    ASCQuote.saveQuote([]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (inquiryForm) {
    inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = inquiryForm;
      const fileInput = f.themefiles;
      let fileNote = 'None attached';
      if (fileInput && fileInput.files.length) {
        fileNote = `${fileInput.files[0].name} (attached)`;
      }

      const quoteItems = ASCQuote.getQuote();
      let quoteText = 'None selected';
      if (quoteItems.length) {
        const { total, hasUnknown } = ASCQuote.estimateTotal(quoteItems);
        quoteText = quoteItems.map(item =>
          `${item.name} — ${item.package}${item.hasQty ? ` × ${item.qty || 1}` : ''} (${item.priceDisplay})`
        ).join('\n') + `\nEstimated Starting Total: ₱${total.toLocaleString()}${hasUnknown ? ' +' : ''}`;
      }

      // Populate the hidden field so emailjs.sendForm() (which reads the live form) includes it
      const quoteHiddenInput = document.getElementById('quoteItemsHidden');
      if (quoteHiddenInput) quoteHiddenInput.value = quoteText;

      const fields = {
        name: f.name.value,
        email: f.email.value,
        contact: f.contact.value,
        occasion: f.occasion.value,
        eventdate: f.eventdate.value,
        venue: f.venue.value,
        guests: f.guests.value,
        services: f.services.value,
        theme: f.theme.value,
        themefiles: fileNote,
        budget: f.budget.value,
        requests: f.requests.value,
        quote_items: quoteText,
      };

      const submitBtn = inquiryForm.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      let status = getEmailJsStatus();
      console.log('[ASC EmailJS] Submit clicked. Status at click time:', status);

      if (status === 'loading') {
        showToast('Connecting to our email service…');
        status = await waitForEmailJs(5000);
      }

      const resetButton = () => {
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
      };

      if (status === 'ready') {
        // sendForm reads the live <form> directly, which is what lets the file input
        // actually travel as a real email attachment (plain .send() with a data object cannot do this).
        emailjs.sendForm(window.ASC_EMAILJS_CONFIG.serviceId, window.ASC_EMAILJS_CONFIG.templateId, inquiryForm)
          .then(() => {
            console.log('[ASC EmailJS] sendForm succeeded.');
            showInquirySuccess();
          })
          .catch((err) => {
            console.error('[ASC EmailJS] sendForm failed after a successful init — genuine send failure:', err);
            resetButton();
            showToast("Couldn't reach our email service — opening your email app instead.");
            setTimeout(() => sendViaMailto(fields), 1200);
          });
        return;
      }

      // Not ready, and not going to become ready in time — fall back, but say why.
      resetButton();
      const messages = {
        timeout: "This is taking longer than expected — opening your email app instead.",
        failed: "Couldn't reach our email service — opening your email app instead.",
        'not-configured': 'Opening your email app with everything filled in, ready to send.',
      };
      console.warn('[ASC EmailJS] Falling back to mailto. Reason:', status);
      showToast(messages[status] || messages.failed);
      setTimeout(() => sendViaMailto(fields), 1200);
    });
  }

  function sendViaMailto(fields) {
    const lines = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Contact Number: ${fields.contact}`,
      `Occasion: ${fields.occasion}`,
      `Event Date: ${fields.eventdate}`,
      `Venue / Location: ${fields.venue}`,
      `Estimated Guest Count: ${fields.guests}`,
      `Services Interested In: ${fields.services}`,
      `Theme / Inspiration (notes): ${fields.theme}`,
      `Theme / Inspiration Photo: ${fields.themefiles === 'None attached' ? 'None attached' : fields.themefiles + ' — please re-attach this in your email app, as this fallback method can\'t carry it automatically.'}`,
      `Preferred Budget: ${fields.budget}`,
      `Other Requests: ${fields.requests}`,
    ];
    if (fields.quote_items && fields.quote_items !== 'None selected') {
      lines.push('', '--- Selected from My Quote ---', fields.quote_items);
    }
    const body = encodeURIComponent(lines.join('\n'));
    const subject = encodeURIComponent(`Inquiry from ${fields.name || 'Website Visitor'}`);
    window.location.href = `mailto:andshecraftsph@gmail.com?subject=${subject}&body=${body}`;
  }

  /* ---------- Story collage lightbox (Event Gallery) ---------- */
  const storyLightbox = document.getElementById('storyLightbox');
  if (storyLightbox) {
    const tiles = Array.from(document.querySelectorAll('.story-tile img'));
    const lbImg = storyLightbox.querySelector('img');
    const counter = storyLightbox.querySelector('.lb-counter');
    let current = 0;

    function openAt(i) {
      current = i;
      lbImg.src = tiles[i].src;
      lbImg.alt = tiles[i].alt;
      counter.textContent = `${i + 1} / ${tiles.length}`;
      storyLightbox.classList.add('open');
    }
    function closeLb() { storyLightbox.classList.remove('open'); }
    function next() { openAt((current + 1) % tiles.length); }
    function prev() { openAt((current - 1 + tiles.length) % tiles.length); }

    tiles.forEach((img, i) => img.addEventListener('click', () => openAt(i)));
    storyLightbox.querySelector('.lb-close').addEventListener('click', closeLb);
    storyLightbox.querySelector('.lb-next').addEventListener('click', next);
    storyLightbox.querySelector('.lb-prev').addEventListener('click', prev);
    storyLightbox.addEventListener('click', (e) => { if (e.target === storyLightbox) closeLb(); });

    document.addEventListener('keydown', (e) => {
      if (!storyLightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    // Touch swipe support
    let touchStartX = 0;
    storyLightbox.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    storyLightbox.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 40) diff > 0 ? prev() : next();
    }, { passive: true });
  }
});
