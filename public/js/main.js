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
  const deductSelect = document.getElementById('deduct-from');
  const accountSelectEl = document.querySelector('.account-select');
  const deductIconImg = accountSelectEl ? accountSelectEl.querySelector('.account-select__icon img') : null;
  const accountTitleEl = accountSelectEl ? accountSelectEl.querySelector('.account-select__title') : null;
  const accountSubEl = accountSelectEl ? accountSelectEl.querySelector('.account-select__subtitle') : null;
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
    nature: findSummaryRow('Nature'),
    purpose: findSummaryRow('Purpose'),
    youPay: findSummaryRow('Your total'),
    payeeReceives: findSummaryRow('Payee receives'),
    conversion: findSummaryRow('Conversion rate'),
  };

  const getPayerCurrency = () => {
    if (!deductSelect) return 'USDT';
    const opt = deductSelect.options[deductSelect.selectedIndex];
    const txt = opt ? opt.textContent || '' : '';
    return /USDT/i.test(txt) ? 'USDT' : 'USD';
  };
  const payeeCurrency = 'USD';

  const formatAmount = (value, suffix) => {
    const formatted = Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${suffix}`;
  };

  const syncDeductIcon = (payerCurrency) => {
    if (!deductIconImg) return;
    if (payerCurrency === 'USDT') {
      deductIconImg.src = 'assets/icon_USDT.svg';
      deductIconImg.alt = 'Tether USDT';
    } else {
      deductIconImg.src = 'assets/icon_USD.svg';
      deductIconImg.alt = 'US Dollar';
    }
  };
  const syncAccountDisplay = () => {
    if (!deductSelect) return;
    const payerCurrency = getPayerCurrency();
    syncDeductIcon(payerCurrency);
    if (accountTitleEl) accountTitleEl.textContent = `${payerCurrency} account`;
    const opt = deductSelect.options[deductSelect.selectedIndex];
    const balance = opt ? opt.getAttribute('data-balance') || '$0.00' : '$0.00';
    if (accountSubEl) accountSubEl.textContent = `${balance} balance`;
  };

  const getFeeMode = () => {
    const selected = Array.from(feeRadios).find(r => r.checked);
    return selected ? selected.value : 'you';
  };

  const setServiceBreakdown = (payerPctAbs, payeePctAbs) => {
    const payerLabel = summaryRows.servicePayer && summaryRows.servicePayer.querySelector('.muted');
    const payeeLabel = summaryRows.servicePayee && summaryRows.servicePayee.querySelector('.muted');
    if (payerLabel) payerLabel.textContent = `${payerPctAbs}% paid by you`;
    if (payeeLabel) payeeLabel.textContent = `${payeePctAbs}% paid by Payee`;
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
  if (deductSelect) deductSelect.addEventListener('change', () => { updateSummary(); syncAccountDisplay(); accountSelectEl?.classList.add('is-filled'); });
  if (natureSelect) natureSelect.addEventListener('change', updateNaturePurpose);
  if (purposeSelect) purposeSelect.addEventListener('change', updateNaturePurpose);
  // Initial compute
  updateSummary();
  updateNaturePurpose();
  syncAccountDisplay();
  accountSelectEl?.classList.add('is-filled');
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


