function initSendPayment() {
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
  // If coming back with request to open quick menu on mobile/tablet, honor it
  const shouldOpenQuick =
    window.innerWidth < DESKTOP_BP &&
    (window.location.hash === '#quick' || sessionStorage.getItem('openQuick') === '1');
  if (shouldOpenQuick && tabMenu) {
    showQuick();
    setActiveTab(tabMenu);
    sessionStorage.removeItem('openQuick');
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

  // ---- Live summary calculations (Amount + Fees) ----
  const amountInput = document.getElementById('amount');
  const feeRadios = document.querySelectorAll('input[type="radio"][name="fee"]');
  const deductRadios = document.querySelectorAll('input[type="radio"][name="deduct"]');
  const natureSelect = document.getElementById('nature');
  const purposeSelect = document.getElementById('purpose');

  const findSummaryRow = (labelText) => {
    let row = null;
    document.querySelectorAll('.summary-pair, .summary-pair.summary-pair--large').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        row = pair;
      }
    });
    return row;
  };
  const findSummaryRowStartsWith = (prefixText) => {
    let row = null;
    document.querySelectorAll('.summary-pair').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase().startsWith(prefixText.toLowerCase())) {
        row = pair;
      }
    });
    return row;
  };

  const summaryRows = {
    subtotal: findSummaryRow('Your subtotal'),
    serviceTitle: document.querySelector('.summary-pair[data-summary="service-title"]'),
    servicePayer: document.querySelector('[data-summary="service-payer"]'),
    servicePayee: document.querySelector('[data-summary="service-payee"]'),
    amountPayable: findSummaryRow('Amount payable'),
    deductFrom: findSummaryRow('Deduct from'),
    nature: findSummaryRow('Nature'),
    purpose: findSummaryRow('Purpose'),
    youPay: findSummaryRow('To be deducted'),
    payeeReceives: findSummaryRow('Receiver gets'),
    conversion: findSummaryRow('Conversion rate'),
  };

  const getPayerCurrency = () => {
    const selected = Array.from(deductRadios).find(r => r.checked);
    return selected ? selected.value : 'USD';
  };
  const payeeCurrency = 'USD';

  const formatAmount = (value, suffix) => {
    const formatted = Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${suffix}`;
  };

  const syncAccountDisplay = () => {};

  const getFeeMode = () => {
    const selected = Array.from(feeRadios).find(r => r.checked);
    return selected ? selected.value : 'you';
  };

  const setServiceBreakdown = (payerPctAbs, payeePctAbs) => {
    const payerLabel = summaryRows.servicePayer && summaryRows.servicePayer.querySelector('.muted');
    const payeeLabel = summaryRows.servicePayee && summaryRows.servicePayee.querySelector('.muted');
    if (payerLabel) payerLabel.textContent = `${payerPctAbs}% paid by you`;
    if (payeeLabel) payeeLabel.textContent = `${payeePctAbs}% paid by receiver`;
  };

  const updateSummary = () => {
    if (!amountInput) return;
    const raw = (amountInput.value || '').toString().replace(/,/g, '');
    const amount = parseFloat(raw) || 0;
    const mode = getFeeMode();

    // Determine fee shares
    const feeRate = 0.01; // 1%
    let payerRate = 0, receiverRate = 0;
    if (mode === 'you') { payerRate = feeRate; receiverRate = 0; }
    else if (mode === 'receiver') { payerRate = 0; receiverRate = feeRate; }
    else { payerRate = feeRate / 2; receiverRate = feeRate / 2; }

    const payerFee = amount * payerRate;
    const receiverFee = amount * receiverRate;

    const youPay = amount + payerFee;
    const payeeGets = amount - receiverFee;
    const subtotal = amount; // before fees

    // Update labels and values
    // Percentages shown are absolute share of the amount (e.g., 0.5%)
    const payerPctAbs = Math.round(payerRate * 1000) / 10;   // one decimal
    const payeePctAbs = Math.round(receiverRate * 1000) / 10;
    setServiceBreakdown(payerPctAbs, payeePctAbs);

    const payerCurrency = getPayerCurrency();
    const showConversion = payerCurrency !== payeeCurrency;
    // Keep the select display in sync with currency
    syncAccountDisplay();

    if (summaryRows.subtotal) {
      const v = summaryRows.subtotal.querySelector('strong');
      if (v) v.textContent = formatAmount(subtotal, payerCurrency);
    }
    if (summaryRows.serviceTitle) {
      // Only show the label; totals are displayed in the breakdown rows
      const lbl = summaryRows.serviceTitle.querySelector('.muted');
      if (lbl) lbl.textContent = 'Service fees';
    }
    if (summaryRows.servicePayer) {
      const v = summaryRows.servicePayer.querySelector('strong');
      if (v) v.textContent = formatAmount(payerFee, payerCurrency);
    }
    if (summaryRows.servicePayee) {
      const v = summaryRows.servicePayee.querySelector('strong');
      if (v) v.textContent = formatAmount(receiverFee, payeeCurrency);
    }
    if (summaryRows.amountPayable) {
      const v = summaryRows.amountPayable.querySelector('strong');
      if (v) v.textContent = formatAmount(amount, payeeCurrency); // always USD
    }
    if (summaryRows.youPay) {
      const v = summaryRows.youPay.querySelector('strong');
      if (v) {
        const payerCurrency = getPayerCurrency();
        v.textContent = formatAmount(youPay, payerCurrency);
      }
    }
    if (summaryRows.deductFrom) {
      const v = summaryRows.deductFrom.querySelector('strong');
      if (v) v.textContent = `${getPayerCurrency()} account`;
    }
    if (summaryRows.payeeReceives) {
      const v = summaryRows.payeeReceives.querySelector('strong');
      if (v) v.textContent = formatAmount(payeeGets, payeeCurrency);
    }
    if (summaryRows.conversion) {
      // Show only if payer currency differs from payee currency
      if (showConversion) {
        summaryRows.conversion.style.display = '';
        const v = summaryRows.conversion.querySelector('strong');
        if (v) v.textContent = `1 ${payerCurrency} = 1 ${payeeCurrency}`;
      } else {
        summaryRows.conversion.style.display = 'none';
      }
    }
  };

  const updateNaturePurpose = () => {
    if (summaryRows.nature && natureSelect) {
      const v = summaryRows.nature.querySelector('strong');
      if (v) {
        const txt = natureSelect.options[natureSelect.selectedIndex]?.textContent?.trim() || '';
        v.textContent = (!txt || /^select$/i.test(txt)) ? '- -' : txt;
      }
      // toggle filled state for styling
      const filled = natureSelect.options[natureSelect.selectedIndex] && !/^select$/i.test(natureSelect.options[natureSelect.selectedIndex].textContent || '');
      natureSelect.classList.toggle('is-filled', filled);
    }
    if (summaryRows.purpose && purposeSelect) {
      const v = summaryRows.purpose.querySelector('strong');
      if (v) {
        const txt = purposeSelect.options[purposeSelect.selectedIndex]?.textContent?.trim() || '';
        v.textContent = (!txt || /^select$/i.test(txt)) ? '- -' : txt;
      }
      // toggle filled state for styling
      const filled = purposeSelect.options[purposeSelect.selectedIndex] && !/^select$/i.test(purposeSelect.options[purposeSelect.selectedIndex].textContent || '');
      purposeSelect.classList.toggle('is-filled', filled);
    }
  };

  if (amountInput) {
    const formatCurrencyInput = (e) => {
      const input = e.target;
      const prev = input.value || '';
      // Allow only digits, comma, and dot
      let raw = prev.replace(/[^\d.,]/g, '');
      const hadTrailingDot = /\.\s*$/.test(prev);
      // Remove thousands separators
      raw = raw.replace(/,/g, '');
      // Keep only first dot as decimal separator
      const firstDot = raw.indexOf('.');
      if (firstDot !== -1) {
        const head = raw.slice(0, firstDot);
        const tail = raw.slice(firstDot + 1).replace(/\./g, '');
        raw = `${head}.${tail}`;
      }
      if (raw === '') {
        input.value = '';
        updateSummary();
        return;
      }
      // Track number of digits before caret to restore position after formatting
      const selStart = input.selectionStart || 0;
      const digitsBefore = prev.slice(0, selStart).replace(/[^\d]/g, '').length;
      // Split integer/fraction and insert thousands separators
      const [intRaw, fracRaw = ''] = raw.split('.');
      const intStr = intRaw.replace(/^0+(?=\d)/, '') || '0';
      const intFormatted = Number(intStr).toLocaleString('en-US');
      const fracStr = fracRaw.slice(0, 2);
      let next = fracStr ? `${intFormatted}.${fracStr}` : intFormatted;
      if (!fracStr && hadTrailingDot) next = `${intFormatted}.`;
      if (next !== prev) {
        input.value = next;
        // Restore caret position based on digit count
        try {
          let count = 0, pos = 0;
          while (pos < next.length) {
            if (/\d/.test(next[pos])) {
              count++;
              if (count > digitsBefore) break;
            }
            pos++;
          }
          input.setSelectionRange(pos, pos);
        } catch (err) { /* ignore */ }
      }
      updateSummary();
    };
    amountInput.addEventListener('input', formatCurrencyInput, { passive: true });
    amountInput.addEventListener('change', formatCurrencyInput);
  }
  feeRadios.forEach(r => r.addEventListener('change', updateSummary));
  deductRadios.forEach(r => r.addEventListener('change', updateSummary));
  if (natureSelect) natureSelect.addEventListener('change', updateNaturePurpose);
  if (purposeSelect) purposeSelect.addEventListener('change', updateNaturePurpose);
  // Initial compute
  updateSummary();
  updateNaturePurpose();
  syncAccountDisplay();
}

// Run immediately if DOM is already parsed (defer), otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSendPayment);
} else {
  initSendPayment();
}

// Select Counterparty page behavior
(function initSelectCounterparty() {
  const filter = document.getElementById('filter-verified');
  const list = document.querySelector('.cp-list');
  if (!filter || !list) return;
  const applyFilter = () => {
    const onlyFirst = filter.checked;
    const items = Array.from(list.querySelectorAll('li'));
    items.forEach((li, idx) => {
      if (!onlyFirst) {
        li.style.display = '';
      } else {
        li.style.display = idx === 0 ? '' : 'none';
      }
    });
  };
  filter.addEventListener('change', applyFilter);
  applyFilter();
})();

// Modal helpers (reused lightweight pattern)
(function initModalLogic() {
  const open = (el) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  };
  const close = (el) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  };

  // Wire close buttons and overlay click
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close(modal);
    });
    modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => close(modal));
    });
  });

  // Select-counterparty: block unverified items
  const list = document.querySelector('.cp-list');
  const modal = document.getElementById('accountNotVerifiedModal');
  if (list && modal) {
    list.addEventListener('click', (e) => {
      const link = e.target.closest('.cp-item');
      if (!link) return;
      const status = link.querySelector('.cp-status');
      const isOk = status && status.classList.contains('cp-status--ok');
      if (!isOk) {
        e.preventDefault();
        open(modal);
      }
    });

    // Mark unverified items for responsive styling (mobile shows only status)
    list.querySelectorAll('.cp-item').forEach((item) => {
      const st = item.querySelector('.cp-status');
      const metaA = item.querySelector('.cp-item__metablack');
      const metaB = item.querySelector('.cp-item__meta');
      const isOk = st && st.classList.contains('cp-status--ok');
      if (!isOk) item.classList.add('is-unverified');
      else {
        item.classList.add('is-verified');
        item.classList.remove('is-unverified');
        // Compose mobile label "(CIMB) 1234..." into status for consistent layout on small screens
        const label = [metaA?.textContent?.trim(), metaB?.textContent?.trim()].filter(Boolean).join(' ');
        if (label) st.setAttribute('data-mobile-label', label);
      }
    });
  }
})();

// Select Counterparty: back crumb routes to quick menu on tablet and below
(function initCpBackNavigation() {
  const isCpPage = document.querySelector('main.page--cp');
  if (!isCpPage) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('cp-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      // Use session flag; index.js will switch to quick tab
      try { sessionStorage.setItem('openQuick', '1'); } catch (_) {}
      window.location.href = 'index.html#quick';
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Send Payment: back crumb and title go to Select counterparty on tablet and below
(function initSendBackNavigation() {
  const isSendPage = document.querySelector('main.page--send');
  if (!isSendPage) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('sp-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      window.location.href = 'select-counterparty.html';
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Add Bank: back crumb and title go to Select counterparty on tablet and below
(function initAddBankBackNavigation() {
  const isAddBank = document.querySelector('main.page--addbank');
  if (!isAddBank) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('ab-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      window.location.href = 'select-counterparty.html';
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Add Bank: enable Next when all fields are filled (reusable helper)
(function initAddBankFormState() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;
  const form = root.querySelector('form');
  const nextBtn = document.getElementById('ab-next');
  if (!form || !nextBtn) return;

  const getFields = () => ([
    form.querySelector('#companyName'),
    form.querySelector('#regDate'),
    form.querySelector('#country'),
    form.querySelector('#regNum'),
    form.querySelector('#email'),
  ]);

  const setDisabled = (btn, disabled) => {
    btn.disabled = !!disabled;
    if (disabled) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  };

  const isFilled = (el) => {
    if (!el) return false;
    const v = (el.value || '').trim();
    if (el.type === 'email') {
      // simple validity; rely on browser validation for complex cases
      return el.validity.valid && v.length > 0;
    }
    return v.length > 0;
  };

  const update = () => {
    const fields = getFields();
    const allOk = fields.every(isFilled);
    setDisabled(nextBtn, !allOk);
    // toggle filled style for country select (placeholder vs selected)
    const countrySel = fields[2];
    if (countrySel) {
      const filled = !!countrySel.value;
      countrySel.classList.toggle('is-filled', filled);
    }
  };

  // Listen for changes
  getFields().forEach((el) => {
    if (!el) return;
    el.addEventListener('input', update, { passive: true });
    el.addEventListener('change', update);
  });
  // Initial
  update();
})();

// Add Bank: dev tools (Fill / Clear) in build-badge
(function initAddBankDevTools() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;
  const form = root.querySelector('form');
  const fillBtn = document.getElementById('ab-fill');
  const clearBtn = document.getElementById('ab-clear');
  if (!form || !fillBtn || !clearBtn) return;

  const getFields = () => ({
    companyName: form.querySelector('#companyName'),
    regDate: form.querySelector('#regDate'),
    country: form.querySelector('#country'),
    regNum: form.querySelector('#regNum'),
    email: form.querySelector('#email'),
  });
  const trigger = (el) => {
    if (!el) return;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  fillBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const f = getFields();
    if (f.companyName) f.companyName.value = 'NovaQuill Ltd';
    if (f.regDate) f.regDate.value = '2024-01-15';
    if (f.country) f.country.value = 'Singapore';
    if (f.regNum) f.regNum.value = '202401234N';
    if (f.email) f.email.value = 'accounts@novaquill.com';
    Object.values(f).forEach(trigger);
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const f = getFields();
    Object.values(f).forEach((el) => { if (el) el.value = ''; trigger(el); });
  });
})();


