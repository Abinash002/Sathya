/**
 * ==========================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 02: SECRET CODE SCREEN
 * Vanilla JavaScript Component
 * ==========================================================================
 */

(function () {
  'use strict';

  // Configurable Secret Passcode (Exactly 6 digits)
  const SECRET_CODE = '202004';
  const MAX_DIGITS = 6;

  // DOM Elements
  const cardElement = document.getElementById('secret-code-card');
  const kittenWrap = document.getElementById('secret-code-kitten-wrap');
  const subtitleElement = document.getElementById('secret-code-subtitle');
  const slotsContainer = document.getElementById('secret-code-slots');
  const keypadElement = document.getElementById('secret-code-keypad');
  const confettiContainer = document.getElementById('secret-code-confetti');
  const unlockedBadge = document.getElementById('secret-code-unlocked-badge');

  // Cache slots list
  const slotElements = slotsContainer ? Array.from(slotsContainer.querySelectorAll('.secret-code-slot')) : [];

  // State
  let enteredCode = '';
  let isLocked = false;
  let isShaking = false;
  let isSuccess = false;

  // Default subtitle text
  const DEFAULT_SUBTITLE = 'Hmm... only someone special knows this secret.';
  const ERROR_SUBTITLE = 'Oops! Try again, birthday girl!';

  /**
   * Updates the UI dots display based on current enteredCode length
   */
  function updateSlotsDisplay() {
    slotElements.forEach((slot, index) => {
      const isFilled = index < enteredCode.length;
      if (isFilled) {
        slot.classList.add('secret-code-filled');
        slot.setAttribute('aria-label', `Digit ${index + 1} entered`);
      } else {
        slot.classList.remove('secret-code-filled');
        slot.setAttribute('aria-label', `Digit ${index + 1} empty`);
      }
      // Remove any lingering error or success highlights
      slot.classList.remove('secret-code-slot-error', 'secret-code-slot-success');
    });
  }

  /**
   * Appends a digit to enteredCode if within limits
   * @param {string} digit - Number character '0'-'9'
   */
  function addDigit(digit) {
    if (isLocked || isShaking || isSuccess) return;
    if (enteredCode.length >= MAX_DIGITS) return;

    enteredCode += digit;
    updateSlotsDisplay();

    // Auto-validate when all 6 digits are entered
    if (enteredCode.length === MAX_DIGITS) {
      setTimeout(validateCode, 120);
    }
  }

  /**
   * Removes the last entered digit
   */
  function deleteDigit() {
    if (isLocked || isShaking || isSuccess) return;
    if (enteredCode.length === 0) return;

    enteredCode = enteredCode.slice(0, -1);
    updateSlotsDisplay();
  }

  /**
   * Validates the entered code against SECRET_CODE
   */
  function validateCode() {
    if (isLocked || isShaking || isSuccess) return;
    if (enteredCode.length === 0) return;

    if (enteredCode === SECRET_CODE) {
      handleSuccess();
    } else {
      handleIncorrect();
    }
  }

  /**
   * Triggered when code is incorrect
   */
  function handleIncorrect() {
    isShaking = true;

    // 1. Gently shake keypad and card
    if (cardElement) cardElement.classList.add('secret-code-is-shaking');

    // 2. Mark slots as error
    slotElements.forEach((slot) => {
      slot.classList.add('secret-code-slot-error');
    });

    // 3. Show error feedback text
    if (subtitleElement) {
      subtitleElement.textContent = ERROR_SUBTITLE;
      subtitleElement.classList.add('secret-code-is-error');
    }

    // 4. Clear entered digits after short delay (approx 750ms) and reset for another attempt
    setTimeout(() => {
      enteredCode = '';
      updateSlotsDisplay();

      if (cardElement) cardElement.classList.remove('secret-code-is-shaking');
      if (subtitleElement) {
        subtitleElement.textContent = DEFAULT_SUBTITLE;
        subtitleElement.classList.remove('secret-code-is-error');
      }

      isShaking = false;
    }, 800);
  }

  /**
   * Triggered when code is correct
   */
  function handleSuccess() {
    isSuccess = true;
    isLocked = true;

    // 1. Disable keypad input
    if (keypadElement) {
      keypadElement.classList.add('secret-code-is-disabled');
      const buttons = keypadElement.querySelectorAll('.secret-code-btn');
      buttons.forEach(btn => btn.setAttribute('disabled', 'true'));
    }

    // 2. Turn slots golden
    slotElements.forEach((slot) => {
      slot.classList.add('secret-code-slot-success');
    });

    // 3. Show golden unlock glow on the card
    if (cardElement) {
      cardElement.classList.add('secret-code-is-unlocked');
    }

    // 4. Animate kitten celebration jump
    if (kittenWrap) {
      kittenWrap.classList.add('secret-code-is-celebrating');
    }

    // 5. Update subtitle and reveal unlocked badge
    if (subtitleElement) {
      subtitleElement.textContent = '♡ Perfect! Surprise unlocked! ♡';
      subtitleElement.style.color = '#c48b11';
      subtitleElement.style.fontWeight = '700';
    }

    if (unlockedBadge) {
      unlockedBadge.setAttribute('aria-hidden', 'false');
    }

    // 6. Confetti and heart particle burst
    triggerConfettiBurst();

    // 7. Dispatch the specified event: 'birthday:code-unlocked'
    const unlockDetail = {
      source: 'secret-code',
      code: SECRET_CODE,
      timestamp: Date.now()
    };

    const unlockEvent = new CustomEvent('birthday:code-unlocked', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: unlockDetail
    });

    window.dispatchEvent(unlockEvent);
    document.dispatchEvent(unlockEvent);

    console.log('[Birthday Website] Custom event fired: "birthday:code-unlocked"', unlockDetail);

    // 8. Wait for celebration, then smooth fade out and navigate to Section 03
    setTimeout(() => {
      try {
        sessionStorage.setItem('birthday_music_playing', 'true');
        sessionStorage.setItem('birthday_music_user_enabled', 'true');
        sessionStorage.removeItem('birthday_music_user_paused');
      } catch (err) {}

      if (cardElement) cardElement.classList.add('secret-code-is-exiting');
      if (kittenWrap) kittenWrap.classList.add('secret-code-is-exiting');
      setTimeout(() => {
        window.location.href = 'birthday%20greeting.html';
      }, 700);
    }, 2400);
  }

  /**
   * Generates a sweet celebratory shower of paper confetti, hearts, and golden stars
   */
  function triggerConfettiBurst() {
    if (!confettiContainer) return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    confettiContainer.classList.add('secret-code-active');
    confettiContainer.innerHTML = '';

    const colors = ['#ffd770', '#ff6b81', '#f5af19', '#ffffff', '#e74c3c', '#eddcc4'];
    const shapes = ['rect', 'heart', 'star', 'circle'];
    const totalPieces = 60;

    for (let i = 0; i < totalPieces; i++) {
      const piece = document.createElement('div');
      piece.className = 'secret-code-confetti-piece';

      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100; // % across width
      const size = Math.floor(Math.random() * 10) + 8; // 8-18px
      const duration = (Math.random() * 2.5 + 2.2).toFixed(2); // 2.2 - 4.7s
      const delay = (Math.random() * 1.5).toFixed(2); // 0 - 1.5s

      piece.style.left = `${left}%`;
      piece.style.animationDuration = `${duration}s`;
      piece.style.animationDelay = `${delay}s`;

      if (shape === 'rect') {
        piece.style.width = `${size}px`;
        piece.style.height = `${Math.floor(size * 0.6)}px`;
        piece.style.backgroundColor = color;
        piece.style.borderRadius = '2px';
      } else if (shape === 'circle') {
        piece.style.width = `${size}px`;
        piece.style.height = `${size}px`;
        piece.style.backgroundColor = color;
        piece.style.borderRadius = '50%';
      } else if (shape === 'heart') {
        piece.textContent = '♡';
        piece.style.fontSize = `${size + 4}px`;
        piece.style.color = color;
        piece.style.lineHeight = '1';
      } else if (shape === 'star') {
        piece.textContent = '✦';
        piece.style.fontSize = `${size + 2}px`;
        piece.style.color = color;
        piece.style.lineHeight = '1';
      }

      confettiContainer.appendChild(piece);
    }

    // Clean up confetti elements after animation finishes
    setTimeout(() => {
      if (confettiContainer) {
        confettiContainer.innerHTML = '';
        confettiContainer.classList.remove('secret-code-active');
      }
    }, 6500);
  }

  /* --------------------------------------------------------------------------
     Event Listeners (Registered only once)
     -------------------------------------------------------------------------- */
  function initializeEventListeners() {
    if (!keypadElement) return;

    // 1. Mouse & Touch interactions on Keypad
    keypadElement.addEventListener('click', function (e) {
      const btn = e.target.closest('.secret-code-btn');
      if (!btn) return;

      e.preventDefault();

      // Tactile button animation feedback
      btn.classList.add('secret-code-btn-active');
      setTimeout(() => btn.classList.remove('secret-code-btn-active'), 120);

      const digit = btn.getAttribute('data-digit');
      const action = btn.getAttribute('data-action');

      if (digit !== null) {
        addDigit(digit);
      } else if (action === 'backspace') {
        deleteDigit();
      } else if (action === 'submit') {
        validateCode();
      }
    });

    // 2. Physical Keyboard Support
    window.addEventListener('keydown', function (e) {
      if (isLocked) return;

      // Digits 0-9 (standard keys or numpad)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);

        // Highlight matching on-screen button briefly for visual feedback
        const matchingBtn = keypadElement.querySelector(`[data-digit="${e.key}"]`);
        if (matchingBtn) {
          matchingBtn.classList.add('secret-code-btn-active');
          setTimeout(() => matchingBtn.classList.remove('secret-code-btn-active'), 120);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteDigit();

        const backspaceBtn = keypadElement.querySelector('[data-action="backspace"]');
        if (backspaceBtn) {
          backspaceBtn.classList.add('secret-code-btn-active');
          setTimeout(() => backspaceBtn.classList.remove('secret-code-btn-active'), 120);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        validateCode();

        const submitBtn = keypadElement.querySelector('[data-action="submit"]');
        if (submitBtn) {
          submitBtn.classList.add('secret-code-btn-active');
          setTimeout(() => submitBtn.classList.remove('secret-code-btn-active'), 120);
        }
      }
    });
  }

  // Self-initialize on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventListeners, { once: true });
  } else {
    initializeEventListeners();
  }

  // Public Component API for inspection and testing
  window.BirthdaySecretCode = {
    getCode: () => enteredCode,
    isUnlocked: () => isSuccess,
    reset: function () {
      enteredCode = '';
      isLocked = false;
      isShaking = false;
      isSuccess = false;
      updateSlotsDisplay();
      if (cardElement) cardElement.classList.remove('secret-code-is-unlocked', 'secret-code-is-shaking');
      if (kittenWrap) kittenWrap.classList.remove('secret-code-is-celebrating');
      if (keypadElement) {
        keypadElement.classList.remove('secret-code-is-disabled');
        const buttons = keypadElement.querySelectorAll('.secret-code-btn');
        buttons.forEach(btn => btn.removeAttribute('disabled'));
      }
      if (subtitleElement) {
        subtitleElement.textContent = DEFAULT_SUBTITLE;
        subtitleElement.classList.remove('secret-code-is-error');
        subtitleElement.style.color = '';
        subtitleElement.style.fontWeight = '';
      }
    },
    SECRET_CODE: SECRET_CODE
  };

  console.log('[Birthday Website] Section 02: Secret Code screen initialized successfully.');
})();

