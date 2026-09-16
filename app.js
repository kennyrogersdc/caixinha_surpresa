/**
 * CAIXINHA SURPRESA - BARBOSA SUPERMERCADOS
 * Lógica da Gamificação Promocional Mobile
 */

(function () {
  'use strict';

  // --- Estado da Aplicação ---
  const state = {
    chances: 16,
    isPlaying: false,
    soundEnabled: true,
    lastResult: 'lose',
    audioCtx: null,
  };

  // --- Elementos DOM ---
  const chancesCountEl = document.getElementById('chancesCount');
  const remainingCountEls = document.querySelectorAll('.remaining-chances-count');
  const boxCards = document.querySelectorAll('.box-card');

  // Modais
  const modalSuspense = document.getElementById('modalSuspense');
  const suspenseProgressFill = document.getElementById('suspenseProgressFill');
  const suspenseTimerText = document.getElementById('suspenseTimerText');
  const modalResult = document.getElementById('modalResult');
  const resultWinState = document.getElementById('resultWinState');
  const resultLoseState = document.getElementById('resultLoseState');
  const resultModalCloseBtn = document.getElementById('resultModalCloseBtn');
  const btnPlayAgainWin = document.getElementById('btnPlayAgainWin');
  const btnPlayAgainLose = document.getElementById('btnPlayAgainLose');

  // Menu Lateral
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const menuCloseBtn = document.getElementById('menuCloseBtn');
  const sideMenuOverlay = document.getElementById('sideMenuOverlay');

  // Som
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOnIcon = soundToggleBtn.querySelector('.sound-on-icon');
  const soundOffIcon = soundToggleBtn.querySelector('.sound-off-icon');

  // Canvas de Confetes
  const confettiCanvas = document.getElementById('confettiCanvas');
  let confettiAnimId = null;

  // --- Inicialização do Web Audio API ---
  function getAudioContext() {
    if (!state.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        state.audioCtx = new AudioContextClass();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  // Efeitos Sonoros Sintetizados
  const soundEffects = {
    // Toque do card
    cardTap() {
      if (!state.soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },

    // Batidas de suspense durante a contagem de 3s
    suspenseTick(sec) {
      if (!state.soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = sec === 1 ? 660 : sec === 2 ? 550 : 440;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    },

    // Fanfarra de vitória
    winFanfare() {
      if (!state.soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [
        { f: 523.25, d: 0.15, t: 0.0 },  // C5
        { f: 659.25, d: 0.15, t: 0.12 }, // E5
        { f: 783.99, d: 0.18, t: 0.24 }, // G5
        { f: 1046.50, d: 0.45, t: 0.40 } // C6
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + n.t);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + n.t + n.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + n.t);
        osc.stop(ctx.currentTime + n.t + n.d);
      });
    },

    // Som de caixinha vazia
    loseSound() {
      if (!state.soundEnabled) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  };

  // --- Atualização do Contador de Chances ---
  function updateChancesDisplay() {
    chancesCountEl.textContent = state.chances;
    
    // Se acabou de zerar as chances, o botão de jogar novamente já indica que reiniciará com 16
    const nextChances = state.chances === 0 ? 16 : state.chances;
    remainingCountEls.forEach(el => {
      el.textContent = nextChances;
    });

    // Efeito de pulso animado no contador
    chancesCountEl.classList.remove('pop-anim');
    void chancesCountEl.offsetWidth; // trigger reflow
    chancesCountEl.classList.add('pop-anim');
  }

  // --- Sistema de Confetes Comemorativos ---
  function launchConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    const width = confettiCanvas.width = confettiCanvas.offsetWidth;
    const height = confettiCanvas.height = confettiCanvas.offsetHeight;

    const colors = ['#fdf000', '#ed1c24', '#ffffff', '#279dff', '#ff9800', '#4caf50'];
    const particles = [];
    const count = 80;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: height / 2 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
    }

    let startTime = performance.now();

    function renderConfetti(currentTime) {
      const elapsed = (currentTime - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;

        if (elapsed > 1.8) {
          p.opacity -= 0.025;
        }

        if (p.opacity > 0 && p.y < height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        confettiAnimId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }

    confettiAnimId = requestAnimationFrame(renderConfetti);
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    if (confettiCanvas) {
      const ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Determinar Resultado (Premiado ou Vazio) ---
  function determineResult() {
    // Sorteio dinâmico e emocionante com alta taxa de premiação
    const isWin = state.lastResult !== 'win' ? (Math.random() < 0.6) : (Math.random() < 0.4);
    state.lastResult = isWin ? 'win' : 'lose';
    return isWin;
  }

  // --- Fluxo de Seleção de Caixinha ---
  function handleBoxSelection(boxCard) {
    if (state.isPlaying) return;

    // Reset automático se as chances estiverem zeradas
    if (state.chances <= 0) {
      state.chances = 16;
      updateChancesDisplay();
    }

    state.isPlaying = true;
    soundEffects.cardTap();

    // Decrementa a chance atual
    state.chances--;
    updateChancesDisplay();

    // 1. Abrir Modal de Suspense (Cor de fundo #279dff)
    openSuspenseModal();
  }

  // --- Modal 1: Suspense (After Delay de 3 segundos) ---
  function openSuspenseModal() {
    modalSuspense.classList.add('active');
    modalSuspense.setAttribute('aria-hidden', 'false');

    // Reset da barra de progresso
    suspenseProgressFill.style.transition = 'none';
    suspenseProgressFill.style.width = '0%';
    void suspenseProgressFill.offsetWidth; // reflow

    suspenseProgressFill.style.transition = 'width 3000ms linear';
    suspenseProgressFill.style.width = '100%';

    let secondsLeft = 3;
    suspenseTimerText.textContent = `Revelando em ${secondsLeft}s...`;
    soundEffects.suspenseTick(secondsLeft);

    const countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        suspenseTimerText.textContent = `Revelando em ${secondsLeft}s...`;
        soundEffects.suspenseTick(secondsLeft);
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // After delay de exatamente 3 segundos (3000ms)
    setTimeout(() => {
      clearInterval(countdownInterval);
      transitionToResultModal();
    }, 3000);
  }

  // --- Transição para Modal 2: Resultado ---
  function transitionToResultModal() {
    // Fecha o modal de suspense
    modalSuspense.classList.remove('active');
    modalSuspense.setAttribute('aria-hidden', 'true');

    // Decide se ganhou ou não
    const hasWon = determineResult();

    if (hasWon) {
      resultWinState.classList.remove('hidden');
      resultLoseState.classList.add('hidden');
      soundEffects.winFanfare();
      launchConfetti();
    } else {
      resultLoseState.classList.remove('hidden');
      resultWinState.classList.add('hidden');
      soundEffects.loseSound();
      stopConfetti();
    }

    // Abre Modal de Resultado
    modalResult.classList.add('active');
    modalResult.setAttribute('aria-hidden', 'false');

    state.isPlaying = false;
  }

  // --- Fechar Modal de Resultado / Jogar Novamente ---
  function closeResultModal() {
    modalResult.classList.remove('active');
    modalResult.setAttribute('aria-hidden', 'true');
    stopConfetti();

    // Após jogar as 16 chances (chances chega a 0), reseta automaticamente para 16
    if (state.chances <= 0) {
      state.chances = 16;
      updateChancesDisplay();
    }
  }

  // --- Event Listeners dos Cards de Caixinha ---
  boxCards.forEach(card => {
    card.addEventListener('click', () => {
      handleBoxSelection(card);
    });
  });

  // Botões de Jogar Novamente
  btnPlayAgainWin.addEventListener('click', closeResultModal);
  btnPlayAgainLose.addEventListener('click', closeResultModal);
  resultModalCloseBtn.addEventListener('click', closeResultModal);

  // Fecha modal se clicar no fundo do overlay
  modalResult.addEventListener('click', (e) => {
    if (e.target === modalResult) {
      closeResultModal();
    }
  });

  // --- Menu Lateral ---
  menuToggleBtn.addEventListener('click', () => {
    sideMenuOverlay.classList.add('open');
  });

  menuCloseBtn.addEventListener('click', () => {
    sideMenuOverlay.classList.remove('open');
  });

  sideMenuOverlay.addEventListener('click', (e) => {
    if (e.target === sideMenuOverlay) {
      sideMenuOverlay.classList.remove('open');
    }
  });

  // --- Alternador de Som ---
  soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      getAudioContext();
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
    }
  });

  // Inicialização
  updateChancesDisplay();

})();
