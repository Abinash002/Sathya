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

  if (!container || !sealBtn || !openGiftBtn) {
    console.warn('[Envelope] Required elements not found. Initialization skipped.');
    return;
  }

  // State flags
  let isOpen = false;
  let isExited = false;

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
   * 1. Animates the letter gently out of view
   * 2. Fires the custom JavaScript event 'birthday:open-gift'
   * 3. Waits approximately 700ms for smooth fade-out
   * 4. Navigates to Section 02 (secret code.html)
   */
  function continueToGift(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isExited) return;
    isExited = true;

    // Visual exit transition (0.7s smooth fade-out in envelope.css)
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

    // Wait 700ms for smooth fade-out animation, then navigate to Section 02
    setTimeout(function () {
      const isSubfolder = window.location.pathname.includes('/sections/envelope/');
      window.location.href = isSubfolder ? '../../secret%20code.html' : 'secret%20code.html';
    }, 700);
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
