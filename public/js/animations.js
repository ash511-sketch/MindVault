/* ============================================================
   MindVault Kids — Animation Engine
   3D Tilt, Magnetic Hover, Particles, Parallax, Living Stream
   ============================================================ */

const MindVaultAnimations = {

  /** Generate ambient floating particles */
  initParticles(containerId = 'ambient-bg', count = 20) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const size = Math.random() * 5 + 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `${Math.random() * 100}vh`;
      p.style.animationDelay = `${Math.random() * 10}s`;
      p.style.animationDuration = `${Math.random() * 8 + 8}s`;
      container.appendChild(p);
    }
  },

  /** 3D tilt effect on glass panels (cursor-tracking perspective) */
  init3DTilt(selector = '.glass-panel') {
    document.querySelectorAll(selector).forEach(panel => {
      panel.addEventListener('mousemove', e => {
        const rect = panel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const tiltX = ((y - cy) / cy) * -4;
        const tiltY = ((x - cx) / cx) * 4;
        panel.style.setProperty('--mouse-x', `${x}px`);
        panel.style.setProperty('--mouse-y', `${y}px`);
        panel.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.01, 1.01, 1.01)`;
      });
      panel.addEventListener('mouseleave', () => {
        panel.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      });
    });
  },

  /** Magnetic hover — element moves toward cursor */
  initMagneticHover(selector = '.magnetic') {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) * 0.15;
        const dy = (e.clientY - rect.top - rect.height / 2) * 0.15;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  },

  /** Parallax depth for ambient glows */
  initParallax() {
    document.addEventListener('mousemove', e => {
      const glows = document.querySelectorAll('.ambient-glow');
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      glows.forEach((g, i) => {
        const speed = (i + 1) * 20;
        g.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    });
  },

  /** Animated ERS living SVG stream */
  initLivingStream(pathSelector = '.living-stream-path') {
    const path = document.querySelector(pathSelector);
    if (!path) return;
    let offset = 0;
    const animate = () => {
      offset += 0.4;
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const x = i * 100;
        const y = 50 + Math.sin((offset + i * 20) * 0.04) * (20 + Math.sin(i) * 10);
        pts.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
      }
      path.setAttribute('d', pts.join(' '));
      requestAnimationFrame(animate);
    };
    animate();
  },

  /** Button click ripple */
  initRipple(selector = '.btn') {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `
          position:absolute;width:${size}px;height:${size}px;
          left:${e.clientX - rect.left - size / 2}px;
          top:${e.clientY - rect.top - size / 2}px;
          background:rgba(255,255,255,0.3);border-radius:50%;
          transform:scale(0);animation:btnRipple 0.6s ease-out forwards;
          pointer-events:none;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Inject ripple keyframe if not present
    if (!document.getElementById('ripple-keyframe')) {
      const style = document.createElement('style');
      style.id = 'ripple-keyframe';
      style.textContent = `@keyframes btnRipple{to{transform:scale(4);opacity:0;}}`;
      document.head.appendChild(style);
    }
  },

  /** Scroll-triggered entrance animations */
  initScrollReveal(selector = '.reveal') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(selector).forEach(el => observer.observe(el));
  },

  /** Initialize all animations */
  initAll() {
    this.initParticles();
    this.init3DTilt();
    this.initMagneticHover();
    this.initParallax();
    this.initRipple();
    this.initScrollReveal();
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => MindVaultAnimations.initAll());
