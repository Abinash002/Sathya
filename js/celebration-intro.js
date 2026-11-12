/**
 * ==========================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 04: CELEBRATION INTRODUCTION
 * Stage Transitions & Reusable Background Music Player
 * Class Prefix: celebration-intro-
 * ==========================================================================
 */

(function () {
  'use strict';

  // SessionStorage Keys for cross-page music continuity
  const STORAGE_KEYS = {
    PLAYING: 'birthday_music_playing',
    TIME: 'birthday_music_time',
    USER_ENABLED: 'birthday_music_user_enabled',
    USER_PAUSED: 'birthday_music_user_paused'
  };

  // DOM Elements - Stages & Navigation
  const startBtn = document.getElementById('celebration-intro-start-btn');
  const cardElement = document.getElementById('celebration-intro-card');
  const stage1 = document.getElementById('celebration-intro-stage-1');
  const stage2 = document.getElementById('celebration-intro-stage-2');
  const stage3 = document.getElementById('celebration-intro-stage-3');
  const stage4 = document.getElementById('celebration-intro-stage-4');
  const particlesContainer = document.getElementById('celebration-intro-particles');
  const glowOverlay = document.getElementById('celebration-intro-glow-overlay');

  // DOM Elements - Music Player
  const musicPlayer = document.getElementById('celebration-intro-music-player');
  const musicBtn = document.getElementById('celebration-intro-music-btn');
  const musicAudio = document.getElementById('celebration-intro-audio');

  let isAudioPlaying = false;
  let webAudioFallbackActive = false;
  let webAudioCtx = null;
  let webAudioTimer = null;
  let particleInterval = null;

  /* --------------------------------------------------------------------------
     1. Web Audio API Graceful Fallback (Gentle Music Box Birthday Chime)
     -------------------------------------------------------------------------- */
  function playMusicBoxChime() {
    if (webAudioFallbackActive) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!webAudioCtx) webAudioCtx = new AudioContext();

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

  /* --------------------------------------------------------------------------
     2. Reusable Shared Background Music Player Logic
     -------------------------------------------------------------------------- */
  function updatePlayerUI(playing) {
    isAudioPlaying = playing;
    if (!musicPlayer || !musicBtn) return;

    if (playing) {
      musicPlayer.classList.add('is-playing');
      musicPlayer.classList.remove('is-ready-to-play');
      musicBtn.setAttribute('aria-pressed', 'true');
      musicBtn.setAttribute('aria-label', 'Pause background music');
    } else {
      musicPlayer.classList.remove('is-playing');
      musicBtn.setAttribute('aria-pressed', 'false');
      musicBtn.setAttribute('aria-label', 'Play background music');
    }
  }

  function toggleMusic() {
    if (isAudioPlaying) {
      pauseMusic();
    } else {
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
      playMusic(true);
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
        .catch((err) => {
          console.warn('[Music Player] Audio play error or policy:', err.name);
          if (userInitiated || sessionStorage.getItem(STORAGE_KEYS.USER_ENABLED) === 'true') {
            updatePlayerUI(true);
            sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
            sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
            playMusicBoxChime();
          } else {
            if (musicPlayer) musicPlayer.classList.add('is-ready-to-play');
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
    console.log('[Music Player] Music paused by user.');
  }

  function initMusicPlayer() {
    if (!musicAudio) return;

    // Restore saved playback position
    const savedTime = sessionStorage.getItem(STORAGE_KEYS.TIME);
    if (savedTime && !isNaN(parseFloat(savedTime))) {
      musicAudio.currentTime = parseFloat(savedTime);
    }

    musicAudio.addEventListener('timeupdate', () => {
      if (!musicAudio.paused) {
        sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      }
    });

    musicAudio.loop = true;

    musicAudio.addEventListener('error', () => {
      console.warn('[Music Player] Audio source failed. Web Audio chime fallback active.');
      if (sessionStorage.getItem(STORAGE_KEYS.PLAYING) === 'true' && sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) !== 'true') {
        playMusicBoxChime();
      }
    });

    if (musicBtn) {
      musicBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMusic();
      });
    }

    // Auto-resume from previous sections if user enabled or if not explicitly paused
    const isUserExplicitlyPaused = sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) === 'true';

    if (!isUserExplicitlyPaused) {
      sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');

      const attemptAutoplay = () => {
        if (isAudioPlaying || sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) === 'true') return;

        const playPromise = musicAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              updatePlayerUI(true);
              console.log('[Music Player] Playing continuous music on Section 04.');
            })
            .catch((err) => {
              console.log('[Music Player] Autoplay held by browser, listening for gesture:', err.name);
              if (musicPlayer) musicPlayer.classList.add('is-ready-to-play');

              const onFirstInteraction = () => {
                if (sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) !== 'true') {
                  playMusic(true);
                }
                cleanupFirstGesture();
              };

              const cleanupFirstGesture = () => {
                window.removeEventListener('click', onFirstInteraction);
                window.removeEventListener('pointerdown', onFirstInteraction);
                window.removeEventListener('touchstart', onFirstInteraction);
                window.removeEventListener('keydown', onFirstInteraction);
              };

              window.addEventListener('click', onFirstInteraction, { once: true, passive: true });
              window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
              window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
              window.addEventListener('keydown', onFirstInteraction, { once: true, passive: true });
            });
        }
      };

      attemptAutoplay();
    } else {
      updatePlayerUI(false);
    }
  }

  /* --------------------------------------------------------------------------
     3. Golden Glowing Particles (Stage 3 & 4)
     -------------------------------------------------------------------------- */
  function spawnGoldenParticles() {
    if (!particlesContainer) return;

    if (particleInterval) clearInterval(particleInterval);

    particleInterval = setInterval(() => {
      const particle = document.createElement('div');
      particle.className = 'celebration-intro-particle';

      const size = Math.random() * 8 + 4; // 4px to 12px
      const left = Math.random() * 96 + 2; // 2% to 98%
      const top = Math.random() * 70 + 30; // 30% to 100%
      const duration = Math.random() * 2.5 + 2.5; // 2.5s to 5s

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${left}%`;
      particle.style.top = `${top}%`;
      particle.style.animationDuration = `${duration}s`;

      // Occasionally add a sparkle or star glyph
      if (Math.random() > 0.6) {
        particle.textContent = Math.random() > 0.5 ? '✨' : '✦';
        particle.style.background = 'none';
        particle.style.boxShadow = 'none';
        particle.style.color = '#ffd770';
        particle.style.fontSize = `${size + 4}px`;
        particle.style.lineHeight = '1';
      }

      particlesContainer.appendChild(particle);

      setTimeout(() => {
        if (particle && particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, duration * 1000);
    }, 180);
  }

  function stopGoldenParticles() {
    if (particleInterval) {
      clearInterval(particleInterval);
      particleInterval = null;
    }
  }

  /* --------------------------------------------------------------------------
     4. Interactive Sequence: Stages 1 -> 2 -> 3 -> 4 -> Cake Navigation
     -------------------------------------------------------------------------- */
  function switchStage(fromStage, toStage, callback) {
    if (fromStage) {
      fromStage.classList.remove('celebration-intro-stage-active');
    }

    setTimeout(() => {
      if (toStage) {
        toStage.classList.add('celebration-intro-stage-active');
      }
      if (callback) callback();
    }, 350);
  }

  function startCelebrationSequence() {
    console.log('[Celebration Intro] Sequence initiated: Stage 1 -> Stage 2');

    // STAGE 1 -> STAGE 2: "Close your eyes, Sathya..."
    switchStage(stage1, stage2, () => {
      
      // Hold Stage 2 for gentle emotional breathing room
      setTimeout(() => {
        console.log('[Celebration Intro] Stage 2 -> Stage 3: Make a wish');
        
        // STAGE 2 -> STAGE 3: "Take a deep breath... Make a beautiful wish. ✨"
        switchStage(stage2, stage3, () => {
          // Spawn magical glowing golden particles
          spawnGoldenParticles();

          // Hold Stage 3 for wish contemplation
          setTimeout(() => {
            console.log('[Celebration Intro] Stage 3 -> Stage 4: Surprise is waiting');

            // STAGE 3 -> STAGE 4: "Your birthday surprise is waiting..."
            switchStage(stage3, stage4, () => {
              
              // Expanding radiant golden light across the screen
              setTimeout(() => {
                if (glowOverlay) {
                  glowOverlay.classList.add('is-active');
                }
                if (cardElement) {
                  cardElement.classList.add('celebration-intro-is-exiting');
                }

                // Preserve audio playback state and navigate to Section 05: birthday cake.html
                setTimeout(() => {
                  if (musicAudio && !musicAudio.paused) {
                    sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
                    sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
                    sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
                  }
                  window.location.href = 'birthday%20cake.html';
                }, 1300);

              }, 1800);

            });

          }, 3400);

        });

      }, 3000);

    });
  }

  function initInteractions() {
    if (!startBtn) return;

    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startBtn.setAttribute('disabled', 'true');
      startBtn.style.pointerEvents = 'none';

      // Ensure music is enabled if user initiated
      if (!isAudioPlaying && sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) !== 'true') {
        playMusic(true);
      }

      startCelebrationSequence();
    });
  }

  /* --------------------------------------------------------------------------
     5. Lifecycle Initialization
     -------------------------------------------------------------------------- */
  function initialize() {
    initMusicPlayer();
    initInteractions();
    console.log('[Birthday Website] Section 04: Celebration Introduction initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Public API
  window.CelebrationMusicPlayer = {
    play: () => playMusic(true),
    pause: pauseMusic,
    toggle: toggleMusic,
    isPlaying: () => isAudioPlaying
  };

})();
