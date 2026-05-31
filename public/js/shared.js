/* ============================================================
   MindVault Kids — Shared Components
   Side nav, top bar, bottom nav, auth guard, theme toggle
   ============================================================ */

const ROBOT_MASCOT = '/assets/guardian.png';

const NAV_ITEMS = [
  { label: 'Safety', section: true },
  { icon: 'home', label: 'Dashboard', href: '/dashboard.html', id: 'dashboard' },
  { icon: 'shield', label: 'Panic Shield', href: '/panic-shield.html', id: 'panic-shield' },
  { icon: 'exit_to_app', label: 'Safe Exit', href: '/safe-exit.html', id: 'safe-exit' },
  { icon: 'sos', label: 'Silent SOS', href: '/silent-sos.html', id: 'silent-sos' },
  { icon: 'nightlight', label: 'Night Watch', href: '/night-watch.html', id: 'night-watch' },
  { label: 'Detection', section: true },
  { icon: 'timeline', label: 'Grooming Detector', href: '/grooming-detector.html', id: 'grooming-detector' },
  { icon: 'favorite', label: 'Risk Score (ERS)', href: '/ers.html', id: 'ers' },
  { icon: 'radar', label: 'Manipulation Detector', href: '/manipulation-detector.html', id: 'manipulation-detector' },
  { icon: 'person_search', label: 'Shadow Accounts', href: '/shadow-detector.html', id: 'shadow-detector' },
  { icon: 'report', label: 'Cyberbullying', href: '/cyberbullying.html', id: 'cyberbullying' },
  { icon: 'security', label: 'Safe Web Bubble', href: '/safe-web-bubble.html', id: 'safe-web-bubble' },
  { label: 'Support', section: true },
  { icon: 'groups', label: 'Trust Circle', href: '/trust-circle.html', id: 'trust-circle' },
  { icon: 'folder_shared', label: 'Evidence Vault', href: '/evidence-vault.html', id: 'evidence-vault' },
  { icon: 'psychology', label: 'AI First Aid', href: '/ai-first-aid.html', id: 'ai-first-aid' },
  { icon: 'healing', label: 'Heal Mode', href: '/heal-mode.html', id: 'heal-mode' },
  { icon: 'school', label: 'Predator Simulator', href: '/predator-simulator.html', id: 'predator-simulator' },
];

const BOTTOM_NAV_ITEMS = [
  { icon: 'home', label: 'Home', href: '/dashboard.html', id: 'dashboard' },
  { icon: 'shield', label: 'Shield', href: '/panic-shield.html', id: 'panic-shield' },
  { icon: 'groups', label: 'Circle', href: '/trust-circle.html', id: 'trust-circle' },
  { icon: 'healing', label: 'Heal', href: '/heal-mode.html', id: 'heal-mode' },
  { icon: 'assessment', label: 'Insights', href: '/ers.html', id: 'ers' },
];

/** Get current page ID from URL */
function getCurrentPageId() {
  const path = window.location.pathname;
  const file = path.split('/').pop().replace('.html', '');
  return file || 'dashboard';
}

/** Theme management */
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('mv-theme') || 'light';
    this.set(saved);
  },
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mv-theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};

/** Render side navigation */
function renderSideNav(activeId) {
  const nav = document.createElement('nav');
  nav.className = 'side-nav';
  nav.id = 'side-nav';

  // Brand + Robot mascot
  nav.innerHTML = `
    <div class="nav-brand">
      <div class="nav-avatar">
        <img src="${ROBOT_MASCOT}" alt="AI Guardian" />
      </div>
      <div class="nav-brand-text">
        <h3>AI Guardian</h3>
        <p>Always Protecting</p>
      </div>
    </div>
  `;

  // Nav links
  NAV_ITEMS.forEach(item => {
    if (item.section) {
      const label = document.createElement('div');
      label.className = 'nav-section-label';
      label.textContent = item.label;
      nav.appendChild(label);
      return;
    }
    const a = document.createElement('a');
    a.className = `nav-link${item.id === activeId ? ' active' : ''}`;
    a.href = item.href;
    a.innerHTML = `<span class="material-symbols-outlined${item.id === activeId ? ' filled' : ''}">${item.icon}</span> ${item.label}`;
    nav.appendChild(a);
  });

  // Logout button
  const logout = document.createElement('button');
  logout.className = 'nav-cta magnetic';
  logout.style.cssText = 'margin-top:auto;background:var(--error);';
  logout.innerHTML = '<span class="material-symbols-outlined">logout</span> Logout';
  logout.onclick = () => {
    localStorage.removeItem('mv-user');
    localStorage.removeItem('mv-token');
    window.location.href = '/login.html';
  };
  nav.appendChild(logout);

  document.body.prepend(nav);
}

/** Render top app bar */
function renderTopBar(title = '') {
  const bar = document.createElement('header');
  bar.className = 'top-bar';
  bar.innerHTML = `
    <div class="top-bar-title">${title}</div>
    <div class="top-bar-actions">
      <button class="theme-toggle" onclick="ThemeManager.toggle()" title="Toggle theme">
        <span class="material-symbols-outlined" id="theme-icon">dark_mode</span>
      </button>
      <button class="icon-btn" title="Notifications" onclick="window.location.href='/dashboard.html'">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button class="icon-btn" title="Account" onclick="showProfileDropdown(this)">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
      <a href="/safe-exit.html" class="btn btn-danger" style="padding:10px 20px;font-size:13px;">
        <span class="material-symbols-outlined" style="font-size:18px;">exit_to_app</span> Safe Exit
      </a>
    </div>
  `;
  document.body.prepend(bar);
}

/** Show Profile Dropdown */
function showProfileDropdown(btn) {
  let menu = document.getElementById('profile-menu');
  if (menu) {
    menu.remove();
    return;
  }
  
  const user = getCurrentUser();
  if (!user) return;
  
  menu = document.createElement('div');
  menu.id = 'profile-menu';
  menu.className = 'card glass-panel reveal animate-slide-up';
  
  const rect = btn.getBoundingClientRect();
  menu.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 10}px;
    right: 20px;
    width: 250px;
    z-index: 10000;
    padding: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  `;
  
  menu.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="width:44px;height:44px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;">
        ${user.displayName.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-family:var(--font-display);font-weight:600;font-size:16px;">${user.displayName}</div>
        <div style="font-family:var(--font-body);font-size:12px;color:var(--text-secondary);">${user.email}</div>
      </div>
    </div>
    <div style="border-top:1px solid var(--surface-container-high);padding-top:12px;">
      <button class="btn btn-primary" style="width:100%;padding:10px;" onclick="localStorage.removeItem('mv-user'); localStorage.removeItem('mv-token'); window.location.href='/login.html';">
        <span class="material-symbols-outlined" style="font-size:18px;">logout</span> Logout
      </button>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (menu && !menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

/** Render bottom nav (mobile) */
function renderBottomNav(activeId) {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  BOTTOM_NAV_ITEMS.forEach(item => {
    const a = document.createElement('a');
    a.className = `bottom-nav-item${item.id === activeId ? ' active' : ''}`;
    a.href = item.href;
    a.innerHTML = `<span class="material-symbols-outlined${item.id === activeId ? ' filled' : ''}">${item.icon}</span><span>${item.label}</span>`;
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
}

/** Render ambient background */
function renderAmbientBg() {
  const bg = document.createElement('div');
  bg.className = 'ambient-bg';
  bg.id = 'ambient-bg';
  bg.innerHTML = `
    <div class="ambient-glow ambient-glow-1"></div>
    <div class="ambient-glow ambient-glow-2"></div>
    <div class="ambient-glow ambient-glow-3"></div>
  `;
  document.body.prepend(bg);
}

/** Initialize shared layout for all pages */
function initSharedLayout(pageId, pageTitle) {
  ThemeManager.init();
  if (!document.getElementById('ambient-bg')) renderAmbientBg();
  
  // Only render nav on non-auth pages
  if (pageId !== 'login' && pageId !== 'signup') {
    if (!document.getElementById('side-nav')) renderSideNav(pageId);
    if (!document.querySelector('.top-bar')) renderTopBar(pageTitle);
    if (!document.querySelector('.bottom-nav')) renderBottomNav(pageId);
    
    // Always update the title
    const titleEl = document.querySelector('.top-bar-title');
    if (titleEl) titleEl.textContent = pageTitle;
  }
}

/** Auth guard — redirect to login if not authenticated */
function checkAuth() {
  const token = localStorage.getItem('mv-token');
  const currentPage = getCurrentPageId();
  
  if (!token && currentPage !== 'login' && currentPage !== 'signup') {
    window.location.href = '/login.html';
    return null;
  }
  const user = localStorage.getItem('mv-user');
  return user ? JSON.parse(user) : null;
}

/** Get current user data — returns null if not logged in */
function getCurrentUser() {
  const data = localStorage.getItem('mv-user');
  return data ? JSON.parse(data) : null;
}

/** Get auth token for API calls */
function getAuthToken() {
  return localStorage.getItem('mv-token');
}

/** Get auth headers for fetch requests */
function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/** Format timestamp */
function timeAgo(date) {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Show toast notification */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    info: 'var(--primary)',
    success: 'var(--secondary)',
    warning: 'var(--accent-orange)',
    error: 'var(--error)'
  };
  toast.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);
    padding:14px 28px;border-radius:var(--radius-full);
    background:${colors[type]};color:#fff;font-weight:600;font-size:14px;
    z-index:9999;opacity:0;transition:all 0.4s var(--ease-out);
    box-shadow:0 8px 24px rgba(0,0,0,0.2);font-family:var(--font-label);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/** Render empty state in a container */
function renderEmptyState(containerId, icon, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:60px 20px;opacity:0.6;">
      <span class="material-symbols-outlined" style="font-size:64px;color:var(--primary);display:block;margin-bottom:16px;">${icon}</span>
      <p style="font-size:16px;color:var(--text-secondary);font-family:var(--font-label);">${message}</p>
    </div>
  `;
}

// --- AI Guardian Widget Management ---
function updateAiWidgetVisibility() {
  const currentPath = window.location.pathname;
  let widget = document.querySelector('.ai-guardian-widget');
  
  const shouldHide = currentPath.includes('ai-first-aid') || currentPath.includes('login') || currentPath.includes('signup');

  if (shouldHide) {
    if (widget) widget.style.display = 'none';
  } else {
    if (!widget) {
      widget = document.createElement('div');
      widget.className = 'ai-guardian-widget reveal animate-slide-up';
      
      // Use SPA routing for widget click
      widget.onclick = (e) => {
        e.preventDefault();
        window.history.pushState({}, '', '/ai-first-aid.html');
        loadPage('/ai-first-aid.html');
      };
      
      widget.innerHTML = `
        <div class="ai-guardian-speech">Need help? I'm here! 💙</div>
        <img src="/assets/guardian.png" alt="AI Guardian" class="ai-guardian-3d" />
      `;
      document.body.appendChild(widget);
    }
    widget.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAiWidgetVisibility();
});

// --- Lightweight SPA Router ---
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#') || href.includes('login') || href.includes('signup')) {
    return;
  }

  e.preventDefault();
  window.history.pushState({}, '', href);
  await loadPage(href);
});

window.addEventListener('popstate', () => {
  loadPage(window.location.pathname);
});

async function loadPage(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Replace main content
    const newMain = doc.querySelector('.main-content');
    const oldMain = document.querySelector('.main-content');
    if (newMain && oldMain) {
      oldMain.innerHTML = newMain.innerHTML;
    }

    // Update Title
    document.title = doc.title;

    // Update AI Widget visibility based on new URL
    updateAiWidgetVisibility();

    // Update active nav state
    const currentId = url.split('/').pop().replace('.html', '') || 'dashboard';
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(el => {
      el.classList.remove('active');
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) icon.classList.remove('filled');
      
      const linkHref = el.getAttribute('href');
      if (linkHref && linkHref.includes(currentId)) {
        el.classList.add('active');
        if (icon) icon.classList.add('filled');
      }
    });

    // Re-initialize animations for new content
    if (window.MindVaultAnimations) {
      window.MindVaultAnimations.init3DTilt('.main-content .glass-panel');
      window.MindVaultAnimations.initMagneticHover('.main-content .magnetic');
      window.MindVaultAnimations.initRipple('.main-content .btn');
      window.MindVaultAnimations.initScrollReveal('.main-content .reveal');
    }

    // Extract and inject page-specific styles
    document.querySelectorAll('style[data-route-style]').forEach(s => s.remove());
    doc.querySelectorAll('head style').forEach(style => {
      const s = document.createElement('style');
      s.textContent = style.textContent;
      s.setAttribute('data-route-style', 'true');
      document.head.appendChild(s);
    });

    // Execute inline scripts from the fetched page
    const scripts = doc.querySelectorAll('.main-content script, body > script:not([src])');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        // Convert const/let to var to prevent SyntaxError on redeclaration during navigation
        let code = oldScript.textContent;
        code = code.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');
        newScript.textContent = code;
      }
      document.body.appendChild(newScript);
      setTimeout(() => newScript.remove(), 100);
    });
    
  } catch(err) {
    console.error('Failed to route, falling back to full reload:', err);
    window.location.href = url;
  }
}
