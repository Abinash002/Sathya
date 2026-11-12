/**
 * ============================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 07: THREE LITTLE LETTERS FOR YOU
 * Interactive Envelopes, Sequential Unfolding & Final Video Surprise
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Scroll to Top on Load
     -------------------------------------------------------------------------- */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  /* --------------------------------------------------------------------------
     2. Session Storage & Music Player Integration
     -------------------------------------------------------------------------- */
  const STORAGE_KEYS = {
    TIME: 'sathya_birthday_music_time',
    PLAYING: 'sathya_birthday_music_playing',
    USER_ENABLED: 'sathya_birthday_music_enabled',
    USER_PAUSED: 'sathya_birthday_music_user_paused'
  };

  const musicPlayer = document.getElementById('birthday-letter-music-player');
  const musicBtn = document.getElementById('birthday-letter-music-btn');
  const musicAudio = document.getElementById('birthday-letter-audio');

  let isAudioPlaying = false;
  let webAudioCtx = null;
  let webAudioTimer = null;
  let webAudioFallbackActive = false;

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

    const savedTime = sessionStorage.getItem(STORAGE_KEYS.TIME);
    if (savedTime && !isNaN(parseFloat(savedTime))) {
      try {
        musicAudio.currentTime = parseFloat(savedTime);
      } catch (e) {
        // Ignored
      }
    }

    musicAudio.addEventListener('timeupdate', () => {
      if (!musicAudio.paused && musicAudio.currentTime > 0) {
        sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      }
    });

    musicAudio.addEventListener('play', () => updatePlayerUI(true));
    musicAudio.addEventListener('pause', () => {
      if (!webAudioFallbackActive) updatePlayerUI(false);
    });

    const wasPlaying = sessionStorage.getItem(STORAGE_KEYS.PLAYING) === 'true';
    const userEnabled = sessionStorage.getItem(STORAGE_KEYS.USER_ENABLED) === 'true';
    const userPaused = sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) === 'true';

    if (!userPaused && (wasPlaying || userEnabled)) {
      playMusic(false);
    }

    musicBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
    });

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
     3. Subtle Confetti / Sparkles Burst Helper
     -------------------------------------------------------------------------- */
  function triggerConfettiBurst(count = 35) {
    const symbols = ['✨', '♡', '✦', '🌸', '🤍', '⭐'];
    const container = document.body;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'birthday-letter-ambient-item';
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      
      const startX = 20 + Math.random() * 60;
      const startY = 30 + Math.random() * 40;
      const duration = 1.8 + Math.random() * 1.6;

      particle.style.position = 'fixed';
      particle.style.left = `${startX}vw`;
      particle.style.top = `${startY}vh`;
      particle.style.fontSize = `${0.9 + Math.random() * 1.4}rem`;
      particle.style.color = Math.random() > 0.5 ? '#ffd770' : '#ffcdd2';
      particle.style.zIndex = '300';
      particle.style.pointerEvents = 'none';
      particle.style.transition = `all ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
      particle.style.opacity = '1';

      container.appendChild(particle);

      requestAnimationFrame(() => {
        const destX = (Math.random() - 0.5) * 160;
        const destY = -60 - Math.random() * 120;
        particle.style.transform = `translate(${destX}px, ${destY}px) rotate(${(Math.random() - 0.5) * 180}deg)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, duration * 1000 + 100);
    }
  }

  /* --------------------------------------------------------------------------
     4. Interactive Three Envelopes & Modal Management
     -------------------------------------------------------------------------- */
  const modalBackdrop = document.getElementById('birthday-letter-modal');
  const closeBtn = document.getElementById('birthday-letter-close-btn');

  const envelopeWraps = [
    document.getElementById('envelope-wrap-1'),
    document.getElementById('envelope-wrap-2'),
    document.getElementById('envelope-wrap-3')
  ];

  const letterSheets = [
    document.getElementById('letter-sheet-1'),
    document.getElementById('letter-sheet-2'),
    document.getElementById('letter-sheet-3')
  ];

  const btnNext1 = document.getElementById('btn-next-letter-1');
  const btnNext2 = document.getElementById('btn-next-letter-2');
  const btnSurprise = document.getElementById('btn-reveal-surprise');

  let currentOpenIndex = -1;

  function openLetter(index) {
    if (index < 0 || index > 2) return;
    currentOpenIndex = index;

    const wrap = envelopeWraps[index];
    const card = wrap ? wrap.querySelector('.birthday-letter-envelope-card') : null;

    if (card) {
      card.classList.add('is-opening');
      setTimeout(() => card.classList.remove('is-opening'), 500);
    }

    // Mark envelope as opened and remove pulse
    if (wrap) {
      wrap.classList.add('is-opened');
      wrap.classList.remove('envelope-active');
      const prompt = wrap.querySelector('.birthday-letter-env-prompt');
      if (prompt) {
        prompt.textContent = 'Opened • Read again ♡';
      }
    }

    // Set next envelope as active highlight
    const nextIndex = index + 1;
    if (nextIndex <= 2 && envelopeWraps[nextIndex] && !envelopeWraps[nextIndex].classList.contains('is-opened')) {
      envelopeWraps[nextIndex].classList.add('envelope-active');
    }

    const openDelay = card && (!modalBackdrop || !modalBackdrop.classList.contains('is-open')) ? 160 : 0;

    setTimeout(() => {
      // Hide all sheets and show only targeted sheet
      letterSheets.forEach((sheet, idx) => {
        if (sheet) {
          if (idx === index) {
            sheet.classList.add('sheet-visible');
          } else {
            sheet.classList.remove('sheet-visible');
          }
        }
      });

      // Open Modal
      if (modalBackdrop) {
        modalBackdrop.classList.add('is-open');
        modalBackdrop.setAttribute('aria-hidden', 'false');
      }

      // Sparkle burst on opening
      triggerConfettiBurst(24);

      // Focus close button or primary action for accessibility
      setTimeout(() => {
        const activeSheet = letterSheets[index];
        if (activeSheet) {
          const primaryBtn = activeSheet.querySelector('.birthday-letter-btn');
          if (primaryBtn) primaryBtn.focus();
        }
      }, 150);
    }, openDelay);

    console.log(`[Three Letters] Opened Letter ${index + 1}`);
  }

  function closeModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('is-open');
      modalBackdrop.setAttribute('aria-hidden', 'true');
    }
    letterSheets.forEach((sheet) => {
      if (sheet) sheet.classList.remove('sheet-visible');
    });

    // Return focus to corresponding envelope wrap
    if (currentOpenIndex >= 0 && envelopeWraps[currentOpenIndex]) {
      envelopeWraps[currentOpenIndex].focus();
    }
    currentOpenIndex = -1;
  }

  function initEnvelopes() {
    envelopeWraps.forEach((wrap, index) => {
      if (!wrap) return;

      const handleOpen = (e) => {
        e.preventDefault();
        openLetter(index);
      };

      wrap.addEventListener('click', handleOpen);
      wrap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleOpen(e);
        }
      });
    });

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }

    // Click outside modal container to close
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          closeModal();
        }
      });
    }

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Sequential Transition: Letter 01 -> Letter 02
    if (btnNext1) {
      btnNext1.addEventListener('click', (e) => {
        e.preventDefault();
        // Smooth switch directly to Letter 2
        openLetter(1);
      });
    }

    // Sequential Transition: Letter 02 -> Letter 03
    if (btnNext2) {
      btnNext2.addEventListener('click', (e) => {
        e.preventDefault();
        // Smooth switch directly to Letter 3
        openLetter(2);
      });
    }
  }

  /* --------------------------------------------------------------------------
     5. Final Video Surprise Screen
     -------------------------------------------------------------------------- */
  const hubSection = document.getElementById('birthday-letter-hub');
  const videoStage = document.getElementById('birthday-letter-video-stage');
  const videoPlayer = document.getElementById('birthday-letter-video');
  const videoPlaceholder = document.getElementById('birthday-letter-video-placeholder');
  const replayBtn = document.getElementById('btn-replay-video');
  const backToLettersBtn = document.getElementById('btn-back-to-letters');
  const videoMessage = document.getElementById('birthday-letter-video-message');

  function revealVideoSurprise() {
    closeModal();

    // Gently fade hub
    if (hubSection) {
      hubSection.style.opacity = '0';
      hubSection.style.pointerEvents = 'none';
      setTimeout(() => {
        hubSection.style.display = 'none';
      }, 500);
    }

    // Reveal video stage
    setTimeout(() => {
      if (videoStage) {
        videoStage.classList.add('is-visible');
        videoStage.setAttribute('aria-hidden', 'false');
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      triggerConfettiBurst(50);

      // Check and attempt to play video
      if (videoPlayer) {
        if (videoPlaceholder) {
          videoPlaceholder.classList.remove('is-active');
        }

        // Test if source loads properly
        videoPlayer.addEventListener('error', () => {
          console.warn('[Video Surprise] Video file error, displaying friendly placeholder.');
          if (videoPlaceholder) {
            videoPlaceholder.classList.add('is-active');
          }
        }, { once: true });

        // Pause background music so the video audio is heard cleanly
        pauseMusic();

        const playPromise = videoPlayer.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[Video Surprise] Video playback started.');
            })
            .catch(() => {
              // Browser may require user gesture on mobile
              console.log('[Video Surprise] Autoplay prevented, ready for user playback.');
            });
        }
      }
    }, 450);

    console.log('[Birthday Letter] Final Video Surprise revealed!');
  }

  function initVideoSurprise() {
    if (btnSurprise) {
      btnSurprise.addEventListener('click', (e) => {
        e.preventDefault();
        revealVideoSurprise();
      });
    }

    // Video playback complete celebration
    if (videoPlayer) {
      videoPlayer.addEventListener('ended', () => {
        triggerConfettiBurst(60);
        if (videoMessage) {
          videoMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // Replay button
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (videoPlayer) {
          videoPlayer.currentTime = 0;
          videoPlayer.play();
        }
      });
    }

    // Return to letters button
    if (backToLettersBtn) {
      backToLettersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (videoPlayer) {
          videoPlayer.pause();
        }
        if (videoStage) {
          videoStage.classList.remove('is-visible');
          videoStage.setAttribute('aria-hidden', 'true');
        }
        if (hubSection) {
          hubSection.style.display = 'flex';
          requestAnimationFrame(() => {
            hubSection.style.opacity = '1';
            hubSection.style.pointerEvents = 'auto';
          });
        }
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     6. Initialization
     -------------------------------------------------------------------------- */
  function initialize() {
    initMusicPlayer();
    initEnvelopes();
    initVideoSurprise();
    console.log('[Birthday Website] Section 07: Three Little Letters for You initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Public Component API
  window.ThreeLettersSection = {
    openLetter: openLetter,
    closeModal: closeModal,
    revealVideo: revealVideoSurprise,
    toggleMusic: toggleMusic
  };

})();
