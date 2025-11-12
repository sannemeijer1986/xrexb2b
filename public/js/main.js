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
  let lastNatureVal = natureSelect ? natureSelect.value : '';

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

  // ---- Enable/disable Confirm send based on filled inputs/selects ----
  const confirmBtn = document.getElementById('confirm-send');
  const isElementVisible = (el) => {
    if (!el) return false;
    if (el.hidden) return false;
    if (el.closest('[hidden]')) return false;
    const rect = el.getBoundingClientRect();
    return !(rect.width === 0 && rect.height === 0);
  };
  const validateSendForm = () => {
    if (!confirmBtn) return;
    const natureEl = document.getElementById('nature');
    const purposeEl = document.getElementById('purpose');
    const amountEl = document.getElementById('amount');
    const pre = document.getElementById('docs-pre');
    const post = document.getElementById('docs-post');

    const isFilledText = (el) => !!(el && String(el.value || '').trim().length >= 1);
    const isFilledSelect = (el) => !!(el && String(el.value || '') !== '');

    const natureOk = isFilledSelect(natureEl);
    const purposeOk = isFilledSelect(purposeEl);
    // Amount must be a positive number; treat empty or 0 as not filled
    let amountOk = false;
    if (amountEl) {
      const amtRaw = String(amountEl.value || '').replace(/,/g, '').trim();
      const amtNum = parseFloat(amtRaw);
      amountOk = Number.isFinite(amtNum) && amtNum > 0;
    }

    let docsOk = true;
    if (natureOk) {
      if (pre && !pre.hidden) {
        const docType = document.getElementById('docType');
        const docNum = document.getElementById('piNumber');
        const uploads = document.querySelectorAll('#docs-pre .upload-item');
        const docTypeOk = isFilledSelect(docType);
        const docNumOk = isFilledText(docNum);
        const uploadsOk = Array.from(uploads).every(item => item.classList.contains('is-uploaded'));
        docsOk = docTypeOk && docNumOk && uploadsOk;
      } else if (post && !post.hidden) {
        const ciNum = document.getElementById('ciNumber');
        const uploads = document.querySelectorAll('#docs-post .upload-item');
        const ciOk = isFilledText(ciNum);
        const uploadsOk = Array.from(uploads).every(item => item.classList.contains('is-uploaded'));
        docsOk = ciOk && uploadsOk;
      }
    } else {
      docsOk = false;
    }

    const allValid = natureOk && purposeOk && amountOk && docsOk;
    confirmBtn.setAttribute('aria-disabled', allValid ? 'false' : 'true');
    confirmBtn.disabled = !allValid;
  };

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
    // Toggle USDT rate helper
    const deductRate = document.getElementById('deduct-rate');
    if (deductRate) {
      deductRate.hidden = payerCurrency !== 'USDT';
    }
    // Amount per-tx limit inline error + input underline color
    const PER_TX_LIMIT = 1000000;
    const amountOverPerTx = amount >= PER_TX_LIMIT;
    const amountMeta = document.querySelector('.amount-meta');
    const amountMetaText = amountMeta?.querySelector('.amount-meta__text');
    const amountInputWrap = document.querySelector('.amount-input');
    if (amountMeta) {
      amountMeta.classList.toggle('is-error', amountOverPerTx);
    }
    if (amountMetaText) {
      amountMetaText.textContent = amountOverPerTx
        ? `Amount payable exceeds ${formatAmount(PER_TX_LIMIT, 'USD')} limit per tx`
        : `Limit per tx: ${formatAmount(PER_TX_LIMIT, 'USD')}`;
    }
    // Inline error for amount exceeding selected account balance
    const amountError = document.getElementById('amount-error');
    const selectedRadio = Array.from(document.querySelectorAll('.fee-options--deduct input[type="radio"]')).find(r => r.checked);
    const balanceText = selectedRadio?.closest('.fee-option')?.querySelector('.fee-option__content .muted')?.textContent || '';
    const balanceNum = (() => {
      const m = balanceText.replace(/[^0-9.]/g, '');
      return parseFloat(m || '0') || 0;
    })();
    const overBalance = amount > balanceNum;
    if (amountError) {
      amountError.hidden = !overBalance;
      if (overBalance) {
        amountError.textContent = `Amount payable exceeds available ${payerCurrency} balance`;
      }
    }
    // Clear previous error highlights, then mark selected
    document.querySelectorAll('.fee-options--deduct .fee-option .fee-option__content .muted').forEach(el => el.classList.remove('is-error'));
    if (overBalance && selectedRadio) {
      const small = selectedRadio.closest('.fee-option')?.querySelector('.fee-option__content .muted');
      if (small) small.classList.add('is-error');
    }
    // Amount input red underline if any error active
    const anyAmountError = amountOverPerTx || overBalance;
    if (amountInputWrap) {
      amountInputWrap.classList.toggle('is-error', anyAmountError);
    }

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
      const label = natureSelect.selectedOptions?.[0]?.textContent?.trim() || '';
      const filled = !!(natureSelect.value);
      if (v) v.textContent = filled ? label : '- -';
      natureSelect.classList.toggle('is-filled', !!natureSelect.value);
    }
    if (summaryRows.purpose && purposeSelect) {
      const v = summaryRows.purpose.querySelector('strong');
      const label = purposeSelect.selectedOptions?.[0]?.textContent?.trim() || '';
      const filled = !!(purposeSelect.value);
      if (v) v.textContent = filled ? label : '- -';
      purposeSelect.classList.toggle('is-filled', !!purposeSelect.value);
    }

    // Toggle supporting docs section based on nature selection
    const docsTitle = document.getElementById('docs-title');
    const docsWrap = document.getElementById('docs');
    const spanNature = docsTitle?.querySelector('[data-docs-nature]');
    const pre = document.getElementById('docs-pre');
    const post = document.getElementById('docs-post');
    if (!natureSelect || !docsTitle || !docsWrap || !pre || !post) return;
    const natureVal = natureSelect.value;
    const natureTxt = natureSelect.selectedOptions?.[0]?.textContent?.trim() || '';
    const isChosen = !!natureVal;
    docsTitle.hidden = !isChosen;
    docsWrap.hidden = !isChosen;
    if (!isChosen) return;
    if (spanNature) spanNature.textContent = natureTxt;
    const isPre = natureVal === 'pre_shipment';
    const isNatureChanged = natureVal !== lastNatureVal;
    pre.hidden = !isPre;
    post.hidden = isPre;

    // Reset and sync doc-type card
    const docTypeSelect = document.getElementById('docType');
    const card = document.querySelector('.doc-type-card');
    const badge = card?.querySelector('.doc-type__badge');
    const title = card?.querySelector('.doc-type__title');
    const desc = card?.querySelector('.doc-type__texts small');
    const syncDocCard = () => {
      if (!docTypeSelect || !card) return;
      const val = docTypeSelect.value;
      const numField   = document.getElementById('docNumberField');
      const numLabel   = document.getElementById('docNumberLabel');
      const uploadBlock = document.getElementById('docUploadBlock');
      const upTitle    = document.getElementById('docUploadTitle');
      const upDesc     = document.getElementById('docUploadDesc');
      const upBadge    = document.getElementById('docUploadBadge');
      const upIcon     = document.getElementById('docUploadIcon');

      if (!val) {
        if (badge) badge.classList.add('is-hidden');
        if (title) { title.textContent = 'Select'; title.classList.add('is-placeholder'); }
        card.classList.add('is-placeholder');
        if (desc) desc.textContent = '';
        if (numField) numField.hidden = true;
        if (uploadBlock) uploadBlock.hidden = true;
      } else if (val === 'PI') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Proforma Invoice (PI)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A preliminary bill issued by seller before delivery';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Proforma Invoice (PI) number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Proforma Invoice (PI)';
        if (upDesc)  upDesc.textContent  = 'Must include Proforma Invoice (PI) number';
        if (upIcon)  upIcon.src = 'assets/icon_upload_1.svg';
      } else if (val === 'PO') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Purchase Order (PO)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A document to request goods/services issued by buyer';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Purchase Order (PO) number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Purchase Order (PO)';
        if (upDesc)  upDesc.textContent  = 'Must include Purchase Order (PO) number';
        if (upIcon)  upIcon.src = 'assets/icon_upload_1.svg';
      }
    };
    if (docTypeSelect) {
      // set default to placeholder on show
      if (isPre && isNatureChanged) docTypeSelect.value = '';
      docTypeSelect.addEventListener('change', () => { syncDocCard(); if (typeof validateSendForm === 'function') validateSendForm(); });
    }
    syncDocCard();
    if (typeof validateSendForm === 'function') validateSendForm();
    lastNatureVal = natureVal;

    // Attach validation to docs inputs so changing them re-validates immediately
    const piNumber = document.getElementById('piNumber');
    const ciNumber = document.getElementById('ciNumber');
    if (piNumber) {
      piNumber.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      piNumber.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    }
    if (ciNumber) {
      ciNumber.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      ciNumber.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    }
  };

  // Ensure purpose select gets filled styling and summary even when selected first
  const updatePurposeOnly = () => {
    if (!purposeSelect || !summaryRows.purpose) return;
    const v = summaryRows.purpose.querySelector('strong');
    const label = purposeSelect.selectedOptions?.[0]?.textContent?.trim() || '';
    const filled = !!purposeSelect.value;
    if (v) v.textContent = filled ? label : '- -';
    purposeSelect.classList.toggle('is-filled', filled);
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
      // Cap to maximum allowed numeric value (1,000,000)
      const MAX_CAP = 1000000;
      if (raw !== '' && !isNaN(parseFloat(raw)) && parseFloat(raw) > MAX_CAP) {
        raw = String(MAX_CAP);
      }
      if (raw === '') {
        input.value = '';
        updateSummary();
        if (typeof validateSendForm === 'function') validateSendForm();
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
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    amountInput.addEventListener('input', formatCurrencyInput, { passive: true });
    amountInput.addEventListener('change', formatCurrencyInput);
  }
  feeRadios.forEach(r => r.addEventListener('change', () => { updateSummary(); if (typeof validateSendForm === 'function') validateSendForm(); }));
  deductRadios.forEach(r => r.addEventListener('change', () => { updateSummary(); if (typeof validateSendForm === 'function') validateSendForm(); }));
  if (natureSelect) natureSelect.addEventListener('change', () => { updateNaturePurpose(); if (typeof validateSendForm === 'function') validateSendForm(); });
  if (purposeSelect) purposeSelect.addEventListener('change', () => { 
    if (typeof updatePurposeOnly === 'function') updatePurposeOnly(); 
    if (typeof validateSendForm === 'function') validateSendForm(); 
  });
  // Generic listeners so clearing any field re-validates immediately
  const attachValidationListeners = () => {
    const formRoot = document.querySelector('.form');
    if (!formRoot) return;
    formRoot.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach((el) => {
      el.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      el.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    });
    formRoot.querySelectorAll('select').forEach((el) => {
      el.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    });
  };
  attachValidationListeners();
  // Initial compute
  updateSummary();
  updateNaturePurpose();
  if (typeof updatePurposeOnly === 'function') updatePurposeOnly();
  syncAccountDisplay();
  if (typeof validateSendForm === 'function') validateSendForm();

  // ---- Upload item interactions ----
  const initUploadItems = () => {
    const allUploadButtons = document.querySelectorAll('.upload-item .btn');
    allUploadButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.upload-item');
        if (!item) return;
        // Mark as uploaded
        item.classList.add('is-uploaded');
        // Title and subtitle
        const titleEl = item.querySelector('.upload-item__title');
        const subEl = item.querySelector('.upload-item__meta small');
        if (subEl) subEl.textContent = 'Document123.pdf';
        // Badge background handled via CSS; swap icon
        const badgeImg = item.querySelector('.upload-item__badge img');
        if (badgeImg) badgeImg.src = 'assets/icon_snackbar_success.svg';
        // Button to secondary + text
        btn.classList.remove('btn--primary');
        btn.classList.add('btn--secondary');
        btn.textContent = 'Re-upload';
        if (typeof validateSendForm === 'function') validateSendForm();
      }, { passive: true });
    });
  };
  initUploadItems();
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


