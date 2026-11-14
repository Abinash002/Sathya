/**
 * ==========================================================================
 * SATHYA'S BIRTHDAY WEBSITE — SECTION 05: INTERACTIVE BIRTHDAY CAKE
 * Candle Blowing (Mic & Tap), Cake Slicing, Confetti & Reusable Music Player
 * Class Prefix: birthday-cake-
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

  // DOM Elements - Stages
  const stageCandles = document.getElementById('birthday-cake-stage-candles');
  const stageCut = document.getElementById('birthday-cake-stage-cut');
  const stageSlice = document.getElementById('birthday-cake-stage-slice');
  const cardElement = document.getElementById('birthday-cake-card');

  // DOM Elements - Stage 1 & 2 (Candles)
  const candleElements = [
    document.getElementById('candle-1'),
    document.getElementById('candle-2'),
    document.getElementById('candle-3'),
    document.getElementById('candle-4'),
    document.getElementById('candle-5')
  ];
  const ambientGlow = document.getElementById('birthday-cake-ambient-glow');
  const micBtn = document.getElementById('birthday-cake-mic-btn');
  const tapBlowBtn = document.getElementById('birthday-cake-tap-btn');
  const feedbackBanner = document.getElementById('birthday-cake-feedback');
  const successCard = document.getElementById('birthday-cake-success');
  const continueToCutBtn = document.getElementById('birthday-cake-continue-to-cut-btn');

  // DOM Elements - Stage 3 (Cut)
  const cutArea = document.getElementById('birthday-cake-cut-area');
  const cutComposition = document.getElementById('birthday-cake-cut-comp');
  const cutActionBtn = document.getElementById('birthday-cake-cut-action-btn');
  const cutSuccessCard = document.getElementById('birthday-cake-cut-success');
  const viewSliceBtn = document.getElementById('birthday-cake-view-slice-btn');
  const knifeIcon = document.getElementById('birthday-cake-knife-icon');
  const cutGuide = document.getElementById('birthday-cake-cut-guide');
  const cutPath = document.getElementById('birthday-cake-cut-path');
  const knifeWrap = document.getElementById('birthday-cake-knife-wrap');
  const cutHint = document.getElementById('birthday-cake-cut-hint');
  const sparkleTrail = document.getElementById('birthday-cake-sparkle-trail');

  // DOM Elements - Stage 4 (Slice)
  const finalContinueBtn = document.getElementById('birthday-cake-final-continue-btn');

  // DOM Elements - Music Player
  const musicPlayer = document.getElementById('birthday-cake-music-player');
  const musicBtn = document.getElementById('birthday-cake-music-btn');
  const musicAudio = document.getElementById('birthday-cake-audio');

  // Audio & Mic State
  let isAudioPlaying = false;
  let webAudioFallbackActive = false;
  let webAudioCtx = null;
  let webAudioTimer = null;
  let micStream = null;
  let micAudioCtx = null;
  let micAnalyser = null;
  let micAnimId = null;
  let isListeningMic = false;

  // Cake State
  let extinguishedCount = 0;
  let allCandlesBlown = false;
  let isCakeCut = false;
  let isTransitioningToCut = false;
  let isTransitioningToSlice = false;

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
  }

  function initMusicPlayer() {
    if (!musicAudio) return;

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
      console.warn('[Music Player] Audio source failed. Falling back to Web Audio chime.');
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
              console.log('[Music Player] Continuous playback active on Section 05.');
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
     3. Confetti Particle System (Canvas)
     -------------------------------------------------------------------------- */
  const canvas = document.getElementById('birthday-cake-confetti-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let confettiAnimId = null;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfettiBurst(count = 70) {
    if (!canvas || !ctx) return;

    const colors = ['#ff4760', '#ffd770', '#ff8da1', '#f39c12', '#2ecc71', '#fbf5e7'];
    const originX = canvas.width / 2;
    const originY = canvas.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle'
      });
    }

    if (!confettiAnimId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.009;

      if (p.opacity <= 0 || p.y > canvas.height + 20) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* --------------------------------------------------------------------------
     4. STAGE 1 & 2: Candle Blowing Logic (Tap & Web Audio Mic)
     -------------------------------------------------------------------------- */
  function extinguishCandle(candleEl) {
    if (!candleEl || candleEl.classList.contains('is-extinguished')) return;

    candleEl.classList.add('is-extinguished');
    candleEl.setAttribute('aria-label', `${candleEl.id}: Extinguished`);
    extinguishedCount++;

    // Dim the ambient glow as candles go out
    if (extinguishedCount >= 3 && ambientGlow) {
      ambientGlow.style.opacity = '0.35';
    }
    if (extinguishedCount >= 5 && ambientGlow) {
      ambientGlow.classList.add('is-dimmed');
    }

    // Check if all 5 candles are extinguished
    if (extinguishedCount >= 5 && !allCandlesBlown) {
      allCandlesBlown = true;
      onAllCandlesExtinguished();
    }
  }

  function blowAllCandlesStaggered() {
    let delay = 0;
    candleElements.forEach((candle) => {
      if (!candle.classList.contains('is-extinguished')) {
        setTimeout(() => {
          extinguishCandle(candle);
        }, delay);
        delay += 160;
      }
    });
  }

  function onAllCandlesExtinguished() {
    if (isTransitioningToCut) return;
    isTransitioningToCut = true;

    console.log('[Birthday Cake] All 5 candles extinguished! Wish made.');

    // Stop mic if running
    stopMicListening();

    // Trigger celebration
    triggerConfettiBurst(85);

    // Update UI elements
    if (feedbackBanner) {
      feedbackBanner.style.opacity = '0';
    }
    if (micBtn) {
      micBtn.style.display = 'none';
    }
    if (tapBlowBtn) {
      tapBlowBtn.style.display = 'none';
    }

    // Reveal "Wish made! ✨" celebration card
    setTimeout(() => {
      if (successCard) {
        successCard.classList.add('is-visible');
      }
    }, 400);

    // Automatically transition to Stage 3 (Cake Cutting) after 1.8-second celebration
    setTimeout(() => {
      transitionStage(stageCandles, stageCut, () => {
        initSwipeCutting();
      });
    }, 1800);
  }

  /* Web Audio API Microphone Detection */
  async function startMicListening() {
    if (isListeningMic) {
      stopMicListening();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext unsupported');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia unsupported');
      }

      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micAudioCtx = new AudioCtx();
      const source = micAudioCtx.createMediaStreamSource(micStream);
      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.2;
      source.connect(micAnalyser);

      isListeningMic = true;
      if (micBtn) {
        micBtn.classList.add('is-listening');
        micBtn.querySelector('.birthday-cake-btn-text').textContent = 'BLOW NOW! 💨';
      }
      if (feedbackBanner) {
        feedbackBanner.textContent = 'Listening... Blow gently into your mic! 🌬️';
      }

      let blowingFrames = 0;
      const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

      function detectBlow() {
        if (!isListeningMic || !micAnalyser) return;

        micAnalyser.getByteFrequencyData(dataArray);

        // Low-to-mid frequency turbulence (characteristic of blowing sound)
        let sumLow = 0;
        let countLow = 25;
        for (let i = 2; i < countLow; i++) {
          sumLow += dataArray[i];
        }
        const avgVolume = sumLow / countLow;

        // Sustained volume threshold
        if (avgVolume > 62) {
          blowingFrames++;
          if (blowingFrames > 6) { // ~120-150ms of sustained blowing
            console.log('[Birthday Cake] Microphone blowing sound detected!');
            blowAllCandlesStaggered();
            return;
          }
        } else {
          blowingFrames = Math.max(0, blowingFrames - 1);
        }

        micAnimId = requestAnimationFrame(detectBlow);
      }

      detectBlow();
    } catch (err) {
      console.warn('[Birthday Cake] Microphone access not granted or unavailable:', err);
      if (feedbackBanner) {
        feedbackBanner.textContent = 'Microphone unavailable — tap candles or button to blow! 🤍';
      }
      if (micBtn) {
        micBtn.style.opacity = '0.5';
        micBtn.setAttribute('disabled', 'true');
        micBtn.querySelector('.birthday-cake-btn-text').textContent = 'MIC UNAVAILABLE';
      }
    }
  }

  function stopMicListening() {
    isListeningMic = false;
    if (micAnimId) {
      cancelAnimationFrame(micAnimId);
      micAnimId = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (micAudioCtx && micAudioCtx.state !== 'closed') {
      micAudioCtx.close();
      micAudioCtx = null;
    }
    if (micBtn) {
      micBtn.classList.remove('is-listening');
      micBtn.querySelector('.birthday-cake-btn-text').textContent = 'BLOW VIA MIC';
    }
  }

  /* --------------------------------------------------------------------------
     5. STAGE 3: Cake Cutting Interaction (Curved S-Path Swipe & Realistic Knife)
     -------------------------------------------------------------------------- */
  let cutSwipeInitialized = false;

  function getCurveProgressPoint(t) {
    if (!cutPath) {
      // Math fallback bezier: P0(150, 32), P1(215, 95), P2(85, 180), P3(150, 258)
      const u = 1 - t;
      const x = u*u*u * 150 + 3*u*u*t * 215 + 3*u*t*t * 85 + t*t*t * 150;
      const y = u*u*u * 32 + 3*u*u*t * 95 + 3*u*t*t * 180 + t*t*t * 258;
      return { x, y, angle: 90 };
    }

    try {
      const totalLen = cutPath.getTotalLength();
      const clampedT = Math.max(0, Math.min(1, t));
      const curLen = clampedT * totalLen;
      const pt = cutPath.getPointAtLength(curLen);

      // Tangent angle calculation
      const s1 = Math.max(0, curLen - 2.5);
      const s2 = Math.min(totalLen, curLen + 2.5);
      const p1 = cutPath.getPointAtLength(s1);
      const p2 = cutPath.getPointAtLength(s2);
      const tangentRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const tangentDeg = tangentRad * (180 / Math.PI);

      return { x: pt.x, y: pt.y, angle: tangentDeg };
    } catch (e) {
      return { x: 150, y: 32 + t * 226, angle: 90 };
    }
  }

  function spawnCutSparkle(leftPct, topPct) {
    if (!cutArea) return;
    const targetContainer = sparkleTrail || cutArea;

    const sparkle = document.createElement('span');
    const symbols = ['✨', '✦', '⋆', '🍰', '🌸'];
    sparkle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    sparkle.style.position = 'absolute';
    sparkle.style.left = `${leftPct}%`;
    sparkle.style.top = `${topPct}%`;
    sparkle.style.fontSize = `${0.75 + Math.random() * 0.55}rem`;
    sparkle.style.color = Math.random() > 0.4 ? '#ffd770' : '#ffccd5';
    sparkle.style.pointerEvents = 'none';
    sparkle.style.zIndex = '25';
    sparkle.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    sparkle.style.opacity = '1';
    sparkle.style.transform = 'translate(-50%, -50%) scale(0.6)';

    targetContainer.appendChild(sparkle);

    requestAnimationFrame(() => {
      const jitterX = (Math.random() - 0.5) * 36;
      const jitterY = (Math.random() - 0.5) * 30 - 15;
      sparkle.style.opacity = '0';
      sparkle.style.transform = `translate(calc(-50% + ${jitterX}px), calc(-50% + ${jitterY}px)) scale(1.2) rotate(${(Math.random() - 0.5) * 60}deg)`;
    });

    setTimeout(() => {
      if (sparkle.parentNode) {
        sparkle.parentNode.removeChild(sparkle);
      }
    }, 550);
  }

  function positionKnifeAtProgress(t, isCutting = false) {
    if (!knifeWrap) return;

    const ptInfo = getCurveProgressPoint(t);
    const leftPct = (ptInfo.x / 300) * 100;
    const topPct = (ptInfo.y / 300) * 100;

    // Natural diagonal angle (-32deg base) influenced by curve tangent + subtle cutting rock
    const tangentDelta = (ptInfo.angle - 90) * 0.45;
    const rock = isCutting ? Math.sin(t * 26) * 5.5 : 0;
    const finalRot = -32 + tangentDelta + rock;

    knifeWrap.style.left = `${leftPct.toFixed(2)}%`;
    knifeWrap.style.top = `${topPct.toFixed(2)}%`;
    knifeWrap.style.transform = `translate(-82%, -50%) rotate(${finalRot.toFixed(1)}deg)`;

    // Backward compatibility for legacy knifeIcon
    if (knifeIcon) {
      knifeIcon.style.transform = `translate(${((ptInfo.x - 150) * 0.35).toFixed(1)}px, ${((ptInfo.y - 32) * 0.35).toFixed(1)}px) rotate(-25deg)`;
    }
  }

  function animateKnifeAlongCurve(durationMs = 650, onComplete) {
    if (!knifeWrap) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    knifeWrap.classList.add('is-cutting');
    const startTime = performance.now();
    let lastSparkleTime = 0;

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);

      // Smooth cutting curve progression
      positionKnifeAtProgress(t, true);

      if (now - lastSparkleTime > 75) {
        lastSparkleTime = now;
        const pt = getCurveProgressPoint(t);
        spawnCutSparkle((pt.x / 300) * 100, (pt.y / 300) * 100);
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }

    requestAnimationFrame(step);
  }

  function executeCakeCut() {
    if (isCakeCut || isTransitioningToSlice) return;
    isCakeCut = true;
    isTransitioningToSlice = true;

    console.log('[Birthday Cake] Cake cut executed! Slicing and automatically transitioning to slice screen.');

    // Visual knife slice animation and wedge slide forward
    if (cutComposition) {
      cutComposition.classList.add('is-cut');
    }
    if (cutArea) {
      cutArea.classList.add('is-cut');
    }
    if (cutGuide) {
      cutGuide.style.opacity = '0';
    }

    // Confetti and sparkle celebration
    triggerConfettiBurst(65);

    // Hide cut button and reveal celebration badge
    if (cutActionBtn) {
      cutActionBtn.style.display = 'none';
    }
    setTimeout(() => {
      if (cutSuccessCard) {
        cutSuccessCard.classList.add('is-visible');
      }
    }, 400);

    // Automatically transition to Stage 4 (Dedicated Slice Screen) after 1.8 seconds!
    setTimeout(() => {
      transitionStage(stageCut, stageSlice, () => {
        triggerConfettiBurst(60);

        // Automatic Timed Navigation to Three Little Letters (birthday letter.html) after ~3.5 seconds
        setTimeout(() => {
          navigateToLetters();
        }, 3500);
      });
    }, 1800);
  }

  function initSwipeCutting() {
    if (!cutArea || cutSwipeInitialized) return;
    cutSwipeInitialized = true;

    // Reset knife to top of S-curve initially
    positionKnifeAtProgress(0, false);

    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    let currentProgress = 0;
    let lastSparkleT = 0;

    // Pointer events (handles both mouse drag and touch swipe seamlessly)
    cutArea.addEventListener('pointerdown', (e) => {
      if (isCakeCut) return;
      isSwiping = true;
      startX = e.clientX;
      startY = e.clientY;
      currentProgress = 0;
      lastSparkleT = 0;

      if (knifeWrap) {
        knifeWrap.classList.add('is-cutting');
        knifeWrap.style.transition = 'none';
      }
      if (cutHint) {
        cutHint.style.opacity = '0.35';
      }

      try {
        cutArea.setPointerCapture(e.pointerId);
      } catch (err) {
        // Fallback for browsers not supporting pointer capture
      }
    });

    cutArea.addEventListener('pointermove', (e) => {
      if (!isSwiping || isCakeCut) return;

      const dy = e.clientY - startY;
      const rect = cutArea.getBoundingClientRect();
      const travelDist = Math.max(90, rect.height * 0.65);
      const rawProgress = dy / travelDist;
      currentProgress = Math.max(0, Math.min(1, rawProgress));

      // Move knife along curved S-path with realistic cutting rocking
      positionKnifeAtProgress(currentProgress, true);

      // Emit trail sparkle on progress
      if (Math.abs(currentProgress - lastSparkleT) >= 0.08) {
        lastSparkleT = currentProgress;
        const pt = getCurveProgressPoint(currentProgress);
        spawnCutSparkle((pt.x / 300) * 100, (pt.y / 300) * 100);
      }

      // Completion threshold: user swiped >= 80% or >= 65% with significant displacement
      if (currentProgress >= 0.82 || (currentProgress >= 0.65 && dy >= 65)) {
        isSwiping = false;
        animateKnifeAlongCurve(160, () => {
          executeCakeCut();
        });
      }
    });

    const endSwipe = () => {
      if (!isSwiping || isCakeCut) return;
      isSwiping = false;

      // If user swiped more than half way, finish the slice smoothly!
      if (currentProgress >= 0.45) {
        animateKnifeAlongCurve(220, () => {
          executeCakeCut();
        });
      } else {
        // Reset knife gently back to starting position
        if (knifeWrap) {
          knifeWrap.classList.remove('is-cutting');
          knifeWrap.style.transition = 'left 0.35s ease, top 0.35s ease, transform 0.35s ease';
          positionKnifeAtProgress(0, false);
          setTimeout(() => {
            if (knifeWrap && !isCakeCut) {
              knifeWrap.style.transition = '';
            }
          }, 360);
        }
        if (cutHint) {
          cutHint.style.opacity = '1';
        }
      }
    };

    cutArea.addEventListener('pointerup', endSwipe);
    cutArea.addEventListener('pointercancel', endSwipe);
  }

  /* --------------------------------------------------------------------------
     6. Stage Transitions (Candles -> Cut -> Slice -> Three Little Letters Navigation)
     -------------------------------------------------------------------------- */
  let hasNavigatedToLetters = false;

  function navigateToLetters() {
    if (hasNavigatedToLetters) return;
    hasNavigatedToLetters = true;

    console.log('[Birthday Cake] Automatically navigating to Three Little Letters: birthday letter.html');

    // Preserve music playback state & position in sessionStorage
    if (musicAudio && !musicAudio.paused) {
      sessionStorage.setItem(STORAGE_KEYS.TIME, String(musicAudio.currentTime));
      sessionStorage.setItem(STORAGE_KEYS.PLAYING, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_ENABLED, 'true');
    }

    // Fade out card smoothly
    if (cardElement) {
      cardElement.classList.add('birthday-cake-is-exiting');
    }

    // Navigate directly to Three Little Letters: birthday letter.html after smooth fade
    setTimeout(() => {
      window.location.href = 'birthday%20letter.html';
    }, 750);
  }

  // Alias for backward compatibility
  const navigateToMemories = navigateToLetters;

  function transitionStage(fromEl, toEl, onComplete) {
    if (fromEl) {
      fromEl.classList.remove('birthday-cake-stage-active');
      fromEl.setAttribute('aria-hidden', 'true');
    }

    setTimeout(() => {
      if (toEl) {
        toEl.classList.add('birthday-cake-stage-active');
        toEl.setAttribute('aria-hidden', 'false');
      }
      if (onComplete) onComplete();
    }, 380);
  }

  function initInteractions() {
    // 1. Individual Candle Tap Listeners
    candleElements.forEach((candle) => {
      if (!candle) return;

      const handleCandleTap = (e) => {
        e.preventDefault();
        extinguishCandle(candle);
      };

      candle.addEventListener('click', handleCandleTap);
      candle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCandleTap(e);
        }
      });
    });

    // 2. Tap to Blow Button (extinguishes all remaining)
    if (tapBlowBtn) {
      tapBlowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        blowAllCandlesStaggered();
      });
    }

    // 3. Mic Blow Button
    if (micBtn) {
      micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startMicListening();
      });
    }

    // 4. Continue to Cut Stage Button
    if (continueToCutBtn) {
      continueToCutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        transitionStage(stageCandles, stageCut, () => {
          initSwipeCutting();
        });
      });
    }

    // 5. Cut Action Button Fallback (Plays realistic curved slice before executing cut)
    if (cutActionBtn) {
      cutActionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isCakeCut) return;
        cutActionBtn.disabled = true;
        if (cutHint) cutHint.style.opacity = '0.35';
        animateKnifeAlongCurve(620, () => {
          executeCakeCut();
        });
      });
    }

    // 6. View Slice Stage Button Fallback
    if (viewSliceBtn) {
      viewSliceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        transitionStage(stageCut, stageSlice, () => {
          triggerConfettiBurst(55);
          setTimeout(() => {
            navigateToMemories();
          }, 3500);
        });
      });
    }

    // 7. Final Continue Button Fallback (if present in DOM)
    if (finalContinueBtn) {
      finalContinueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToMemories();
      });
    }
  }

  /* --------------------------------------------------------------------------
     7. Lifecycle Initialization
     -------------------------------------------------------------------------- */
  function initialize() {
    initMusicPlayer();
    initInteractions();
    console.log('[Birthday Website] Section 05: Interactive Birthday Cake initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Public Component API
  window.BirthdayCakeSection = {
    extinguishAll: blowAllCandlesStaggered,
    cutCake: executeCakeCut,
    navigateToMemories: navigateToMemories,
    isAllBlown: () => allCandlesBlown,
    isCut: () => isCakeCut
  };

})();

