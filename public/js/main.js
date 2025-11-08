document.addEventListener('DOMContentLoaded', () => {
  // Mobile quick menu toggle
  const tabMenu = document.getElementById('tab-menu');
  const tabHome = document.getElementById('tab-home');
  const tabConvert = document.getElementById('tab-convert');
  const tabOTC = document.getElementById('tab-otc');
  const tabTrans = document.getElementById('tab-transactions');
  const mobileQa = document.getElementById('mobileQuickMenu');
  if (tabMenu && mobileQa) {
    const setActiveTab = (btn) => {
      document.querySelectorAll('.tabbar__btn').forEach(b => {
        const icon = b.querySelector('.tabbar__icon');
        const activeSrc = icon && icon.getAttribute('data-icon-active');
        const inactiveSrc = icon && icon.getAttribute('data-icon-inactive');
        if (b === btn) {
          b.classList.add('is-active');
          if (icon && activeSrc) icon.setAttribute('src', activeSrc);
        } else {
          b.classList.remove('is-active');
          if (icon && inactiveSrc) icon.setAttribute('src', inactiveSrc);
        }
      });
    };
    const openQa = () => { mobileQa.setAttribute('aria-hidden', 'false'); };
    const closeQa = () => { mobileQa.setAttribute('aria-hidden', 'true'); };

    tabMenu.addEventListener('click', () => { setActiveTab(tabMenu); openQa(); });
    mobileQa.addEventListener('click', (e) => {
      if (e.target === mobileQa) { closeQa(); setActiveTab(tabHome); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeQa(); setActiveTab(tabHome); }
    });
    if (tabHome) tabHome.addEventListener('click', () => { closeQa(); setActiveTab(tabHome); });
    if (tabConvert) tabConvert.addEventListener('click', () => { closeQa(); setActiveTab(tabConvert); });
    if (tabOTC) tabOTC.addEventListener('click', () => { closeQa(); setActiveTab(tabOTC); });
    if (tabTrans) tabTrans.addEventListener('click', () => { closeQa(); setActiveTab(tabTrans); });

    // Init icons according to default active state
    setActiveTab(document.querySelector('.tabbar__btn.is-active') || tabHome);
  }

  const form = document.querySelector('.form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    console.info('[Send payment] Payload', payload);
    const btn = form.querySelector('.btn--primary');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        alert('Payment submitted (demo)');
      }, 800);
    }
  });
});


