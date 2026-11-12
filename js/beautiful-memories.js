/**
 * ============================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 06: BEAUTIFUL MEMORIES
 * Script: Smooth Vertical Scroll-Reveal & Persistent Background Music
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Strict Scroll to Top on Load
     -------------------------------------------------------------------------- */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Guarantee top position even on immediate re-entry
  window.addEventListener('load', () => {
    window.scrollTo(0, 0);
  });

  /* --------------------------------------------------------------------------
     2. Session Storage & Audio Configuration
     -------------------------------------------------------------------------- */
  const STORAGE_KEYS = {
    TIME: 'sathya_birthday_music_time',
    PLAYING: 'sathya_birthday_music_playing',
    USER_ENABLED: 'sathya_birthday_music_enabled',
    USER_PAUSED: 'sathya_birthday_music_user_paused'
  };

  const musicPlayer = document.getElementById('beautiful-memories-music-player');
  const musicBtn = document.getElementById('beautiful-memories-music-btn');
  const musicAudio = document.getElementById('beautiful-memories-audio');
  const continueBtn = document.getElementById('beautiful-memories-continue-btn');
  const mainContainer = document.getElementById('beautiful-memories-main');

  let isAudioPlaying = false;
  let webAudioCtx = null;
  let webAudioTimer = null;
  let webAudioFallbackActive = false;
  let hasNavigatedToLetter = false;

  /* --------------------------------------------------------------------------
     3. Web Audio API Music Box Chime Fallback
     -------------------------------------------------------------------------- */
  function playMusicBoxChime() {
    if (webAudioFallbackActive) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!webAudioCtx) webAudioCtx = new AudioCtx();

      if (webAudioCtx.state === 'suspended') {
        webAudioCtx.resume();
      }

      webAudioFallbackActive = true;

      // "Happy Birthday" melody note frequencies
      const notes = [
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.25 }, { f: 293.66, d: 0.6 },
        { f: 261.63, d: 0.6 },  { f: 349.23, d: 0.6 },  { f: 329.63, d: 1.1 },
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.25 }, { f: 293.66, d: 0.6 },
        { f: 261.63, d: 0.6 },  { f: 392.00, d: 0.6 },  { f: 349.23, d: 1.1 },
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.25 }, { f: 523.25, d: 0.6 },
        { f: 440.00, d: 0.6 },  { f: 349.23, d: 0.6 },  { f: 329.63, d: 0.6 },
        { f: 293.66, d: 0.9 },
        { f: 466.16, d: 0.35 }, { f: 466.16, d: 0.25 }, { f: 440.00, d: 0.6 },
        { f: 349.23, d: 0.6 },  { f: 392.00, d: 0.6 },  { f: 349.23, d: 1.3 }
      ];

      let noteIdx = 0;

      function playNextNote() {
        if (!isAudioPlaying || !webAudioFallbackActive) return;

        const current = notes[noteIdx];
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();

        // Music box kalimba tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(current.f, webAudioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, webAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, webAudioCtx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, webAudioCtx.currentTime + current.d);

        osc.connect(gain);
        gain.connect(webAudioCtx.destination);

        osc.start();
        osc.stop(webAudioCtx.currentTime + current.d);

        noteIdx = (noteIdx + 1) % notes.length;
        webAudioTimer = setTimeout(playNextNote, current.d * 1000 + 120);
      }

      playNextNote();
    } catch (err) {
      console.warn('[Music Player] Web Audio fallback issue:', err);
    }
  }

  function stopMusicBoxChime() {
    webAudioFallbackActive = false;
    if (webAudioTimer) {
      clearTimeout(webAudioTimer);
      webAudioTimer = null;
    }
  }

  /* --------------------------------------------------------------------------
     4. Persistent Music Player Operations
     -------------------------------------------------------------------------- */
  function updatePlayerUI(playing) {
    isAudioPlaying = playing;
    if (!musicPlayer || !musicBtn) return;

    if (playing) {
      musicPlayer.classList.add('is-playing');
      musicBtn.setAttribute('aria-pressed', 'true');
      musicBtn.setAttribute('aria-label', 'Pause background music');
    } else {
      musicPlayer.classList.remove('is-playing');
      musicBtn.setAttribute('aria-pressed', 'false');
      musicBtn.setAttribute('aria-label', 'Play background music');
    }
  }

  function playMusic(userInitiated = false) {
    if (userInitiated) {
      sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
    }

    if (!musicAudio) {
      updatePlayerUI(true);
      sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
      playMusicBoxChime();
      return;
    }

    const playPromise = musicAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          updatePlayerUI(true);
          sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
          sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
        })
        .catch(() => {
          if (userInitiated || sessionStorage.getItem(STORAGE_KEYS.USER_ENABLED) === 'true') {
            updatePlayerUI(true);
            sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
            sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
            playMusicBoxChime();
          }
        });
    }
  }

  function pauseMusic() {
    if (musicAudio) {
      musicAudio.pause();
    }
    stopMusicBoxChime();
    updatePlayerUI(false);
    sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'false');
    sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'true');
  }

  function toggleMusic() {
    if (isAudioPlaying) {
      pauseMusic();
    } else {
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
      playMusic(true);
    }
  }

  function initMusicPlayer() {
    if (!musicAudio || !musicBtn) return;

    // Restore saved playback timestamp
    const savedTime = sessionStorage.getItem(STORAGE_KEYS.TIME);
    if (savedTime && !isNaN(parseFloat(savedTime))) {
      try {
        musicAudio.currentTime = parseFloat(savedTime);
      } catch (e) {
        // Ignored if media not yet buffered
      }
    }

    // Continuously preserve current playback time in sessionStorage
    musicAudio.addEventListener('timeupdate', () => {
      if (!musicAudio.paused && musicAudio.currentTime > 0) {
        sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      }
    });

    musicAudio.addEventListener('play', () => updatePlayerUI(true));
    musicAudio.addEventListener('pause', () => {
      if (!webAudioFallbackActive) updatePlayerUI(false);
    });

    // Check if user previously paused music or enabled playback
    const wasPlaying = sessionStorage.getItem(STORAGE_KEYS.PLAYING) === 'true';
    const userEnabled = sessionStorage.getItem(STORAGE_KEYS.USER_ENABLED) === 'true';
    const userPaused = sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) === 'true';

    // Auto-resume music playback if already enabled in earlier sections
    if (!userPaused && (wasPlaying || userEnabled)) {
      playMusic(false);
    }

    // Toggle button click listener
    musicBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
    });

    // Global first-interaction audio unlock fallback
    const unlockAudio = () => {
      const isPausedByUser = sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) === 'true';
      if (!isAudioPlaying && !isPausedByUser) {
        playMusic(false);
      }
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    document.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  }

  /* --------------------------------------------------------------------------
     5. Scroll-Reveal Intersection Observer
     -------------------------------------------------------------------------- */
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll(
      '.beautiful-memories-photo-section, .beautiful-memories-closing-section'
    );

    if (!('IntersectionObserver' in window)) {
      // Fallback: reveal all immediately if IntersectionObserver unsupported
      revealTargets.forEach((target) => target.classList.add('is-revealed'));
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealTargets.forEach((target) => {
      revealObserver.observe(target);
    });

    // Automatically reveal the first photo section right away so it greets Sathya smoothly
    const firstSection = document.getElementById('memory-section-1');
    if (firstSection) {
      setTimeout(() => {
        firstSection.classList.add('is-revealed');
      }, 250);
    }
  }

  /* --------------------------------------------------------------------------
     6. Continue Navigation to Section 07 (Birthday Letter)
     -------------------------------------------------------------------------- */
  function navigateToBirthdayLetter() {
    if (hasNavigatedToLetter) return;
    hasNavigatedToLetter = true;

    console.log('[Beautiful Memories] Navigating to birthday letter...');

    // Preserve music playback state
    if (musicAudio && !musicAudio.paused) {
      sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
    }

    // Add smooth fade out
    if (mainContainer) {
      mainContainer.classList.add('beautiful-memories-is-exiting');
    }

    setTimeout(() => {
      window.location.href = 'birthday%20letter.html';
    }, 750);
  }

  function initContinueNavigation() {
    if (!continueBtn) return;

    continueBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToBirthdayLetter();
    });
  }

  /* --------------------------------------------------------------------------
     7. Initialization
     -------------------------------------------------------------------------- */
  function initialize() {
    initMusicPlayer();
    initScrollReveal();
    initContinueNavigation();
    console.log('[Birthday Website] Section 06: Beautiful Memories initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Public Component API
  window.BeautifulMemoriesSection = {
    navigateToLetter: navigateToBirthdayLetter,
    toggleMusic: toggleMusic,
    playMusic: playMusic,
    pauseMusic: pauseMusic,
    isPlaying: () => isAudioPlaying
  };

})();
