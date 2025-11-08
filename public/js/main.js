document.addEventListener('DOMContentLoaded', () => {
  // Mobile quick menu toggle
  const tabMenu = document.getElementById('tab-menu');
  const tabHome = document.getElementById('tab-home');
  const mobileQa = document.getElementById('mobileQuickMenu');
  if (tabMenu && mobileQa) {
    const toggleQa = (open) => {
      const willOpen = typeof open === 'boolean' ? open : mobileQa.getAttribute('aria-hidden') !== 'false';
      mobileQa.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    };
    tabMenu.addEventListener('click', () => toggleQa(true));
    mobileQa.addEventListener('click', (e) => {
      if (e.target === mobileQa) toggleQa(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleQa(false);
    });
    if (tabHome) tabHome.addEventListener('click', () => toggleQa(false));
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


