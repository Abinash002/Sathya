/**
 * ==========================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 03: BIRTHDAY GREETING & MUSIC PLAYER
 * Reusable Background Music Player & Section 03 Functionality
 * Class Prefix: birthday-greeting-
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

  const DEFAULT_AUDIO_PATH = 'assets/music/birthday-song.mp3';

  // DOM Elements
  const musicPlayer = document.getElementById('birthday-greeting-music-player');
  const musicBtn = document.getElementById('birthday-greeting-music-btn');
  const musicAudio = document.getElementById('birthday-greeting-audio');
  const continueBtn = document.getElementById('birthday-greeting-continue-btn');
  const greetingCard = document.getElementById('birthday-greeting-card');
  const toastElement = document.getElementById('birthday-greeting-toast');

  let isAudioPlaying = false;
  let webAudioFallbackActive = false;
  let webAudioCtx = null;
  let webAudioTimer = null;

  /* --------------------------------------------------------------------------
     1. Web Audio API Graceful Fallback (Gentle Music Box Birthday Chime)
     Used if the local MP3 is missing, corrupt, or blocked by browser
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

        // Music box / Kalimba harmonic tone (Sine + subtle bell overtone)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(current.f, webAudioCtx.currentTime);

        // Gentle pluck envelope
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
      console.warn('[Music Player] Web Audio fallback encountered an issue:', err);
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

  /**
   * Toggles music playback (click to stop, click to start)
   */
  function toggleMusic() {
    if (isAudioPlaying) {
      pauseMusic();
    } else {
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
      playMusic(true);
    }
  }

  /**
   * Plays music, updating sessionStorage and UI
   */
  function playMusic(userInitiated = false) {
    if (userInitiated) {
      sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
    }

    if (!musicAudio) {
      // If no audio element, use Web Audio fallback directly
      updatePlayerUI(true);
      sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
      playMusicBoxChime();
      return;
    }

    // Try HTML Audio element first
    const playPromise = musicAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          updatePlayerUI(true);
          sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
          sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
          console.log('[Music Player] Playing audio.');
        })
        .catch((err) => {
          console.warn('[Music Player] Audio play prevented by browser or missing file:', err.name);
          // If user clicked or enabled, fall back gracefully to Web Audio chime
          if (userInitiated || sessionStorage.getItem(STORAGE_KEYS.USER_ENABLED) === 'true') {
            updatePlayerUI(true);
            sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
            sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'false');
            playMusicBoxChime();
          } else {
            // Otherwise show ready to play state
            if (musicPlayer) musicPlayer.classList.add('is-ready-to-play');
          }
        });
    }
  }

  /**
   * Pauses music (stops), updating sessionStorage and UI
   */
  function pauseMusic() {
    if (musicAudio) {
      musicAudio.pause();
    }
    stopMusicBoxChime();
    updatePlayerUI(false);
    sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'false');
    sessionStorage.setItem(STORAGE_KEYS.USER_PAUSED, 'true');
    console.log('[Music Player] Music stopped by user.');
  }

  /**
   * Initializes persistent audio state on page load and handles automatic playback
   */
  function initMusicPlayer() {
    if (!musicAudio) return;

    // Restore saved playback position
    const savedTime = sessionStorage.getItem(STORAGE_KEYS.TIME);
    if (savedTime && !isNaN(parseFloat(savedTime))) {
      musicAudio.currentTime = parseFloat(savedTime);
    }

    // Save playback position periodically
    musicAudio.addEventListener('timeupdate', () => {
      if (!musicAudio.paused) {
        sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      }
    });

    // Loop continuously
    musicAudio.loop = true;

    // Handle missing or broken audio file gracefully
    musicAudio.addEventListener('error', () => {
      console.warn('[Music Player] Audio source failed or missing. Graceful Web Audio music-box chime active.');
      if (sessionStorage.getItem(STORAGE_KEYS.PLAYING) === 'true' && sessionStorage.getItem(STORAGE_KEYS.USER_PAUSED) !== 'true') {
        playMusicBoxChime();
      }
    });

    // Button click listener (click to stop, click again to start)
    if (musicBtn) {
      musicBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMusic();
      });
    }

    // AUTOMATIC PLAYBACK ON ENTERING THE PAGE:
    // If not explicitly paused by the user, immediately start playback!
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
              console.log('[Music Player] Autoplay started automatically on page enter.');
            })
            .catch((err) => {
              console.log('[Music Player] Autoplay held by browser policy. Will start on first user interaction anywhere:', err.name);
              if (musicPlayer) musicPlayer.classList.add('is-ready-to-play');

              // Start playing on the very first tap/click/touch anywhere on the page
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

      // Execute autoplay attempt
      attemptAutoplay();
    } else {
      updatePlayerUI(false);
    }
  }

  /* --------------------------------------------------------------------------
     3. Continue Button Interaction (Navigates to Section 04: Celebration Intro)
     -------------------------------------------------------------------------- */
  function initContinueButton() {
    if (!continueBtn) return;

    continueBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // Preserve music playing state and position
      if (musicAudio && !musicAudio.paused) {
        sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
        sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
        sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
      }

      // Smooth visual exit animation on card
      if (greetingCard) {
        greetingCard.classList.add('birthday-greeting-is-exiting');
      }

      // Navigate to Section 04: celebration intro.html
      setTimeout(() => {
        window.location.href = 'celebration%20intro.html';
      }, 700);

      console.log('[Birthday Greeting] Navigating to Section 04 (celebration intro.html).');
    });
  }

  /* --------------------------------------------------------------------------
     4. Lifecycle Initialization
     -------------------------------------------------------------------------- */
  function initialize() {
    initMusicPlayer();
    initContinueButton();
    console.log('[Birthday Website] Section 03: Birthday Greeting & Music Player initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Public Component API
  window.BirthdayMusicPlayer = {
    play: () => playMusic(true),
    pause: pauseMusic,
    toggle: toggleMusic,
    isPlaying: () => isAudioPlaying,
    getTime: () => (musicAudio ? musicAudio.currentTime : 0)
  };

})();
