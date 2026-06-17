// ChargeLink - Main Application Script

// ===================== SHARED NAV & FOOTER =====================

const NAV_HTML = `
<nav class="chargelink-nav" id="main-nav">
  <a href="index.html" class="nav-logo">⚡ <span class="logo-accent">Charge</span>Link</a>
  <ul class="nav-links" id="nav-links">
    <li><a href="index.html" data-page="index">Home</a></li>
    <li><a href="request.html" data-page="request">Request</a></li>
    <li><a href="help.html" data-page="help">Help</a></li>
    <li><a href="dashboard.html" data-page="dashboard">Dashboard</a></li>
  </ul>
  <button class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
    <span></span>
    <span></span>
    <span></span>
  </button>
  <div class="nav-mobile-menu" id="mobile-menu">
    <a href="index.html" data-page="index">🏠 Home</a>
    <a href="request.html" data-page="request">🔋 Request</a>
    <a href="help.html" data-page="help">🤝 Help</a>
    <a href="dashboard.html" data-page="dashboard">📍 Dashboard</a>
  </div>
</nav>
`;

const FOOTER_HTML = `
<footer class="chargelink-footer">
  <div class="footer-inner">
    <div class="footer-logo">⚡ ChargeLink</div>
    <div class="footer-tagline">Connecting people with power, one charge at a time.</div>
    <div class="footer-links">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
      <a href="#">Safety Tips</a>
      <a href="#">Contact</a>
      <a href="#">About</a>
    </div>
    <div class="footer-copy">© 2024 ChargeLink. Made with ⚡ for communities everywhere.</div>
  </div>
</footer>
`;

// ===================== INIT ON DOM READY =====================

document.addEventListener('DOMContentLoaded', function () {
  injectNav();
  injectFooter();
  setActiveNav();
  initHamburger();

  const page = getCurrentPage();

  if (page === 'request') {
    initWizard();
  } else if (page === 'help') {
    initHelpToggle();
  } else if (page === 'dashboard') {
    initDashboard();
  }
});

// ===================== NAV INJECTION =====================

function injectNav() {
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) {
    placeholder.innerHTML = NAV_HTML;
  }
}

function injectFooter() {
  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder) {
    placeholder.innerHTML = FOOTER_HTML;
  }
}

// ===================== ACTIVE NAV STATE =====================

function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop().replace('.html', '') || 'index';
  return filename === '' ? 'index' : filename;
}

function setActiveNav() {
  const page = getCurrentPage();

  // Desktop nav links
  const navLinks = document.querySelectorAll('#nav-links a[data-page], .nav-links a[data-page]');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });

  // Mobile nav links
  const mobileLinks = document.querySelectorAll('#mobile-menu a[data-page], .nav-mobile-menu a[data-page]');
  mobileLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });
}

// ===================== HAMBURGER MENU =====================

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen.toString());
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu on outside click
  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ===================== URL PARAM UTILITIES =====================

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ===================== WIZARD (REQUEST.HTML) =====================

function initWizard() {
  let currentStep = 1;
  const totalSteps = 3;
  let selectedCharger = null;

  const steps = document.querySelectorAll('.wizard-step');
  const progressCircles = document.querySelectorAll('.progress-circle');
  const progressLabels = document.querySelectorAll('.progress-label');
  const progressLines = document.querySelectorAll('.progress-line');

  const nextBtns = document.querySelectorAll('[data-action="next"]');
  const backBtns = document.querySelectorAll('[data-action="back"]');
  const submitBtn = document.getElementById('submit-btn');
  const validationMsg = document.getElementById('charger-validation');

  // Charger selection
  const chargerCards = document.querySelectorAll('.charger-card');
  chargerCards.forEach(card => {
    card.addEventListener('click', function () {
      chargerCards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      selectedCharger = this.dataset.charger;
      if (validationMsg) {
        validationMsg.classList.remove('visible');
      }
    });
  });

  // Radius slider
  const slider = document.getElementById('radius-slider');
  const sliderLabel = document.getElementById('radius-value');
  if (slider && sliderLabel) {
    slider.addEventListener('input', function () {
      sliderLabel.textContent = parseFloat(this.value).toFixed(1);
    });
  }

  // Navigation
  nextBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      if (currentStep === 1 && !selectedCharger) {
        if (validationMsg) {
          validationMsg.classList.add('visible');
        }
        // Shake effect
        const chargerGrid = document.querySelector('.charger-grid');
        if (chargerGrid) {
          chargerGrid.style.animation = 'none';
          chargerGrid.offsetHeight; // reflow
          chargerGrid.style.animation = 'shake 0.4s ease';
        }
        return;
      }
      goToStep(currentStep + 1);
    });
  });

  backBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      goToStep(currentStep - 1);
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.5rem;"><span style="width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;"></span> Finding helpers...</span>';
      submitBtn.disabled = true;
      setTimeout(() => {
        window.location.href = 'dashboard.html?mode=seeker';
      }, 1200);
    });
  }

  function goToStep(n) {
    if (n < 1 || n > totalSteps) return;
    currentStep = n;
    updateUI();
  }

  function updateUI() {
    // Show correct step
    steps.forEach((step, i) => {
      step.classList.toggle('active', i + 1 === currentStep);
    });

    // Update progress circles
    progressCircles.forEach((circle, i) => {
      circle.classList.remove('active', 'completed');
      if (i + 1 < currentStep) circle.classList.add('completed');
      else if (i + 1 === currentStep) circle.classList.add('active');
    });

    // Update progress labels
    progressLabels.forEach((label, i) => {
      label.classList.toggle('active', i + 1 === currentStep);
    });

    // Update progress lines
    progressLines.forEach((line, i) => {
      line.classList.toggle('completed', i + 1 < currentStep);
    });

    // Update circle content
    progressCircles.forEach((circle, i) => {
      if (i + 1 < currentStep) {
        circle.textContent = '✓';
      } else {
        circle.textContent = (i + 1).toString();
      }
    });
  }

  // Initialize
  updateUI();
}

// ===================== HELP TOGGLE (HELP.HTML) =====================

function initHelpToggle() {
  const toggleInput = document.getElementById('availability-toggle');
  const toggleWrapper = document.getElementById('toggle-wrapper');
  const statusMsg = document.getElementById('toggle-status-msg');
  const dashboardBtn = document.getElementById('go-dashboard-btn');

  if (!toggleInput) return;

  toggleInput.addEventListener('change', function () {
    const isOn = this.checked;

    if (toggleWrapper) {
      toggleWrapper.classList.toggle('active', isOn);
    }

    if (statusMsg) {
      statusMsg.classList.toggle('visible', isOn);
    }

    if (dashboardBtn) {
      dashboardBtn.style.display = isOn ? 'flex' : 'none';
    }
  });
}

// ===================== DASHBOARD (DASHBOARD.HTML) =====================

function initDashboard() {
  const mode = getParam('mode');
  const findingSection = document.getElementById('finding-section');
  const requestsPanel = document.getElementById('requests-panel');
  const matchSection = document.getElementById('match-section');

  if (mode === 'seeker') {
    // Show "finding" state, hide requests
    if (requestsPanel) requestsPanel.style.display = 'none';
    if (matchSection) matchSection.style.display = 'none';
    if (findingSection) findingSection.style.display = 'block';

    // After 2 seconds, show match card
    setTimeout(() => {
      if (findingSection) {
        findingSection.style.opacity = '0';
        findingSection.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          findingSection.style.display = 'none';
          if (matchSection) {
            matchSection.style.display = 'block';
          }
        }, 300);
      }
    }, 2000);

  } else {
    // Helper / default mode: show requests, hide seeker UI
    if (findingSection) findingSection.style.display = 'none';
    if (matchSection) matchSection.style.display = 'none';
    if (requestsPanel) requestsPanel.style.display = 'block';
  }

  // Offer help buttons
  const offerBtns = document.querySelectorAll('.offer-help-btn');
  offerBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.request-card');
      const userName = card ? card.querySelector('.user-name').textContent : 'this person';
      this.textContent = '✓ Offer Sent!';
      this.style.background = 'var(--primary-dark)';
      this.disabled = true;
      this.style.opacity = '0.8';
      showToast(`Offer sent to ${userName}! They'll be notified.`);
    });
  });

  // Directions and contact buttons
  const dirBtn = document.getElementById('directions-btn');
  if (dirBtn) {
    dirBtn.addEventListener('click', () => {
      showToast('📍 Opening directions to Nearby Coffee Shop...');
    });
  }

  const contactBtn = document.getElementById('contact-btn');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      showToast('💬 Opening chat with Jordan...');
    });
  }
}

// ===================== TOAST NOTIFICATION =====================

function showToast(message) {
  // Remove existing toast
  const existingToast = document.getElementById('cl-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'cl-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #1E293B;
    color: white;
    padding: 0.85rem 1.5rem;
    border-radius: 9999px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 9999;
    animation: slideInUp 0.3s ease;
    white-space: nowrap;
    font-family: 'Inter', sans-serif;
    max-width: calc(100vw - 3rem);
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
