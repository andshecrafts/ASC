document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  if (navToggle && navList){
    navToggle.addEventListener('click', () => navList.classList.toggle('open'));
    navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navList.classList.remove('open')));
  }

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  // Interactive service cards: click a card, show its package configurator below its row
  document.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('click', () => {
      const row = card.closest('.svc-row');
      const panel = row.nextElementSibling; // .svc-detail-panel immediately after the row

      const alreadyActive = card.classList.contains('active');
      row.querySelectorAll('.svc-card').forEach(c => c.classList.remove('active'));

      if (alreadyActive){
        panel.classList.remove('open');
        return;
      }

      card.classList.add('active');
      const packages = JSON.parse(card.dataset.packages);
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
      panel.classList.add('open');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  function selectPackage(panel, packages, index){
    const pkg = packages[index];
    panel.querySelectorAll('.pkg-tab').forEach((t, i) => t.classList.toggle('active', i === index));
    panel.querySelector('.d-img').src = pkg.img;
    panel.querySelector('.d-img').alt = pkg.name;
    panel.querySelector('.pkg-price').textContent = pkg.price;
    const includesEl = panel.querySelector('.pkg-includes');
    includesEl.innerHTML = pkg.includes.map(i => `<li>${i}</li>`).join('');
  }

  // Slideshow prev/next arrows + auto-rotate
  document.querySelectorAll('.story-slideshow').forEach(slideshow => {
    const imgs = slideshow.querySelectorAll('img');
    if (!imgs.length) return;
    let idx = 0;
    imgs[0].classList.add('active');

    function show(newIdx){
      imgs[idx].classList.remove('active');
      idx = (newIdx + imgs.length) % imgs.length;
      imgs[idx].classList.add('active');
    }

    let timer = setInterval(() => show(idx + 1), 5000);
    function resetTimer(){ clearInterval(timer); timer = setInterval(() => show(idx + 1), 5000); }

    const prevBtn = slideshow.querySelector('.slide-arrow.prev');
    const nextBtn = slideshow.querySelector('.slide-arrow.next');
    if (prevBtn) prevBtn.addEventListener('click', () => { show(idx - 1); resetTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { show(idx + 1); resetTimer(); });
  });

  // Inquiry form: compose an email with the details filled in
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm){
    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = inquiryForm;
      const fileInput = f.themefiles;
      let fileNote = 'None attached';
      if (fileInput && fileInput.files.length){
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
      const body = encodeURIComponent(lines.join('\n'));
      const subject = encodeURIComponent(`Inquiry from ${f.name.value || 'Website Visitor'}`);
      window.location.href = `mailto:andshecraftsph@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox){
    document.querySelectorAll('.story-thumbs img, .story-slideshow img').forEach(img => {
      img.addEventListener('click', () => {
        lightbox.querySelector('img').src = img.src;
        lightbox.querySelector('img').alt = img.alt;
        lightbox.classList.add('open');
      });
    });
    lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
  }
});
