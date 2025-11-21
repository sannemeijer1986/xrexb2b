// Mobile state switching via URL param `view` = 'menu' | 'content'
(function() {
  'use strict';

  try {
    var mqDesktop = window.matchMedia('(min-width: 1280px)');
    var isDesktop = function(){ return mqDesktop.matches; };
    var getView = function(){ return new URLSearchParams(window.location.search).get('view'); };
    var getPage = function(){ return new URLSearchParams(window.location.search).get('page') || 'account'; };
    
    var applyMobileState = function(){
      if (isDesktop()) {
        document.body.classList.remove('state-menu');
        document.body.classList.remove('state-content');
        return;
      }
      var viewNow = getView();
      if (viewNow === 'menu') {
        document.body.classList.add('state-menu');
        document.body.classList.remove('state-content');
      } else {
        document.body.classList.add('state-content');
        document.body.classList.remove('state-menu');
      }
    };

    // Initial apply and on viewport changes
    applyMobileState();
    mqDesktop.addEventListener('change', applyMobileState);

    // Dynamic account chip link target based on viewport
    var chip = document.getElementById('accountChipLink');
    var setChipHref = function(){
      if (!chip) return;
      chip.setAttribute('href', isDesktop() ? 'settings.html?view=content&page=account' : 'settings.html?view=menu');
    };
    setChipHref();
    mqDesktop.addEventListener('change', setChipHref);

    // Back link should go to menu state on mobile
    var backLinkEl = document.getElementById('backLink');
    if (backLinkEl) {
      backLinkEl.addEventListener('click', function(e){
        if (!isDesktop()) {
          e.preventDefault();
          // Only keep view=menu; drop other params like page
          var base = window.location.origin + window.location.pathname + '?view=menu';
          window.location.replace(base);
        }
      });
    }

    // Close menu link – on mobile, return to the page where Settings was opened
    var closeMenuLink = document.getElementById('closeMenuLink');
    if (closeMenuLink) {
      closeMenuLink.addEventListener('click', function(e){
        if (!isDesktop()) {
          e.preventDefault();
          var target = null;
          try {
            if (window.sessionStorage) {
              target = window.sessionStorage.getItem('xrexb2b.settingsReturnUrl');
            }
          } catch (_) {}

          // Fallback to home if nothing stored or it points back to settings
          if (!target || /settings\.html/i.test(target)) {
            target = 'index.html';
          }

          window.location.href = target;
        }
      });
    }
  } catch (_) {}

  // Menu item navigation
  try {
    var menuItems = document.querySelectorAll('.menu-item[data-link]');
    var submenuItems = document.querySelectorAll('.submenu-item[data-link]');
    
    var navigateToPage = function(pageName) {
      var base = window.location.origin + window.location.pathname;
      var newUrl = isDesktop() 
        ? base + '?view=content&page=' + pageName
        : base + '?view=content&page=' + pageName;
      window.location.href = newUrl;
    };

    var handleMenuItemClick = function(e) {
      var item = e.currentTarget;
      var link = item.getAttribute('data-link');
      var page = item.getAttribute('data-page');
      
      if (link && page) {
        e.preventDefault();
        navigateToPage(page);
      }
    };

    menuItems.forEach(function(item) {
      item.addEventListener('click', handleMenuItemClick);
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMenuItemClick(e);
        }
      });
    });

    submenuItems.forEach(function(item) {
      item.addEventListener('click', handleMenuItemClick);
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMenuItemClick(e);
        }
      });
    });
  } catch (_) {}

  // Submenu toggle
  try {
    var chevrons = document.querySelectorAll('.menu-chevron');

    var toggleSubmenuForItem = function (item) {
      if (!item) return;
      var chevron = item.querySelector('.menu-chevron');
      var targetId = chevron ? chevron.getAttribute('data-target') : null;
      if (!targetId) return;
      var submenu = document.querySelector(targetId);
      if (!submenu) return;

      var isHidden = submenu.hasAttribute('hidden');
      if (isHidden) {
        submenu.removeAttribute('hidden');
        if (chevron) chevron.setAttribute('aria-expanded', 'true');
        item.classList.add('open');
      } else {
        submenu.setAttribute('hidden', '');
        if (chevron) chevron.setAttribute('aria-expanded', 'false');
        item.classList.remove('open');
      }
    };

    // Chevron click (all breakpoints)
    chevrons.forEach(function(chevron) {
      chevron.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSubmenuForItem(chevron.closest('.menu-item'));
      });
    });

    // Row click to expand/collapse on all breakpoints
    chevrons.forEach(function(chevron) {
      var parentItem = chevron.closest('.menu-item');
      if (!parentItem) return;
      parentItem.addEventListener('click', function(e) {
        // Ignore clicks coming from chevron button or inside submenu links
        if (e.target.closest('.menu-chevron') || e.target.closest('.submenu')) return;
        e.preventDefault();
        toggleSubmenuForItem(parentItem);
      });
    });

    // On mobile/tablet, keep submenus expanded by default (can be collapsed by user)
    var expandAllSubmenusMobile = function () {
      if (isDesktop()) return;
      document.querySelectorAll('.submenu').forEach(function(submenu) {
        var targetId = '#' + submenu.id;
        var chevron = document.querySelector('.menu-chevron[data-target="' + targetId + '"]');
        var item = chevron ? chevron.closest('.menu-item') : null;
        if (!item) return;
        submenu.removeAttribute('hidden');
        chevron.setAttribute('aria-expanded', 'true');
        item.classList.add('open');
      });
    };

    expandAllSubmenusMobile();
    mqDesktop.addEventListener('change', expandAllSubmenusMobile);
  } catch (_) {}

  // Show/hide panels based on page param
  try {
    var currentPage = getPage();
    var panels = {
      'account': document.getElementById('panel-account'),
      'banks': document.getElementById('panel-banks')
    };

    // Update active menu item
    var allMenuItems = document.querySelectorAll('.menu-item[data-page]');
    allMenuItems.forEach(function(item) {
      var page = item.getAttribute('data-page');
      if (page === currentPage) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Show/hide panels
    Object.keys(panels).forEach(function(page) {
      var panel = panels[page];
      if (panel) {
        if (page === currentPage) {
          panel.removeAttribute('hidden');
          panel.setAttribute('role', 'tabpanel');
        } else {
          panel.setAttribute('hidden', '');
        }
      }
    });

    // Update page title
    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      if (currentPage === 'banks') {
        pageTitle.textContent = 'Custodian & Bank';
      } else {
        pageTitle.textContent = 'Account';
      }
    }
  } catch (_) {}
})();
