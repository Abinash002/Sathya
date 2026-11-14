/**
 * Sathya's Birthday Website — Section 01: The Secret Envelope
 * Vanilla JavaScript Component
 */

(function () {
  'use strict';

  // DOM Elements
  const section = document.getElementById('envelope-section');
  const container = document.getElementById('envelope-container');
  const sealBtn = document.getElementById('envelope-seal-btn');
  const letter = document.getElementById('envelope-letter');
  const openGiftBtn = document.getElementById('envelope-open-gift-btn');
  const floralOverlay = document.getElementById('envelope-floral-carpet-overlay');
  const floralCanvas = document.getElementById('envelope-floral-carpet-canvas');
  const floralSparkles = document.getElementById('envelope-floral-sparkles');

  // Floral Assets: Strictly 90-degree overhead top-down flower heads (no stems, no leaves)
  const isSubfolder = window.location.pathname.includes('/sections/envelope/');
  const flowerBasePath = isSubfolder ? '../../assets/flowers/' : 'assets/flowers/';

  const FLOWER_ASSETS = [
    'flower-01.webp', // Fully opened white rose
    'flower-02.webp', // Soft pink tulip (90-deg overhead)
    'flower-03.webp', // Soft white tulip (90-deg overhead)
    'flower-04.webp', // Small sunflower head (golden petals, dark center)
    'flower-05.webp', // Peach/coral layered ranunculus/peony
    'flower-06.webp', // Lavender/purple flower head
    'flower-07.webp', // Soft blue flower head
    'flower-08.webp', // Crimson red rose head
    'flower-09.webp', // Coral/salmon flower head
    'flower-10.webp', // Deep purple dahlia head
    'flower-11.webp', // Warm peach flower head
    'flower-12.webp'  // Deep ruby red flower head
  ];

  // Preload flower head images immediately for instantaneous 60fps rendering
  function preloadFlowerAssets() {
    FLOWER_ASSETS.forEach(function (fileName) {
      const img = new Image();
      img.src = flowerBasePath + fileName;
    });
  }
  preloadFlowerAssets();

  if (!container || !sealBtn || !openGiftBtn) {
    console.warn('[Envelope] Required elements not found. Initialization skipped.');
    return;
  }

  // State flags
  let isOpen = false;
  let isExited = false;

  /**
   * Build & trigger the Full-Screen Floral Carpet Reveal Animation
   * Creates a dense, beautiful floral carpet of 90-degree overhead flower heads
   * that blooms outward with gentle scaling, subtle rotations, and soft depth.
   */
  function triggerFloralReveal(originX, originY) {
    if (!floralOverlay || !floralCanvas) return;

    // Reset overlay content
    floralCanvas.innerHTML = '';
    if (floralSparkles) floralSparkles.innerHTML = '';

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Responsive cell spacing for dense floral coverage with zero empty space
    const isMobile = vw < 600;
    const stepX = isMobile ? 65 : 82;
    const stepY = isMobile ? 58 : 74;
    const cols = Math.ceil(vw / stepX) + 3;
    const rows = Math.ceil(vh / stepY) + 3;
    const startX = -stepX * 1.2;
    const startY = -stepY * 1.2;

    const origin = {
      x: typeof originX === 'number' ? originX : vw / 2,
      y: typeof originY === 'number' ? originY : vh / 2
    };

    const maxDist = Math.max(Math.hypot(vw, vh), 1);
    const fragment = document.createDocumentFragment();

    let count = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Hexagonal staggered honeycomb offset
        const rowOffset = (r % 2 === 1) ? stepX * 0.5 : 0;
        const jitterX = (Math.random() - 0.5) * (stepX * 0.38);
        const jitterY = (Math.random() - 0.5) * (stepY * 0.38);

        const x = startX + c * stepX + rowOffset + jitterX;
        const y = startY + r * stepY + jitterY;

        // Realistic layered sizes: large statement blooms, medium, and petite fillers
        let size;
        const sizeRand = Math.random();
        if (sizeRand < 0.28) {
          size = isMobile ? (105 + Math.random() * 25) : (135 + Math.random() * 32); // Large
        } else if (sizeRand < 0.78) {
          size = isMobile ? (85 + Math.random() * 20) : (105 + Math.random() * 25);  // Medium
        } else {
          size = isMobile ? (65 + Math.random() * 18) : (80 + Math.random() * 22);   // Petite
        }

        // Cycle through all varieties (tulips, roses, sunflowers, coral, peach, purple, blue)
        const flowerFile = FLOWER_ASSETS[count % FLOWER_ASSETS.length];
        count++;

        const flowerEl = document.createElement('div');
        flowerEl.className = 'floral-carpet-item';
        flowerEl.style.left = `${x.toFixed(1)}px`;
        flowerEl.style.top = `${y.toFixed(1)}px`;
        flowerEl.style.width = `${Math.round(size)}px`;
        flowerEl.style.height = `${Math.round(size)}px`;

        // Subtle organic rotation during blooming
        const finalRot = Math.round(Math.random() * 360);
        const startRot = finalRot - Math.round(30 + Math.random() * 35);
        flowerEl.style.setProperty('--final-rot', `${finalRot}deg`);
        flowerEl.style.setProperty('--start-rot', `${startRot}deg`);

        // Organic blooming wave outward from button
        const dist = Math.hypot(x - origin.x, y - origin.y);
        const normDist = dist / maxDist;
        const bloomDelay = (normDist * 0.65 + Math.random() * 0.22).toFixed(3);
        const bloomDur = (0.72 + Math.random() * 0.16).toFixed(3);

        flowerEl.style.setProperty('--bloom-delay', `${bloomDelay}s`);
        flowerEl.style.setProperty('--bloom-dur', `${bloomDur}s`);

        const img = document.createElement('img');
        img.className = 'floral-carpet-img';
        img.src = flowerBasePath + flowerFile;
        img.alt = '';
        img.draggable = false;
        img.loading = 'eager';

        flowerEl.appendChild(img);
        flowerEl.classList.add('is-bloomed');
        fragment.appendChild(flowerEl);
      }
    }

    floralCanvas.appendChild(fragment);

    // Add romantic golden sparkles over the blooming floral carpet
    if (floralSparkles) {
      const sparkleCount = isMobile ? 14 : 24;
      const symbols = ['✨', '✦', '⋆', '🤍', '🌸'];
      for (let i = 0; i < sparkleCount; i++) {
        const sp = document.createElement('span');
        sp.className = 'floral-carpet-sparkle';
        sp.textContent = symbols[i % symbols.length];
        sp.style.left = `${(Math.random() * 96 + 2).toFixed(1)}%`;
        sp.style.top = `${(Math.random() * 96 + 2).toFixed(1)}%`;
        sp.style.animationDelay = `${(0.3 + Math.random() * 1.2).toFixed(2)}s`;
        sp.style.fontSize = `${(0.85 + Math.random() * 0.65).toFixed(2)}rem`;
        floralSparkles.appendChild(sp);
      }
    }

    // Activate the floral reveal overlay
    floralOverlay.classList.remove('is-fading-out');
    floralOverlay.classList.add('is-active');

    // Smooth romantic fade-out at the end of the reveal animation
    setTimeout(function () {
      floralOverlay.classList.add('is-fading-out');
    }, 2150);
  }

  /**
   * Open the envelope:
   * 1. Plays subtle seal pop tactile animation
   * 2. Flips the envelope flap using 3D CSS transform
   * 3. Shows radiant golden interior light and sparkles
   * 4. Slides the personal letter card upwards out of the envelope
   */
  function openEnvelope() {
    if (isOpen) return;
    isOpen = true;

    // Accessibility
    sealBtn.setAttribute('aria-expanded', 'true');

    // 1. Seal pop animation
    sealBtn.classList.add('is-popping');

    // 2. Prepare flap for 3D flip
    container.classList.add('is-animating-flap');

    // 3. Open container state
    setTimeout(() => {
      container.classList.add('is-open');
      container.setAttribute('data-state', 'open');

      // Focus the gift button once letter is revealed for keyboard navigation
      setTimeout(() => {
        if (openGiftBtn && !isExited) {
          openGiftBtn.focus({ preventScroll: true });
        }
      }, 1200);
    }, 120);
  }

  /**
   * Continue to next section:
   * 1. Triggers full-screen 90-degree overhead Floral Carpet Reveal
   * 2. Animates the letter gently out of view
   * 3. Fires the custom JavaScript event 'birthday:open-gift'
   * 4. Waits 2.6 seconds (fulfilling the 2–3 second floral blooming animation duration)
   * 5. Navigates smoothly to Section 02 (secret code.html)
   */
  function continueToGift(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isExited) return;
    isExited = true;

    // Trigger full-screen 90-degree overhead floral carpet reveal from button center
    let originX = window.innerWidth / 2;
    let originY = window.innerHeight / 2;
    if (openGiftBtn) {
      const rect = openGiftBtn.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
    triggerFloralReveal(originX, originY);

    // Visual exit transition for the envelope card
    container.classList.add('is-exiting');
    container.setAttribute('data-state', 'exited');

    // Dispatch custom JavaScript event 'birthday:open-gift'
    const eventDetail = {
      source: 'envelope',
      timestamp: Date.now()
    };

    const openGiftEvent = new CustomEvent('birthday:open-gift', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: eventDetail
    });

    // Dispatch on document, window, and section
    document.dispatchEvent(openGiftEvent);
    window.dispatchEvent(openGiftEvent);
    if (section) section.dispatchEvent(openGiftEvent);

    console.log('[Birthday Website] Custom event fired: "birthday:open-gift"', eventDetail);

    // Keep the 2–3 second animation duration before navigating to Section 02 (secret code.html)
    setTimeout(function () {
      const isSubfolder = window.location.pathname.includes('/sections/envelope/');
      window.location.href = isSubfolder ? '../../secret%20code.html' : 'secret%20code.html';
    }, 2600);
  }

  /* --------------------------------------------------------------------------
     Event Listeners
     -------------------------------------------------------------------------- */

  // 1. Seal click & keyboard interaction (Enter / Space)
  sealBtn.addEventListener('click', function (e) {
    e.preventDefault();
    openEnvelope();
  });

  sealBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      openEnvelope();
    }
  });

  // 2. "OPEN YOUR GIFT" Button click & keyboard interaction
  openGiftBtn.addEventListener('click', continueToGift);

  openGiftBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      continueToGift(e);
    }
  });

  /* --------------------------------------------------------------------------
     Public Component API (for debugging & parent coordination)
     -------------------------------------------------------------------------- */
  window.BirthdayEnvelope = {
    open: openEnvelope,
    continue: continueToGift,
    isOpen: () => isOpen,
    isExited: () => isExited,
    reset: function () {
      isOpen = false;
      isExited = false;
      container.classList.remove('is-open', 'is-exiting', 'is-animating-flap');
      container.setAttribute('data-state', 'closed');
      sealBtn.classList.remove('is-popping');
      sealBtn.setAttribute('aria-expanded', 'false');
    }
  };

  console.log('[Birthday Website] Section 01: Envelope component initialized successfully.');
})();
