document.addEventListener('DOMContentLoaded', () => {
  // Mobile quick menu toggle
  const tabMenu = document.getElementById('tab-menu');
  const tabHome = document.getElementById('tab-home');
  const tabConvert = document.getElementById('tab-convert');
  const tabOTC = document.getElementById('tab-otc');
  const tabTrans = document.getElementById('tab-transactions');
  const homeView = document.getElementById('homeView');
  const quickView = document.getElementById('quickView');

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

  const showHome = () => {
    if (homeView) homeView.hidden = false;
    if (quickView) quickView.hidden = true;
  };
  const showQuick = () => {
    if (homeView) homeView.hidden = true;
    if (quickView) quickView.hidden = false;
  };

  // Render shared quick actions from template into all targets
  const qaTpl = document.getElementById('quickActionsTemplate');
  const qaHeaderTpl = document.getElementById('quickActionsHeaderTemplate');
  if (qaTpl) {
    document.querySelectorAll('[data-qa-target]').forEach((host) => {
      host.innerHTML = '';
      const frag = qaTpl.content.cloneNode(true);
      host.appendChild(frag);
    });
  }
  if (qaHeaderTpl) {
    document.querySelectorAll('[data-qa-header-target]').forEach((host) => {
      host.innerHTML = '';
      const frag = qaHeaderTpl.content.cloneNode(true);
      host.appendChild(frag);
    });
  }

  // Ensure correct view when crossing responsive breakpoints
  const DESKTOP_BP = 1280;
  const syncResponsiveState = () => {
    if (!homeView || !quickView) return;
    if (window.innerWidth >= DESKTOP_BP) {
      // On desktop, always show the home layout (with sidebar) and mark Assets active
      showHome();
      if (tabHome) setActiveTab(tabHome);
    }
    // Below desktop we keep current view; user can toggle via tabs
  };
  window.addEventListener('resize', syncResponsiveState);
  // Run once on load to guarantee a consistent state
  syncResponsiveState();

  if (tabHome) tabHome.addEventListener('click', () => { showHome(); setActiveTab(tabHome); });
  if (tabMenu) tabMenu.addEventListener('click', () => { showQuick(); setActiveTab(tabMenu); });
  if (tabConvert) tabConvert.addEventListener('click', () => { showHome(); setActiveTab(tabConvert); });
  if (tabOTC) tabOTC.addEventListener('click', () => { showHome(); setActiveTab(tabOTC); });
  if (tabTrans) tabTrans.addEventListener('click', () => { showHome(); setActiveTab(tabTrans); });

  // Initialize icons based on default active tab
  setActiveTab(document.querySelector('.tabbar__btn.is-active') || tabHome);

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


