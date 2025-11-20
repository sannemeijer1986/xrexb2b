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
    const confirmBtn = document.getElementById('confirm-send');
    // Only allow open when valid
    const isDisabled = confirmBtn ? confirmBtn.disabled : true;
    if (isDisabled) return;
    const modal = document.getElementById('confirmPaymentModal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  });

  // ---- Live summary calculations (Amount + Fees) ----
  const amountInput = document.getElementById('amount');
  const feeRadios = document.querySelectorAll('input[type="radio"][name="fee"]');
  const deductRadios = document.querySelectorAll('input[type="radio"][name="deduct"]');
  const natureSelect = document.getElementById('nature');
  const purposeSelect = document.getElementById('purpose');
  let lastNatureVal = natureSelect ? natureSelect.value : '';

  const summaryContainer = document.querySelector('.card--summary');
  const findSummaryRow = (labelText) => {
    let row = null;
    const scope = summaryContainer || document;
    scope.querySelectorAll('.summary-pair, .summary-pair.summary-pair--large').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        row = pair;
      }
    });
    return row;
  };
  const findSummaryRowStartsWith = (prefixText) => {
    let row = null;
    const scope = summaryContainer || document;
    scope.querySelectorAll('.summary-pair').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase().startsWith(prefixText.toLowerCase())) {
        row = pair;
      }
    });
    return row;
  };

  const summaryRows = {
    subtotal: findSummaryRow('Your subtotal'),
    serviceTitle: (summaryContainer || document).querySelector('.summary-pair[data-summary="service-title"]'),
    servicePayer: (summaryContainer || document).querySelector('[data-summary="service-payer"]'),
    servicePayee: (summaryContainer || document).querySelector('[data-summary="service-payee"]'),
    amountPayable: findSummaryRow('Amount payable'),
    deductFrom: findSummaryRow('Deduct from'),
    nature: findSummaryRow('Nature'),
    purpose: findSummaryRow('Purpose'),
    youPay: findSummaryRow('You pay'),
    payeeReceives: findSummaryRow('Send to receiver'),
    // Conversion row label starts with \"Conversion\" (e.g. \"Conversion rate\")
    conversion: findSummaryRowStartsWith('Conversion'),
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

  // Mobile summary fixed fallback: pin when near "Amount and fees"
  (function initMobileSummaryPin() {
    const root = document.querySelector('main.page--send');
    if (!root) return;
    const summaryCard = document.querySelector('.card--summary');
    if (!summaryCard) return;
    const getHeaderH = () => {
      const h = document.querySelector('.site-header .header__content');
      return h ? h.offsetHeight : 64;
    };
    const getAmtTitle = () => {
      const nodes = Array.from(document.querySelectorAll('h2.card__title'));
      return nodes.find(n => (n.textContent || '').trim().toLowerCase().includes('amount and fees'));
    };
    const onScroll = () => {
      const isMobile = window.innerWidth < DESKTOP_BP;
      if (!isMobile) {
        summaryCard.classList.remove('is-fixed-mobile');
        return;
      }
      const t = getAmtTitle();
      if (!t) return;
      const headerH = getHeaderH();
      const top = t.getBoundingClientRect().top;
      // If the section header has reached the viewport (under the header), fix it
      if (top <= headerH + 8) {
        summaryCard.classList.add('is-fixed-mobile');
        summaryCard.style.top = `${headerH}px`;
      } else {
        summaryCard.classList.remove('is-fixed-mobile');
        summaryCard.style.top = '';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();

  // ---- Enable/disable Confirm send based on filled inputs/selects ----
  const confirmBtn = document.getElementById('confirm-send');
  const confirmBtnSticky = document.getElementById('confirm-send-sticky');
  const isElementVisible = (el) => {
    if (!el) return false;
    if (el.hidden) return false;
    if (el.closest('[hidden]')) return false;
    const rect = el.getBoundingClientRect();
    return !(rect.width === 0 && rect.height === 0);
  };
  const setConfirmDisabled = (disabled) => {
    [confirmBtn, confirmBtnSticky].forEach((btn) => {
      if (!btn) return;
      if (disabled) {
        btn.setAttribute('aria-disabled', 'true');
        btn.disabled = true;
      } else {
        btn.setAttribute('aria-disabled', 'false');
        btn.disabled = false;
      }
    });
  };
  const validateSendForm = () => {
    const natureEl = document.getElementById('nature');
    const purposeEl = document.getElementById('purpose');
    const amountEl = document.getElementById('amount');
    const pre = document.getElementById('docs-pre');
    const post = document.getElementById('docs-post');

    const isFilledText = (el) => !!(el && String(el.value || '').trim().length >= 1);
    const isFilledSelect = (el) => !!(el && String(el.value || '') !== '');

    const natureOk = isFilledSelect(natureEl);
    const purposeElValue = purposeEl ? purposeEl.value : '';
    const purposeOthersEl = document.getElementById('purposeOthers');
    // Purpose is valid if it's selected
    // If "others" is selected, the purposeOthers field becomes required and must be filled
    let purposeOk = isFilledSelect(purposeEl);
    if (purposeOk && purposeElValue === 'others') {
      // When "Others" is selected, the purposeOthers field is required
      purposeOk = purposeOthersEl && isFilledText(purposeOthersEl);
    }
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
        const uploadsOk = Array.from(uploads).every(item => item.classList.contains('is-uploaded'));
        // Make PI/PO number optional for prototype; only type + upload required
        docsOk = docTypeOk && uploadsOk;
      } else if (post && !post.hidden) {
        const uploads = document.querySelectorAll('#docs-post .upload-item');
        const uploadsOk = Array.from(uploads).every((item) => {
          const uploaded = item.classList.contains('is-uploaded');
          // Treat the adjacent \"I don't have this document\" checkbox as a valid alternative
          let missedOk = false;
          const maybeMissRow = item.nextElementSibling;
          if (maybeMissRow && maybeMissRow.classList && maybeMissRow.classList.contains('doc-miss-row')) {
            const missChk = maybeMissRow.querySelector('input[type=\"checkbox\"]');
            if (missChk) missedOk = !!missChk.checked;
          }
          return uploaded || missedOk;
        });
        // CI number becomes optional; only document states matter
        docsOk = uploadsOk;
      }
    } else {
      docsOk = false;
    }

    // Inline errors present?
    const amountWrap = document.querySelector('.amount-input');
    const domAmountError = document.getElementById('amount-error');
    const hasInlineError =
      (amountWrap && amountWrap.classList.contains('is-error')) ||
      (domAmountError && domAmountError.hidden === false);

    // Conversion terms checkbox validation (required when USDT is selected)
    const payerCurrency = getPayerCurrency();
    const conversionTermsCheckbox = document.getElementById('conversionTermsCheckbox');
    const conversionTermsOk = payerCurrency !== 'USDT' || (conversionTermsCheckbox && conversionTermsCheckbox.checked);

    const allValid = natureOk && purposeOk && amountOk && docsOk && !hasInlineError && conversionTermsOk;
    setConfirmDisabled(!allValid);
  };

  const getFeeMode = () => {
    const selected = Array.from(feeRadios).find(r => r.checked);
    return selected ? selected.value : 'you';
  };

  const setServiceBreakdown = (payerPctAbs, payeePctAbs) => {
    const payerLabel = summaryRows.servicePayer && summaryRows.servicePayer.querySelector('.muted');
    const payeeLabel = summaryRows.servicePayee && summaryRows.servicePayee.querySelector('.muted');
    if (payerLabel) payerLabel.textContent = `${Number(payerPctAbs).toFixed(2)}% paid by you`;
    if (payeeLabel) payeeLabel.textContent = `${Number(payeePctAbs).toFixed(2)}% paid by receiver`;
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
    // Toggle conversion terms checkbox section
    const conversionTerms = document.getElementById('conversion-terms');
    if (conversionTerms) {
      conversionTerms.hidden = payerCurrency !== 'USDT';
      // Reset checkbox when hidden
      if (payerCurrency !== 'USDT') {
        const checkbox = document.getElementById('conversionTermsCheckbox');
        if (checkbox) {
          checkbox.checked = false;
        }
      }
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
        ? `Amount payable exceeds ${formatAmount(PER_TX_LIMIT, 'USD')} transaction limit`
        : `Transaction limit: ${formatAmount(PER_TX_LIMIT, 'USD')}`;
    }
    // Inline error for amount exceeding selected account balance (consider payer fee share)
    const amountError = document.getElementById('amount-error');
    const selectedRadio = Array.from(document.querySelectorAll('.fee-options--deduct input[type="radio"]')).find(r => r.checked);
    const balanceText = selectedRadio?.closest('.fee-option')?.querySelector('.fee-option__content .muted')?.textContent || '';
    const balanceNum = (() => {
      const m = balanceText.replace(/[^0-9.]/g, '');
      return parseFloat(m || '0') || 0;
    })();
    const overBalance = youPay > balanceNum;
    if (amountError) {
      amountError.hidden = !overBalance;
      if (overBalance) {
        // Compose message: show Amount payable + X% fee (computed total) exceeds avail <currency> balance
        const pctNum = (typeof payerPctAbs === 'number' && payerPctAbs > 0) ? payerPctAbs : 0;
        const pctStr = Number(pctNum).toFixed(2);
        const label = pctNum > 0 ? `Amount payable + ${pctStr}% fee` : 'Amount payable';
        const totalStr = Number(youPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        amountError.textContent = `${label} (${totalStr}) exceeds balance`;
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
      if (lbl) lbl.textContent = 'Service fee';
      const pct = summaryRows.serviceTitle.querySelector('strong');
      if (pct) pct.textContent = `${(feeRate * 100).toFixed(2)}%`;
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
      // Show/hide "See convert details" button based on USDT selection
      const convertDetailsBtn = document.getElementById('fees-details-open');
      if (convertDetailsBtn) {
        convertDetailsBtn.style.display = showConversion ? '' : 'none';
      }
    }
    if (summaryRows.payeeReceives) {
      const v = summaryRows.payeeReceives.querySelector('strong');
      if (v) v.textContent = formatAmount(payeeGets, payeeCurrency);
    }
    // Update mobile sticky amount
    const stickyAmt = document.getElementById('mobileStickyAmount');
    if (stickyAmt) {
      // Preserve the chevron image if it exists
      const chevron = stickyAmt.querySelector('.ms-chevron');
      const chevronClone = chevron ? chevron.cloneNode(true) : null;
      stickyAmt.textContent = formatAmount(payeeGets, payeeCurrency);
      if (chevronClone) {
        stickyAmt.appendChild(chevronClone);
      }
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
    // Populate Convert details modal (populate whatever fields exist)
    (function populateConvertModal() {
      const cvFromEl = document.getElementById('cv-from');
      const cvFeePctEl = document.getElementById('cv-fee-pct');
      const cvFeeAmtEl = document.getElementById('cv-fee-amt');
      const cvNetEl = document.getElementById('cv-net');
      const cvRateEl = document.getElementById('cv-rate');
      const cvToEl = document.getElementById('cv-to');
      // Currently 0% conversion fee and 1:1 rate
      const convertFeePct = 0.00;
      const convertFeeAmt = 0.00;
      const convertFrom = amount; // amount is in payeeCurrency; rate is 1:1
      if (cvFromEl) cvFromEl.textContent = formatAmount(convertFrom, payerCurrency);
      if (cvFeePctEl) cvFeePctEl.textContent = `${convertFeePct.toFixed(2)}%`;
      if (cvFeeAmtEl) cvFeeAmtEl.textContent = convertFeeAmt ? formatAmount(convertFeeAmt, payerCurrency) : '--';
      if (cvNetEl) cvNetEl.textContent = formatAmount(convertFrom - convertFeeAmt, payerCurrency);
      if (cvRateEl) cvRateEl.textContent = `1 ${payerCurrency} = 1 ${payeeCurrency}`;
      if (cvToEl) cvToEl.textContent = formatAmount(amount, payeeCurrency);
    })();
    // Update Fees Details modal fields when present
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('fd-subtotal', formatAmount(subtotal, payeeCurrency)); // subtotal is in USD
    setText('fd-payer', formatAmount(payerFee, payerCurrency));
    setText('fd-receiver', formatAmount(receiverFee, payeeCurrency));
    setText('fd-youpay', formatAmount(youPay, payerCurrency));
    setText('fd-getspaid', formatAmount(payeeGets, payeeCurrency));
    const payerPctStr = (payerRate * 100).toFixed(2);
    const recvPctStr  = (receiverRate * 100).toFixed(2);
    setText('fd-payer-label', `${payerPctStr}% paid by you`);
    setText('fd-receiver-label', `${recvPctStr}% paid by receiver`);
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
    if (spanNature) spanNature.textContent = natureTxt.toLowerCase();
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
        if (title) { title.textContent = 'Proforma invoice (PI)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A preliminary invoice issued by the seller before delivery';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Proforma invoice number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Proforma invoice (PI)';
        if (upDesc)  upDesc.textContent  = 'Must include Proforma Invoice (PI) number';
        if (upIcon)  upIcon.src = 'assets/icon_upload_1.svg';
      } else if (val === 'PO') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Purchase order (PO)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A buyer-issued document requesting goods or services';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Purchase order number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Purchase order (PO)';
        // if (upDesc)  upDesc.textContent  = 'Must include Purchase Order (PO) number';
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
    const docNotes = document.getElementById('docNotes');
    const notesCounter = document.getElementById('docNotesCounter');
    const docNotesPost = document.getElementById('docNotesPost');
    const notesCounterPost = document.getElementById('docNotesPostCounter');
    const updateNotesCounter = () => {
      if (docNotes && notesCounter) {
        const len = String(docNotes.value || '').length;
        const capped = Math.min(40, len);
        notesCounter.textContent = `${capped}/40`;
        docNotes.classList.toggle('is-filled', capped > 0);
      }
      if (docNotesPost && notesCounterPost) {
        const len2 = String(docNotesPost.value || '').length;
        const capped2 = Math.min(40, len2);
        notesCounterPost.textContent = `${capped2}/40`;
        docNotesPost.classList.toggle('is-filled', capped2 > 0);
      }
    };
    if (piNumber) {
      piNumber.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      piNumber.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    }
    if (ciNumber) {
      ciNumber.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      ciNumber.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    }
    if (docNotes) {
      docNotes.addEventListener('input', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      docNotes.addEventListener('change', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); });
      updateNotesCounter();
    } else if (notesCounter) {
      notesCounter.textContent = '0/25';
    }
    if (docNotesPost) {
      docNotesPost.addEventListener('input', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      docNotesPost.addEventListener('change', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); });
      updateNotesCounter();
    } else if (notesCounterPost) {
      notesCounterPost.textContent = '0/25';
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
  const conversionTermsCheckbox = document.getElementById('conversionTermsCheckbox');
  if (conversionTermsCheckbox) {
    conversionTermsCheckbox.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
  }
  if (natureSelect) natureSelect.addEventListener('change', () => { updateNaturePurpose(); if (typeof validateSendForm === 'function') validateSendForm(); });
  const purposeOthersField = document.getElementById('purpose-others-field');
  const purposeOthersInput = document.getElementById('purposeOthers');
  if (purposeSelect) {
    purposeSelect.addEventListener('change', () => { 
      const isOthers = purposeSelect.value === 'others';
      if (purposeOthersField) {
        purposeOthersField.style.display = isOthers ? '' : 'none';
      }
      if (isOthers && purposeOthersInput) {
        // Auto-focus when "Others" is selected
        setTimeout(() => {
          purposeOthersInput.focus();
        }, 10);
      } else if (purposeOthersInput) {
        // Clear the field when switching away from "Others"
        purposeOthersInput.value = '';
        purposeOthersInput.classList.remove('is-filled');
      }
      if (typeof updatePurposeOnly === 'function') updatePurposeOnly(); 
      if (typeof validateSendForm === 'function') validateSendForm(); 
    });
  }
  // Handle input styling for purposeOthers field
  if (purposeOthersInput) {
    purposeOthersInput.addEventListener('input', () => {
      const hasValue = purposeOthersInput.value.trim().length > 0;
      purposeOthersInput.classList.toggle('is-filled', hasValue);
      if (typeof validateSendForm === 'function') validateSendForm();
    }, { passive: true });
    purposeOthersInput.addEventListener('change', () => {
      if (typeof validateSendForm === 'function') validateSendForm();
    });
  }
  // Initialize purposeOthers field visibility on page load
  if (purposeSelect && purposeOthersField) {
    const isOthers = purposeSelect.value === 'others';
    purposeOthersField.style.display = isOthers ? '' : 'none';
  }
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
    const ensureActions = (item) => {
      let actions = item.querySelector('.upload-item__actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'upload-item__actions';
        const btn = item.querySelector('.btn');
        if (btn) {
          item.replaceChild(actions, btn);
          actions.appendChild(btn);
        } else {
          item.appendChild(actions);
        }
      }
      return actions;
    };
    // Update doc-miss-row disabled state based on upload-item state
    const updateDocMissRowState = (item) => {
      const nextSibling = item.nextElementSibling;
      const missRow = nextSibling && nextSibling.classList.contains('doc-miss-row') ? nextSibling : null;
      if (missRow) {
        const checkbox = missRow.querySelector('input[type="checkbox"]');
        const isUploaded = item.classList.contains('is-uploaded');
        if (checkbox) {
          checkbox.disabled = isUploaded;
          if (isUploaded) {
            checkbox.checked = false; // Uncheck if uploaded
            missRow.classList.add('is-disabled');
          } else {
            missRow.classList.remove('is-disabled');
          }
        }
      }
    };
    const setNotUploaded = (item) => {
      item.classList.remove('is-uploaded');
      const badgeImg = item.querySelector('.upload-item__badge img');
      if (badgeImg) badgeImg.src = 'assets/icon_upload_1.svg';
      const subEl = item.querySelector('.upload-item__meta small');
      const inPre = !!item.closest('#docs-pre');
      const inPost = !!item.closest('#docs-post');
      if (subEl) {
        if (inPre) {
          subEl.textContent = '';
        } else if (inPost) {
          const titleTxt = (item.querySelector('.upload-item__title')?.textContent || '').toLowerCase();
          let desc = '';
          if (titleTxt.includes('commercial invoice')) {
            desc = 'The official invoice issued by the seller after shipment';
          } else if (titleTxt.includes('transport')) {
            desc = 'Proof of shipment e.g., bill of lading, airway bill, or courier waybill';
          } else if (titleTxt.includes('packing')) {
            desc = 'Detailed list of goods included in the shipment';
          }
          subEl.textContent = desc;
        } else {
          subEl.textContent = '';
        }
      }
      const actions = ensureActions(item);
      const mainBtn = actions.querySelector('.btn');
      if (mainBtn) {
        mainBtn.classList.add('btn--primary');
        mainBtn.classList.remove('btn--secondary');
        mainBtn.textContent = 'Upload';
      }
      const resetBtn = actions.querySelector('.upload-reset');
      if (resetBtn) resetBtn.remove();
      // Re-enable doc-miss-row when not uploaded
      updateDocMissRowState(item);
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    const setUploaded = (item) => {
      item.classList.add('is-uploaded');
      const actions = ensureActions(item);
      // Subtitle per context
      const subEl = item.querySelector('.upload-item__meta small');
      const inPre = !!item.closest('#docs-pre');
      const inPost = !!item.closest('#docs-post');
      if (subEl) {
        let filename = '';
        if (inPre) {
          filename = 'Invoice123.pdf';
        } else if (inPost) {
          const list = Array.from(item.parentElement?.querySelectorAll('.upload-item') || []);
          const idx = Math.max(0, list.indexOf(item));
          const labels = ['AInvoice123.pdf', 'BInvoice123.pdf', 'CInvoice123.pdf'];
          filename = labels[idx] || 'Document123.pdf';
        } else {
          filename = 'Document123.pdf';
        }
        // Wrap filename in a link for prototype realism
        subEl.innerHTML = `<a href="#" target="_blank">${filename}</a>`;
      }
      // Badge icon success
      const badgeImg = item.querySelector('.upload-item__badge img');
      if (badgeImg) badgeImg.src = 'assets/icon_snackbar_success.svg';
      // Main button shows "Remove file" while uploaded
      let mainBtn = actions.querySelector('.btn');
      if (mainBtn) {
        mainBtn.classList.remove('btn--primary');
        mainBtn.classList.add('btn--secondary');
        mainBtn.textContent = 'Remove file';
      }
      // Disable doc-miss-row when uploaded
      updateDocMissRowState(item);
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    // Ensure initial structure and default subtitles per context
    document.querySelectorAll('.upload-item').forEach((item) => {
      ensureActions(item);
      setNotUploaded(item);
    });
    // Wire main buttons: toggle state on click
    document.querySelectorAll('.upload-item .upload-item__actions .btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.upload-item');
        if (!item) return;
        if (item.classList.contains('is-uploaded')) {
          setNotUploaded(item);
          // Snackbar: File removed
          if (typeof window.showSnackbar === 'function') {
            window.showSnackbar('File removed');
          } else {
            // fallback
            const el = document.createElement('div');
            el.className = 'snackbar snackbar--success';
            el.innerHTML = '<img class="snackbar__icon" src="assets/icon_snackbar_success.svg" alt=""/><span>File removed</span>';
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('is-visible'));
            setTimeout(() => {
              el.classList.remove('is-visible');
              setTimeout(() => el.remove(), 250);
            }, 2000);
          }
        } else {
          setUploaded(item);
        }
      }, { passive: true });
    });
  };
  initUploadItems();
  
  // Prevent default link behavior for uploaded file name links (prototype only)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.upload-item.is-uploaded .upload-item__meta .muted a');
    if (link) {
      e.preventDefault();
    }
  }, { passive: false });

  // Revalidate + UI when post-shipment missing-document checkboxes change
  const updateMissingDocsUI = () => {
    const post = document.getElementById('docs-post');
    if (!post) return;
    const declare = post.querySelector('#docsDeclare');
    const missRows = Array.from(post.querySelectorAll('.doc-miss-row'));
    const missingTypes = [];
    missRows.forEach((row) => {
      const cb = row.querySelector('input[type="checkbox"]');
      const prev = row.previousElementSibling;
      const item = (prev && prev.classList && prev.classList.contains('upload-item')) ? prev : null;
      if (!cb || !item) return;
      const titleEl = item.querySelector('.upload-item__title');
      const title = (titleEl && titleEl.textContent || '').trim();
      const isTransport = /transport/i.test(title);
      const isPacking = /pack/i.test(title);
      if (cb.checked) {
        // Mark as missing and reset to default
        item.classList.add('is-missing');
        // reset upload state
        item.classList.remove('is-uploaded');
        const badgeImg = item.querySelector('.upload-item__badge img');
        if (badgeImg) badgeImg.src = 'assets/icon_upload_1.svg';
        const subEl = item.querySelector('.upload-item__meta small');
        if (subEl) {
          const lower = title.toLowerCase();
          if (lower.includes('commercial invoice')) {
            subEl.textContent = 'The official invoice issued by the seller after shipment';
          } else if (isTransport) {
            subEl.textContent = 'Proof of shipment e.g., bill of lading, airway bill, or courier waybill';
          } else if (isPacking) {
            subEl.textContent = 'Detailed list of goods included in the shipment';
          } else {
            subEl.textContent = '';
          }
        }
        // disable actions and normalize main button
        const actions = item.querySelector('.upload-item__actions');
        if (actions) {
          const mainBtn = actions.querySelector('.btn:not(.upload-reset)');
          if (mainBtn) {
            mainBtn.classList.add('btn--primary');
            mainBtn.classList.remove('btn--secondary');
            mainBtn.textContent = 'Upload';
            mainBtn.disabled = true;
          }
          const resetBtn = actions.querySelector('.upload-reset');
          if (resetBtn) resetBtn.remove();
        }
        // Remove disabled state from doc-miss-row since item is now not uploaded
        row.classList.remove('is-disabled');
        cb.disabled = false;
        if (isTransport) missingTypes.push('transport document');
        if (isPacking) missingTypes.push('packing list');
      } else {
        // unmark missing and re-enable actions
        item.classList.remove('is-missing');
        const actions = item.querySelector('.upload-item__actions');
        if (actions) {
          actions.querySelectorAll('button').forEach(b => { b.disabled = false; });
        }
        // Update disabled state of doc-miss-row based on upload state
        const nextSibling = item.nextElementSibling;
        const missRow = nextSibling && nextSibling.classList.contains('doc-miss-row') ? nextSibling : null;
        if (missRow) {
          const missCb = missRow.querySelector('input[type="checkbox"]');
          const isUploaded = item.classList.contains('is-uploaded');
          if (missCb) {
            missCb.disabled = isUploaded;
            if (isUploaded) {
              missCb.checked = false;
              missRow.classList.add('is-disabled');
            } else {
              missRow.classList.remove('is-disabled');
            }
          }
        }
      }
    });
    const unique = Array.from(new Set(missingTypes));
    if (declare) {
      if (unique.length > 0) {
        // Singular label for legacy span (as originally designed)
        const singularText = unique.length === 1 ? unique[0] : unique.slice(0, 2).join(' or ');
        // Pluralize each type for title sentence variant
        const pluralized = unique.map(t => t.endsWith('s') ? t : `${t}s`);
        const pluralText = pluralized.length === 1 ? pluralized[0] : pluralized.slice(0, 2).join(' or ');
        const span = declare.querySelector('#docsDeclareTypes');
        if (span) span.textContent = singularText;
        const titleEl = declare.querySelector('.docs-declare__title');
        if (titleEl) {
          titleEl.textContent = `By proceeding, I confirm that this payment does not involve any ${pluralText}`;
        }
        declare.hidden = false;
      } else {
        declare.hidden = true;
      }
    }
    if (typeof validateSendForm === 'function') validateSendForm();
  };
  document.querySelectorAll('#docs-post .doc-miss-row input[type=\"checkbox\"]').forEach((chk) => {
    chk.addEventListener('change', updateMissingDocsUI, { passive: true });
    // Prevent clicks on disabled checkboxes
    chk.addEventListener('click', (e) => {
      if (chk.disabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
    // Also prevent clicks on the label when checkbox is disabled
    const label = chk.closest('.doc-miss');
    if (label) {
      label.addEventListener('click', (e) => {
        if (chk.disabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
    }
  });
  // run once on init
  updateMissingDocsUI();

  // Open convert/fees details modal
  // const feesOpen = document.getElementById('fees-details-open');
  // if (feesOpen) {
  //   feesOpen.addEventListener('click', (e) => {
  //     e.preventDefault();
  //     const modal = document.getElementById('convertDetailsModal') || document.getElementById('feesDetailsModal');
  //     if (!modal) return;
  //     modal.setAttribute('aria-hidden', 'false');
  //     document.documentElement.classList.add('modal-open');
  //     document.body.classList.add('modal-open');
  //     try {
  //       const y = window.scrollY || window.pageYOffset || 0;
  //       document.body.dataset.scrollY = String(y);
  //       document.body.style.top = `-${y}px`;
  //       document.body.classList.add('modal-locked');
  //     } catch (_) {}
  //   });
  // }
  // Mobile summary modal open
  const mobileSummaryOpen = document.getElementById('mobileSummaryOpen');
  if (mobileSummaryOpen) {
    mobileSummaryOpen.addEventListener('click', (e) => {
      e.preventDefault();
      // Ensure summary is up to date before cloning
      updateSummary();
      // Small delay to ensure DOM updates
      setTimeout(() => {
        const host = document.getElementById('mobileSummaryContent');
        const card = document.querySelector('.card--summary');
        const recip = document.querySelector('.summary-recipient');
        const modal = document.getElementById('mobileSummaryModal');
        if (host && card) {
          const sectionHead = card.querySelector('.summary-section-head');
          // Prefer the amount & fees box; fall back to second summary-box, then any
          let box = card.querySelector('#summaryBoxAmount');
          if (!box) {
            const allBoxes = card.querySelectorAll('.summary-box');
            if (allBoxes.length > 1) {
              box = allBoxes[1];
            } else {
              box = allBoxes[0] || null;
            }
          }
          host.innerHTML = '';
          // Outer wrapper for modal layout
          const wrap = document.createElement('div');
          wrap.className = 'summary-modal-copy';
          // Card wrapper that mimics desktop summary card but without .card--summary
          const modalCard = document.createElement('div');
          modalCard.className = 'card card--section summary-modal-card';
          // Clone recipient chip
          if (recip) {
            const r = recip.cloneNode(true);
            modalCard.appendChild(r);
          }
          // Clone section head if it exists - force it visible
          if (sectionHead) {
            const sh = sectionHead.cloneNode(true);
            sh.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            modalCard.appendChild(sh);
          }
          if (box) {
            const b = box.cloneNode(true);
            // Ensure the box itself is visible
            b.style.display = 'block';
            b.style.visibility = 'visible';
            b.style.opacity = '1';
            // Remove any inline styles that hide items
            b.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style');
              if (style && (style.includes('display:none') || style.includes('display: none'))) {
                el.removeAttribute('style');
              }
            });
            // Force ALL summary pairs and content to be visible with inline styles
            const pairs = b.querySelectorAll('.summary-pair');
            pairs.forEach(el => {
              el.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
              el.classList.remove('is-hidden');
              // Make all children visible too
              el.querySelectorAll('*').forEach(child => {
                child.style.cssText += 'visibility: visible !important; opacity: 1 !important;';
              });
            });
            b.querySelectorAll('.summary-separator').forEach(el => {
              el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            });
            b.querySelectorAll('.summary-note').forEach(el => {
              el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            });
            // Hide conversion rate element if USD is selected (after cloning, check current state)
            const payerCurrency = getPayerCurrency();
            const showConversion = payerCurrency !== payeeCurrency;
            const clonedConvertDetails = b.querySelector('#fees-details-open');
            if (clonedConvertDetails) {
              clonedConvertDetails.style.display = showConversion ? '' : 'none';
            }
            modalCard.appendChild(b);
          } else {
            console.warn('Summary box not found for cloning');
          }
          // Clone summary-note if it exists (it's outside the summary-box)
          const summaryNote = card.querySelector('.summary-note');
          if (summaryNote) {
            const noteClone = summaryNote.cloneNode(true);
            noteClone.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            modalCard.appendChild(noteClone);
          }
          wrap.appendChild(modalCard);
          host.appendChild(wrap);
        
        if (modal) {
          modal.setAttribute('aria-hidden', 'false');
          document.documentElement.classList.add('modal-open');
          document.body.classList.add('modal-open');
          try {
            const y = window.scrollY || window.pageYOffset || 0;
            document.body.dataset.scrollY = String(y);
            document.body.style.top = `-${y}px`;
            document.body.classList.add('modal-locked');
          } catch (_) {}
        }
      }
      }, 10); // Small delay to ensure DOM updates
    });
  }
  // Review payment navigation (button is outside <form>)
  const confirmTrigger = document.getElementById('confirm-send');
  if (confirmTrigger) {
    confirmTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirmTrigger.disabled) {
        // On mobile/tablet: show tooltip on press and auto-hide
        const DESKTOP_BP = 1280;
        const tip = document.getElementById('confirm-tip');
        if (tip) {
          const rect = confirmTrigger.getBoundingClientRect();
          const container = tip.offsetParent || confirmTrigger.closest('.card--summary') || document.body;
          const crect = container.getBoundingClientRect();
          tip.hidden = false;
          // Position above button, centered
          // Use setTimeout to ensure we can read offsetWidth after showing
          setTimeout(() => {
            const tw = tip.offsetWidth;
            const th = tip.offsetHeight;
            const top = rect.top - crect.top - th - 12;
            const left = rect.left - crect.left + rect.width / 2 - tw / 2;
            tip.style.top = `${Math.max(8, top)}px`;
            tip.style.left = `${Math.max(8, left)}px`;
          }, 0);
          if (window.innerWidth < DESKTOP_BP) {
            clearTimeout(tip.__hideTimer);
            tip.__hideTimer = setTimeout(() => { tip.hidden = true; }, 2200);
          }
        }
        return;
      }
      // Build receipt data to review
      try {
        const getText = (sel) => (document.querySelector(sel)?.textContent || '').trim();
        const amountInput = document.getElementById('amount');
        const rawAmt = (amountInput?.value || '').replace(/,/g, '');
        const amount = parseFloat(rawAmt) || 0;
        const feeRate = 0.01;
        // Fee mode
        const feeSel = Array.from(document.querySelectorAll('input[type="radio"][name="fee"]')).find(r => r.checked)?.value || 'you';
        let payerRate = 0, receiverRate = 0;
        if (feeSel === 'you') { payerRate = feeRate; receiverRate = 0; }
        else if (feeSel === 'receiver') { payerRate = 0; receiverRate = feeRate; }
        else { payerRate = feeRate/2; receiverRate = feeRate/2; }
        // Payer currency
        const payerCurrency = Array.from(document.querySelectorAll('input[type="radio"][name="deduct"]')).find(r => r.checked)?.value || 'USD';
        const payeeCurrency = 'USD';
        const payerFee = amount * payerRate;
        const receiverFee = amount * receiverRate;
        const youPay = amount + payerFee;
        const payeeGets = amount - receiverFee;
        const fmt = (v, cur) => `${Number(v||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
        // Nature/Purpose labels
        const natureSel = document.getElementById('nature');
        const purposeSel = document.getElementById('purpose');
        const natureLabel = natureSel?.selectedOptions?.[0]?.textContent?.trim() || '';
        const purposeLabel = purposeSel?.selectedOptions?.[0]?.textContent?.trim() || '';
        // Doc numbers and attached docs (vary by nature)
        const piNumber = document.getElementById('piNumber')?.value || '';
        const ciNumber = document.getElementById('ciNumber')?.value || '';
        const docNotes = document.getElementById('docNotes')?.value || document.getElementById('docNotesPost')?.value || '';
        let docNumber = '';
        let docNumLabel = '';
        let attached = [];
        const natureVal = natureSel?.value || '';
        if (natureVal === 'pre_shipment') {
          const docTypeSel = document.getElementById('docType');
          const docTypeVal = docTypeSel ? docTypeSel.value : '';
          if (docTypeVal === 'PI') {
            attached = ['Proforma invoice (PI)'];
            docNumLabel = 'Proforma invoice number';
            docNumber = piNumber || '';
          } else if (docTypeVal === 'PO') {
            attached = ['Purchase order (PO)'];
            docNumLabel = 'Purchase order number';
            docNumber = piNumber || '';
          } else {
            attached = [];
            docNumLabel = '';
            docNumber = '';
          }
        } else {
          // Post-shipment: list uploaded or declared-missing docs
          document.querySelectorAll('#docs-post .upload-item').forEach((it) => {
            const title = it.querySelector('.upload-item__title')?.textContent?.trim();
            if (!title) return;
            const uploaded = it.classList.contains('is-uploaded');
            let missedOk = false;
            const maybeMissRow = it.nextElementSibling;
            if (maybeMissRow && maybeMissRow.classList && maybeMissRow.classList.contains('doc-miss-row')) {
              const missChk = maybeMissRow.querySelector('input[type=\"checkbox\"]');
              if (missChk) missedOk = !!missChk.checked;
            }
            if (uploaded || missedOk) attached.push(title);
          });
          docNumLabel = 'Commercial invoice number';
          docNumber = ciNumber || '';
        }
        const data = {
          receiverName: (getText('.summary-recipient .recipient-select__title') || '').replace(/^To\s+/i,''),
          receiverBank: getText('.summary-recipient .recipient-select__subtitle'),
          amountPayableFmt: fmt(amount, payeeCurrency),
          deductedFrom: `${payerCurrency} account`,
          feePct: `${(feeRate*100).toFixed(2)}%`,
          payerShareLabel: `${(payerRate*100).toFixed(2)}% paid by you`,
          payerShareAmt: fmt(payerFee, payerCurrency),
          receiverShareLabel: `${(receiverRate*100).toFixed(2)}% paid by receiver`,
          receiverShareAmt: fmt(receiverFee, payeeCurrency),
          toBeDeducted: fmt(youPay, payerCurrency),
          receiverGets: fmt(payeeGets, payeeCurrency),
          conversion: payerCurrency !== payeeCurrency ? `1 ${payerCurrency} = 1 ${payeeCurrency}` : '',
          nature: natureLabel,
          purpose: purposeLabel,
          docNumLabel,
          docNumber,
          docNotes,
          attachedDocs: attached.join(', '),
          dateTime: new Date().toLocaleString('en-GB', { hour12: false }),
          status: '{$status}',
        };
        sessionStorage.setItem('receiptData', JSON.stringify(data));
      } catch (_) {}
      // Show loading then navigate to review page
      const loading = document.getElementById('loadingModal');
      if (loading) {
        loading.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) {}
      }
      setTimeout(() => { window.location.href = 'review-payment.html'; }, 600);
    });
    // Desktop hover tooltip when inactive
    confirmTrigger.addEventListener('mouseenter', () => {
      const DESKTOP_BP = 1280;
      if (window.innerWidth < DESKTOP_BP) return;
      if (!confirmTrigger.disabled) return;
      const tip = document.getElementById('confirm-tip');
      if (!tip) return;
      const rect = confirmTrigger.getBoundingClientRect();
      const container = tip.offsetParent || confirmTrigger.closest('.card--summary') || document.body;
      const crect = container.getBoundingClientRect();
      tip.hidden = false;
      setTimeout(() => {
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        const top = rect.top - crect.top - th - 12;
        const left = rect.left - crect.left + rect.width / 2 - tw / 2;
        tip.style.top = `${Math.max(8, top)}px`;
        tip.style.left = `${Math.max(8, left)}px`;
      }, 0);
    });
    confirmTrigger.addEventListener('mouseleave', () => {
      const DESKTOP_BP = 1280;
      if (window.innerWidth < DESKTOP_BP) return;
      const tip = document.getElementById('confirm-tip');
      if (tip) tip.hidden = true;
    });
  }

// Mobile sticky confirm ("Review") button
const confirmTriggerInline = document.getElementById('confirm-send-sticky');
if (confirmTriggerInline) {
  confirmTriggerInline.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirmTriggerInline.disabled) return;
    try {
      const getText = (sel) => (document.querySelector(sel)?.textContent || '').trim();
      const amountInput = document.getElementById('amount');
      const rawAmt = (amountInput?.value || '').replace(/,/g, '');
      const amount = parseFloat(rawAmt) || 0;
      const feeRate = 0.01;
      const feeSel = Array.from(document.querySelectorAll('input[type="radio"][name="fee"]')).find(r => r.checked)?.value || 'you';
      let payerRate = 0, receiverRate = 0;
      if (feeSel === 'you') { payerRate = feeRate; receiverRate = 0; }
      else if (feeSel === 'receiver') { payerRate = 0; receiverRate = feeRate; }
      else { payerRate = feeRate/2; receiverRate = feeRate/2; }
      const payerCurrency = Array.from(document.querySelectorAll('input[type="radio"][name="deduct"]')).find(r => r.checked)?.value || 'USD';
      const payeeCurrency = 'USD';
      const payerFee = amount * payerRate;
      const receiverFee = amount * receiverRate;
      const youPay = amount + payerFee;
      const payeeGets = amount - receiverFee;
      const fmt = (v, cur) => `${Number(v||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
      const natureSel = document.getElementById('nature');
      const purposeSel = document.getElementById('purpose');
      const natureLabel = natureSel?.selectedOptions?.[0]?.textContent?.trim() || '';
      const purposeLabel = purposeSel?.selectedOptions?.[0]?.textContent?.trim() || '';
      const piNumber = document.getElementById('piNumber')?.value || '';
      const ciNumber = document.getElementById('ciNumber')?.value || '';
      const docNotes = document.getElementById('docNotes')?.value || document.getElementById('docNotesPost')?.value || '';
      let docNumber = '';
      let docNumLabel = '';
      let attached = [];
      const natureVal = natureSel?.value || '';
      if (natureVal === 'pre_shipment') {
        const docTypeSel = document.getElementById('docType');
        const docTypeVal = docTypeSel ? docTypeSel.value : '';
        if (docTypeVal === 'PI') {
          attached = ['Proforma invoice (PI)'];
          docNumLabel = 'Proforma invoice number';
          docNumber = piNumber || '';
        } else if (docTypeVal === 'PO') {
          attached = ['Purchase order (PO)'];
          docNumLabel = 'Purchase order number';
          docNumber = piNumber || '';
        } else {
          attached = [];
          docNumLabel = '';
          docNumber = '';
        }
      } else {
        document.querySelectorAll('#docs-post .upload-item').forEach((it) => {
          const title = it.querySelector('.upload-item__title')?.textContent?.trim();
          if (!title) return;
          const uploaded = it.classList.contains('is-uploaded');
          let missedOk = false;
          const maybeMissRow = it.nextElementSibling;
          if (maybeMissRow && maybeMissRow.classList && maybeMissRow.classList.contains('doc-miss-row')) {
            const missChk = maybeMissRow.querySelector('input[type="checkbox"]');
            if (missChk) missedOk = !!missChk.checked;
          }
          if (uploaded || missedOk) attached.push(title);
        });
        docNumLabel = 'Commercial invoice number';
        docNumber = ciNumber || '';
      }
      const data = {
        receiverName: (getText('.summary-recipient .recipient-select__title') || '').replace(/^To\s+/i,''),
        receiverBank: getText('.summary-recipient .recipient-select__subtitle'),
        amountPayableFmt: fmt(amount, payeeCurrency),
        deductedFrom: `${payerCurrency} account`,
        feePct: `${(feeRate*100).toFixed(2)}%`,
        payerShareLabel: `${(payerRate*100).toFixed(2)}% paid by you`,
        payerShareAmt: fmt(payerFee, payerCurrency),
        receiverShareLabel: `${(receiverRate*100).toFixed(2)}% paid by receiver`,
        receiverShareAmt: fmt(receiverFee, payeeCurrency),
        toBeDeducted: fmt(youPay, payerCurrency),
        receiverGets: fmt(payeeGets, payeeCurrency),
        conversion: payerCurrency !== payeeCurrency ? `1 ${payerCurrency} = 1 ${payeeCurrency}` : '',
        nature: natureLabel,
        purpose: purposeLabel,
        docNumLabel,
        docNumber,
        docNotes,
        attachedDocs: attached.join(', '),
        dateTime: new Date().toLocaleString('en-GB', { hour12: false }),
        status: '{$status}',
      };
      sessionStorage.setItem('receiptData', JSON.stringify(data));
    } catch (_) {}
    const loading = document.getElementById('loadingModal');
    if (loading) {
      loading.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      try {
        const y = window.scrollY || window.pageYOffset || 0;
        document.body.dataset.scrollY = String(y);
        document.body.style.top = `-${y}px`;
        document.body.classList.add('modal-locked');
      } catch (_) {}
    }
    setTimeout(() => { window.location.href = 'review-payment.html'; }, 600);
  });
}
  // Send Payment: dev tools (Fill / Clear) in build-badge
  (function initSendDevTools() {
    const root = document.querySelector('main.page--send');
    if (!root) return;
    const fillBtn = document.getElementById('sp-fill');
    const clearBtn = document.getElementById('sp-clear');
    if (!fillBtn || !clearBtn) return;

    const amountEl = document.getElementById('amount');
    const natureEl = document.getElementById('nature');
    const purposeEl = document.getElementById('purpose');
    const docTypeEl = document.getElementById('docType');
    const piNumberEl = document.getElementById('piNumber');
    const ciNumberEl = document.getElementById('ciNumber');
    const deductUSD = root.querySelector('input[type="radio"][name="deduct"][value="USD"]');
    const deductUSDT = root.querySelector('input[type="radio"][name="deduct"][value="USDT"]');
    const preUpload = root.querySelector('#docs-pre .upload-item');
    const postUploads = Array.from(root.querySelectorAll('#docs-post .upload-item'));

    const trigger = (el) => { if (!el) return; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const clickMainUploadBtn = (item) => {
      const btn = item?.querySelector('.upload-item__actions .btn') || item?.querySelector('.btn');
      if (btn) btn.click();
    };
    const clickResetBtn = (item) => {
      const btn = item?.querySelector('.upload-item__actions .upload-reset');
      if (btn) btn.click();
    };

    fillBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Basic fields
      if (natureEl) { natureEl.value = 'pre_shipment'; trigger(natureEl); }
      if (purposeEl) { purposeEl.value = 'goods_purchase'; trigger(purposeEl); }
      if (amountEl) { amountEl.value = '50000'; trigger(amountEl); }
      if (deductUSD) { deductUSD.checked = true; trigger(deductUSD); }
      // Docs (pre-shipment)
      if (docTypeEl) { docTypeEl.value = 'PI'; trigger(docTypeEl); }
      if (piNumberEl) { piNumberEl.value = 'PI-001234'; trigger(piNumberEl); }
      // Upload PI in pre-shipment group
      if (preUpload) {
        // toggle to uploaded via main button
        if (!preUpload.classList.contains('is-uploaded')) clickMainUploadBtn(preUpload);
        // ensure display name with link (after setUploaded creates the link structure)
        setTimeout(() => {
          const sub = preUpload.querySelector('.upload-item__meta small');
          if (sub && preUpload.classList.contains('is-uploaded')) {
            sub.innerHTML = `<a href="#" target="_blank">PI-001234.pdf</a>`;
          }
        }, 10);
      }
      // For demo, also upload all post-shipment documents with A/B/C names
      postUploads.forEach((it) => {
        if (!it.classList.contains('is-uploaded')) clickMainUploadBtn(it);
      });
      // Ensure validation runs
      if (typeof validateSendForm === 'function') validateSendForm();
    });

    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (amountEl) { amountEl.value = ''; trigger(amountEl); }
      if (natureEl) { natureEl.value = ''; trigger(natureEl); }
      if (purposeEl) { purposeEl.value = ''; trigger(purposeEl); }
      const purposeOthersEl = document.getElementById('purposeOthers');
      if (purposeOthersEl) { purposeOthersEl.value = ''; trigger(purposeOthersEl); }
      if (deductUSD) { deductUSD.checked = true; trigger(deductUSD); }
      if (docTypeEl) { docTypeEl.value = ''; trigger(docTypeEl); }
      if (piNumberEl) { piNumberEl.value = ''; trigger(piNumberEl); }
      if (ciNumberEl) { ciNumberEl.value = ''; trigger(ciNumberEl); }
      // Reset uploads to 'not uploaded' state via reset button if present
      if (preUpload && preUpload.classList.contains('is-uploaded')) clickResetBtn(preUpload);
      postUploads.forEach((it) => { if (it.classList.contains('is-uploaded')) clickResetBtn(it); });
      // Clear inline errors if any
      const amountError = document.getElementById('amount-error');
      if (amountError) amountError.hidden = true;
      const amountWrap = document.querySelector('.amount-input');
      if (amountWrap) amountWrap.classList.remove('is-error');
      document.querySelectorAll('.fee-options--deduct .fee-option .fee-option__content .muted').forEach(el => el.classList.remove('is-error'));
      if (typeof validateSendForm === 'function') validateSendForm();
    });
  })();

  // Close mobile summary modal when resizing from mobile to desktop
  let previousWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;
    const wasMobile = previousWidth < DESKTOP_BP;
    const isDesktop = currentWidth >= DESKTOP_BP;
    
    // If transitioning from mobile to desktop, close the modal
    if (wasMobile && isDesktop) {
      const modal = document.getElementById('mobileSummaryModal');
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        const close = (el) => {
          if (!el) return;
          el.setAttribute('aria-hidden', 'true');
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          try {
            const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
            document.body.classList.remove('modal-locked');
            document.body.style.top = '';
            delete document.body.dataset.scrollY;
            window.scrollTo(0, y);
          } catch (_) {}
        };
        close(modal);
      }
    }
    previousWidth = currentWidth;
  });
}

// Run immediately if DOM is already parsed (defer), otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSendPayment);
} else {
  initSendPayment();
}

// Confirm modal actions
(function initConfirmModalActions() {
  const modal = document.getElementById('confirmPaymentModal');
  if (!modal) return;
  const confirm = document.getElementById('unlinkConfirm');
  const input = document.getElementById('unlinkCodeInput');
  const clearBtn = document.getElementById('unlinkClearBtn');
  const err = document.getElementById('unlinkCodeError');
  function syncAuthState() {
    const v = (input && input.value || '').trim();
    const ok = /^\d{6}$/.test(v);
    if (confirm) confirm.disabled = !ok;
    if (err) err.hidden = ok;
    if (clearBtn) clearBtn.classList.toggle('is-hidden', v.length === 0);
  }
  if (input) {
    input.addEventListener('input', syncAuthState, { passive: true });
    input.addEventListener('change', syncAuthState);
  }
  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => { input.value = ''; syncAuthState(); input.focus(); });
  }
  if (confirm) {
    confirm.addEventListener('click', () => {
      // Capture or preserve receipt data before leaving
      try {
        const isSendPage = !!document.querySelector('main.page--send');
        const isReviewPage = !!document.querySelector('main.page--review');
        if (isSendPage) {
          const getText = (sel) => (document.querySelector(sel)?.textContent || '').trim();
          const amountInput = document.getElementById('amount');
          const rawAmt = (amountInput?.value || '').replace(/,/g, '');
          const amount = parseFloat(rawAmt) || 0;
          const feeRate = 0.01;
          // Fee mode
          const feeSel = Array.from(document.querySelectorAll('input[type="radio"][name="fee"]')).find(r => r.checked)?.value || 'you';
          let payerRate = 0, receiverRate = 0;
          if (feeSel === 'you') { payerRate = feeRate; receiverRate = 0; }
          else if (feeSel === 'receiver') { payerRate = 0; receiverRate = feeRate; }
          else { payerRate = feeRate/2; receiverRate = feeRate/2; }
          // Payer currency
          const payerCurrency = Array.from(document.querySelectorAll('input[type="radio"][name="deduct"]')).find(r => r.checked)?.value || 'USD';
          const payeeCurrency = 'USD';
          const payerFee = amount * payerRate;
          const receiverFee = amount * receiverRate;
          const youPay = amount + payerFee;
          const payeeGets = amount - receiverFee;
          const fmt = (v, cur) => `${Number(v||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
          const data = {
            receiverName: (getText('.summary-recipient .recipient-select__title') || '').replace(/^To\s+/i,''),
            receiverBank: getText('.summary-recipient .recipient-select__subtitle'),
            amountPayableFmt: fmt(amount, payeeCurrency),
            deductedFrom: `${payerCurrency} account`,
            feePct: `${(feeRate*100).toFixed(2)}%`,
            payerShareLabel: `${(payerRate*100).toFixed(2)}% paid by you`,
            payerShareAmt: fmt(payerFee, payerCurrency),
            receiverShareLabel: `${(receiverRate*100).toFixed(2)}% paid by receiver`,
            receiverShareAmt: fmt(receiverFee, payeeCurrency),
            toBeDeducted: fmt(youPay, payerCurrency),
            receiverGets: fmt(payeeGets, payeeCurrency),
            conversion: payerCurrency !== payeeCurrency ? `1 ${payerCurrency} = 1 ${payeeCurrency}` : '',
            dateTime: new Date().toLocaleString('en-GB', { hour12: false }),
            status: '{$status}',
          };
          sessionStorage.setItem('receiptData', JSON.stringify(data));
        } else if (isReviewPage) {
          // Preserve existing review data; only refresh timestamp
          const raw = sessionStorage.getItem('receiptData');
          const d = raw ? JSON.parse(raw) : {};
          d.dateTime = new Date().toLocaleString('en-GB', { hour12: false });
          sessionStorage.setItem('receiptData', JSON.stringify(d));
        }
      } catch (_) {}
      // Close confirm modal
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      // Show loading modal for 2s then redirect
      const loading = document.getElementById('loadingModal');
      if (loading) {
        loading.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) {}
      }
      setTimeout(() => {
        window.location.href = 'payment-submitted.html';
      }, 2000);
    });
  }
  // Ensure initial visibility of clear matches content
  syncAuthState();
})();

// Select Counterparty page behavior
(function initSelectCounterparty() {
  const filter = document.getElementById('filter-verified');
  const list = document.querySelector('.cp-list');
  if (!filter || !list) return;
  const applyFilter = () => {
    const onlyFirst = filter.checked;
    const items = Array.from(list.querySelectorAll('li'));
    items.forEach((li, idx) => {
      const cpItem = li.querySelector('.cp-item');
      if (!onlyFirst) {
        li.style.display = '';
        // Remove filtered class when filter is off
        if (cpItem) cpItem.classList.remove('is-filtered');
      } else {
        li.style.display = idx === 0 ? '' : 'none';
        // Add filtered class to visible verified item when filter is on
        if (idx === 0 && cpItem && cpItem.classList.contains('is-verified')) {
          cpItem.classList.add('is-filtered');
        } else if (cpItem) {
          cpItem.classList.remove('is-filtered');
        }
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
    // Lock scroll (iOS safe)
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) {}
  };
  const close = (el) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    // Unlock scroll
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) {}
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

  // Global snackbar helper (idempotent)
  window.showSnackbar = function(message, durationMs = 2000) {
    try {
      let el = document.getElementById('app-snackbar');
      if (!el) {
        el = document.createElement('div');
        el.id = 'app-snackbar';
        el.className = 'snackbar snackbar--success';
        el.innerHTML = '<img class="snackbar__icon" src="assets/icon_snackbar_success.svg" alt=""/><span class="snackbar__text"></span>';
        document.body.appendChild(el);
      }
      const text = el.querySelector('.snackbar__text');
      if (text) text.textContent = message || '';
      // show
      requestAnimationFrame(() => el.classList.add('is-visible'));
      // hide after duration
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => {
        el.classList.remove('is-visible');
      }, durationMs);
    } catch (_) { /* noop */ }
  };

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
  
  // Back navigation is now handled by initAddBankSteps for step management
  // This handler only manages mobile title click
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      // On mobile, check if we're on step 2+ via the steps handler
      const step2Form = document.getElementById('step2-form');
      if (step2Form && !step2Form.hasAttribute('hidden')) {
        e.preventDefault();
        // Trigger the modal via the steps handler
        const cancelModal = document.getElementById('cancelConfirmModal');
        if (cancelModal) {
          cancelModal.setAttribute('aria-hidden', 'false');
          document.documentElement.classList.add('modal-open');
          document.body.classList.add('modal-open');
          try {
            const y = window.scrollY || window.pageYOffset || 0;
            document.body.dataset.scrollY = String(y);
            document.body.style.top = `-${y}px`;
            document.body.classList.add('modal-locked');
          } catch (_) {}
        }
      }
    }
  };
  
  // Crumb is handled by initAddBankSteps, only handle title on mobile
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Review Payment: back crumb and title go to Send payment on tablet and below
(function initReviewBackNavigation() {
  const isReview = document.querySelector('main.page--review');
  if (!isReview) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('rv-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      window.location.href = 'send-payment.html';
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

// Add Bank: Step navigation and state management
(function initAddBankSteps() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;
  
  let currentStep = 1;
  const stepData = { step1: {}, step2: {} };
  
  const step1Form = document.getElementById('step1-form');
  const step2Form = document.getElementById('step2-form');
  const nextBtn = document.getElementById('ab-next');
  const nextBtnStep2 = document.getElementById('ab-next-step2');
  const backBtnStep2 = document.getElementById('ab-back');
  const cancelModal = document.getElementById('cancelConfirmModal');
  const cancelContinueBtn = document.getElementById('cancelConfirmContinue');
  const cancelCancelBtn = document.getElementById('cancelConfirmCancel');
  const crumb = document.querySelector('.page__header--crumb .crumb');
  
  if (!step1Form || !step2Form) return;
  
  // Store step 1 data
  const storeStep1Data = () => {
    stepData.step1 = {
      companyName: document.getElementById('companyName')?.value || '',
      regDate: document.getElementById('regDate')?.value || '',
      country: document.getElementById('country')?.value || '',
      regNum: document.getElementById('regNum')?.value || '',
      businessAddress: document.getElementById('businessAddress')?.value || '',
      email: document.getElementById('email')?.value || ''
    };
  };
  
  // Update step indicator
  const updateStepIndicator = (step) => {
    [1, 2, 3].forEach((s) => {
      const indicator = document.getElementById(`step-indicator-${s}`);
      if (!indicator) return;
      const dot = indicator.querySelector('.ab-dot');
      const title = indicator.querySelector('.ab-step__title');
      const label = indicator.querySelector('.ab-step__label');
      
      if (s < step) {
        // Completed step
        indicator.classList.remove('is-active');
        if (dot) dot.style.background = '#3FAE64';
        if (title) {
          title.classList.remove('is-muted');
          title.style.color = '';
        }
        if (label) label.style.color = '#3FAE64';
      } else if (s === step) {
        // Current step
        indicator.classList.add('is-active');
        if (dot) dot.style.background = '#3FAE64';
        if (title) {
          title.classList.remove('is-muted');
          title.style.fontWeight = '700';
          title.style.color = '#2D2F2F';
        }
        if (label) label.style.color = '#3FAE64';
      } else {
        // Future step
        indicator.classList.remove('is-active');
        if (dot) dot.style.background = '#DBDBDC';
        if (title) {
          title.classList.add('is-muted');
          title.style.fontWeight = '';
          title.style.color = '#BCBDBD';
        }
        if (label) label.style.color = '#BCBDBD';
      }
    });
  };
  
  // Show step
  const showStep = (step) => {
    if (step === 1) {
      step1Form.removeAttribute('hidden');
      step1Form.style.display = '';
      step2Form.setAttribute('hidden', '');
      step2Form.style.display = 'none';
    } else if (step === 2) {
      step1Form.setAttribute('hidden', '');
      step1Form.style.display = 'none';
      step2Form.removeAttribute('hidden');
      step2Form.style.display = '';
    }
    currentStep = step;
    updateStepIndicator(step);
  };
  
  // Navigate to step 2
  const goToStep2 = () => {
    storeStep1Data();
    showStep(2);
  };
  
  // Navigate back to step 1
  const goToStep1 = () => {
    showStep(1);
  };
  
  // Handle header back button
  const handleHeaderBack = (e) => {
    if (currentStep > 1) {
      e.preventDefault();
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) {}
      }
    }
  };
  
  // Next button step 1
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep2();
    });
  }
  
  // Back button step 2
  if (backBtnStep2) {
    backBtnStep2.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep1();
    });
  }
  
  // Cancel modal handlers
  if (cancelContinueBtn) {
    cancelContinueBtn.addEventListener('click', () => {
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) {}
      }
    });
  }
  
  if (cancelCancelBtn) {
    cancelCancelBtn.addEventListener('click', () => {
      window.location.href = 'select-counterparty.html';
    });
  }
  
  // Close modal on backdrop click
  if (cancelModal) {
    cancelModal.addEventListener('click', (e) => {
      if (e.target === cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) {}
      }
    });
    
    cancelModal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) {}
      });
    });
  }
  
  // Update header back button handler
  if (crumb) {
    crumb.addEventListener('click', handleHeaderBack);
  }
  
  // Initialize step indicator and ensure step 1 is visible
  updateStepIndicator(1);
  showStep(1); // Ensure step 1 is visible on load
  
  // Step 2 form validation
  const accountHolderName = document.getElementById('accountHolderName');
  if (nextBtnStep2 && accountHolderName) {
    const validateStep2 = () => {
      const hasName = accountHolderName.value && accountHolderName.value.trim() !== '';
      nextBtnStep2.disabled = !hasName;
      nextBtnStep2.setAttribute('aria-disabled', String(!hasName));
    };
    
    accountHolderName.addEventListener('input', validateStep2);
    accountHolderName.addEventListener('change', validateStep2);
    validateStep2();
  }
})();

// Add Bank: enable Next when all fields are filled (reusable helper)
(function initAddBankFormState() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;
  const form = document.getElementById('step1-form');
  const nextBtn = document.getElementById('ab-next');
  if (!form || !nextBtn) return;

  const getFields = () => ([
    form.querySelector('#companyName'),
    form.querySelector('#regDate'),
    form.querySelector('#country'),
    form.querySelector('#regNum'),
    form.querySelector('#businessAddress'),
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
    businessAddress: form.querySelector('#businessAddress'),
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
    if (f.businessAddress) {
      f.businessAddress.value = '5 Battery Road, Singapore 049901';
      // Update icon after setting value
      const businessAddressIcon = document.getElementById('businessAddressIcon');
      if (businessAddressIcon) businessAddressIcon.src = 'assets/icon_edit.svg';
    }
    if (f.email) f.email.value = 'accounts@novaquill.com';
    Object.values(f).forEach(trigger);
    
    // Also fill modal fields
    const modal = document.getElementById('businessAddressModal');
    if (modal) {
      const addressCountry = modal.querySelector('#addressCountry');
      const addressState = modal.querySelector('#addressState');
      const addressCity = modal.querySelector('#addressCity');
      const addressLine1 = modal.querySelector('#addressLine1');
      const addressLine2 = modal.querySelector('#addressLine2');
      const addressPostal = modal.querySelector('#addressPostal');
      
      if (addressCountry) addressCountry.value = 'Singapore';
      if (addressState) addressState.value = 'Central Region';
      if (addressCity) addressCity.value = 'Singapore';
      if (addressLine1) addressLine1.value = '5 Battery Road';
      if (addressLine2) addressLine2.value = 'Suite 1001';
      if (addressPostal) addressPostal.value = '049901';
      
      // Trigger change events to update is-filled classes and validate
      [addressCountry, addressState, addressCity, addressLine1, addressLine2, addressPostal].forEach((el) => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Trigger validation for save button after a short delay to ensure events have fired
      setTimeout(() => {
        if (typeof window.updateBusinessAddressSaveButton === 'function') {
          window.updateBusinessAddressSaveButton();
        }
      }, 10);
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const f = getFields();
    Object.values(f).forEach((el) => { if (el) el.value = ''; trigger(el); });
    // Also clear business address and reset icon
    const businessAddress = form.querySelector('#businessAddress');
    const businessAddressIcon = document.getElementById('businessAddressIcon');
    if (businessAddress) businessAddress.value = '';
    if (businessAddressIcon) businessAddressIcon.src = 'assets/icon_add.svg';
    
    // Also clear modal fields
    const modal = document.getElementById('businessAddressModal');
    if (modal) {
      const addressCountry = modal.querySelector('#addressCountry');
      const addressState = modal.querySelector('#addressState');
      const addressCity = modal.querySelector('#addressCity');
      const addressLine1 = modal.querySelector('#addressLine1');
      const addressLine2 = modal.querySelector('#addressLine2');
      const addressPostal = modal.querySelector('#addressPostal');
      
      if (addressCountry) addressCountry.value = '';
      if (addressState) addressState.value = '';
      if (addressCity) addressCity.value = '';
      if (addressLine1) addressLine1.value = '';
      if (addressLine2) addressLine2.value = '';
      if (addressPostal) addressPostal.value = '';
      
      // Trigger change events to update is-filled classes and validate
      [addressCountry, addressState, addressCity, addressLine1, addressLine2, addressPostal].forEach((el) => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Trigger validation for save button after a short delay to ensure events have fired
      setTimeout(() => {
        if (typeof window.updateBusinessAddressSaveButton === 'function') {
          window.updateBusinessAddressSaveButton();
        }
      }, 10);
    }
  });
})();

// Add Bank: Business address modal handler
(function initBusinessAddressModal() {
  const root = document.querySelector('main.page--addbank');
  if (!root) {
    console.log('Business address modal: page--addbank not found');
    return;
  }
  
  console.log('Business address modal: Initializing...');
  
  const businessAddressInput = document.getElementById('businessAddress');
  const businessAddressBtn = document.getElementById('businessAddressBtn');
  const businessAddressIcon = document.getElementById('businessAddressIcon');
  const businessAddressWrapper = document.getElementById('businessAddressWrapper');
  const modal = document.getElementById('businessAddressModal');
  
  // Debug: log which elements are missing
  if (!businessAddressInput) console.warn('businessAddressInput not found');
  if (!businessAddressBtn) console.warn('businessAddressBtn not found');
  if (!businessAddressIcon) console.warn('businessAddressIcon not found');
  if (!modal) console.warn('businessAddressModal not found');
  
  if (!businessAddressInput || !businessAddressBtn || !businessAddressIcon || !modal) {
    console.warn('Business address modal initialization failed - missing elements');
    return;
  }
  
  console.log('Business address modal: All elements found, setting up event listeners');
  
  // Format address from modal fields
  const formatAddress = (data) => {
    const parts = [];
    if (data.line1) parts.push(data.line1);
    if (data.line2) parts.push(data.line2);
    if (data.city) parts.push(data.city);
    if (data.state) parts.push(data.state);
    if (data.postal) parts.push(data.postal);
    if (data.country) parts.push(data.country);
    return parts.join(', ');
  };
  
  // Update icon based on field state
  const updateIcon = () => {
    if (businessAddressInput.value && businessAddressInput.value.trim()) {
      businessAddressIcon.src = 'assets/icon_edit.svg';
    } else {
      businessAddressIcon.src = 'assets/icon_add.svg';
    }
  };
  
  // Open modal
  const openModal = () => {
    console.log('openModal called, modal element:', modal);
    // Pre-fill modal if address exists
    const currentValue = businessAddressInput.value;
    if (currentValue) {
      // Try to parse existing address (simple approach - in real app would need better parsing)
      // For now, just clear and let user re-enter
    }
    console.log('Setting modal aria-hidden to false');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    console.log('Modal classes added, checking if modal is visible');
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) {}
    console.log('Modal should now be visible. aria-hidden:', modal.getAttribute('aria-hidden'));
  };
  
  // Close modal
  const closeModal = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) {}
  };
  
  // Save address
  const saveAddress = () => {
    const country = document.getElementById('addressCountry')?.value || '';
    const state = document.getElementById('addressState')?.value || '';
    const city = document.getElementById('addressCity')?.value || '';
    const line1 = document.getElementById('addressLine1')?.value || '';
    const line2 = document.getElementById('addressLine2')?.value || '';
    const postal = document.getElementById('addressPostal')?.value || '';
    
    // Validate required fields
    if (!country || !city || !line1 || !postal) {
      // In a real app, show validation errors
      return;
    }
    
    // Format and set address
    const formatted = formatAddress({ country, state, city, line1, line2, postal });
    businessAddressInput.value = formatted;
    updateIcon();
    
    // Trigger change event for form validation
    businessAddressInput.dispatchEvent(new Event('input', { bubbles: true }));
    businessAddressInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    closeModal();
  };
  
  // Event listeners - make the entire field clickable
  businessAddressBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Business address button clicked, opening modal');
    openModal();
  });
  
  businessAddressInput.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Business address input clicked, opening modal');
    openModal();
  });
  
  // Also handle pointer events on the wrapper
  if (businessAddressWrapper) {
    businessAddressWrapper.style.cursor = 'pointer';
    businessAddressWrapper.addEventListener('click', (e) => {
      // Only handle if click is directly on wrapper, not on children
      if (e.target === businessAddressWrapper) {
        console.log('Business address wrapper clicked, opening modal');
        openModal();
      }
    });
  }
  
  // Validation function to check if all required fields are filled
  const validateModalForm = () => {
    const country = document.getElementById('addressCountry')?.value || '';
    const city = document.getElementById('addressCity')?.value || '';
    const line1 = document.getElementById('addressLine1')?.value || '';
    const postal = document.getElementById('addressPostal')?.value || '';
    
    // All required fields must have values
    const isValid = country && country.trim() !== '' &&
                    city && city.trim() !== '' &&
                    line1 && line1.trim() !== '' &&
                    postal && postal.trim() !== '';
    
    return isValid;
  };
  
  // Update save button state (expose globally so Fill/Clear can call it)
  window.updateBusinessAddressSaveButton = () => {
    const saveBtn = document.getElementById('saveBusinessAddress');
    if (!saveBtn) return;
    
    const isValid = validateModalForm();
    saveBtn.disabled = !isValid;
    saveBtn.setAttribute('aria-disabled', String(!isValid));
  };
  
  const updateSaveButton = window.updateBusinessAddressSaveButton;
  
  // Save button
  const saveBtn = document.getElementById('saveBusinessAddress');
  if (saveBtn) {
    // Initially disable the button
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-disabled', 'true');
    
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateModalForm()) return; // Double-check before saving
      saveAddress();
    });
  }
  
  // Close button handlers (using existing modal close logic)
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Initialize icon state
  updateIcon();
  
  // Watch for external changes (e.g., from Fill/Clear buttons)
  businessAddressInput.addEventListener('input', updateIcon);
  businessAddressInput.addEventListener('change', updateIcon);
  
  // Toggle is-filled class on modal inputs and selects when they have values
  const toggleFilled = (el) => {
    if (!el) return;
    if (el.tagName === 'SELECT') {
      // For selects, only mark as filled if value exists and is not empty string (placeholder)
      const hasValue = el.value && el.value !== '';
      el.classList.toggle('is-filled', hasValue);
    } else {
      el.classList.toggle('is-filled', el.value && el.value.trim() !== '');
    }
  };
  
  // Get all inputs and selects in the modal
  const modalInputs = modal.querySelectorAll('input[type="text"], select');
  modalInputs.forEach((input) => {
    // Initialize state
    toggleFilled(input);
    // Update on change
    const updateField = () => {
      toggleFilled(input);
      updateSaveButton(); // Also validate form when field changes
    };
    input.addEventListener('input', updateField);
    input.addEventListener('change', updateField);
  });
  
  // Initial validation when modal opens
  updateSaveButton();
})();


