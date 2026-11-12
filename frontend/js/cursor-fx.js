// ===== เอฟเฟกต์เมาส์: ลากแล้วมีประกายตาม, คลิกแล้วมีวงแสงกระเพื่อม + ประกายแตก =====
// รูปทรงและสีเปลี่ยนตามธีม (ดู PARTICLE_STYLES)
// canvas กดทะลุได้ และหยุดวาดเองเมื่อไม่มีประกายเหลือ (ไม่กินเครื่องตอนเมาส์นิ่ง)
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canFollowMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches; // มือถือไม่มีหาง มีแค่ตอนแตะ

  // แต่ละธีม: สีที่สุ่มใช้ และรูปทรง
  const PARTICLE_STYLES = {
    light: { colors: ['#A0EC29', '#2E6B1C', '#5E9F26'], shape: 'spark' },
    dark: { colors: ['#A0EC29', '#DDF2B5', '#FFFFFF'], shape: 'spark' },
    halloween: { colors: ['#FF7A1A', '#FFB066', '#B15CFF'], shape: 'ember' },
    valentine: { colors: ['#FF5C8A', '#FF8FAB', '#C2185B'], shape: 'heart' },
    christmas: { colors: ['#FFFFFF', '#F2C14E', '#E5383B'], shape: 'snow' },
    neon: { colors: ['#C77DFF', '#7DF9FF', '#FFFFFF'], shape: 'spark' },
    blade: { colors: ['#39E07A', '#B15CFF', '#D6FFE6'], shape: 'ember' },
    cyber: { colors: ['#36C8FF', '#B8F2FF', '#FF4D6D'], shape: 'spark' },
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let ripples = [];
  let running = false;
  let lastSpawn = 0;

  function currentStyle() {
    const theme = document.documentElement.getAttribute('data-theme');
    return PARTICLE_STYLES[theme] || PARTICLE_STYLES.light;
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function addParticle(x, y, burst) {
    const style = currentStyle();
    const angle = Math.random() * Math.PI * 2;
    const force = burst ? 2 + Math.random() * 4 : Math.random() * 0.8;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force - (burst ? 1 : 0.3),
      size: burst ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      life: 1,
      decay: burst ? 0.018 + Math.random() * 0.012 : 0.03 + Math.random() * 0.02,
      spin: Math.random() * Math.PI,
      color: style.colors[Math.floor(Math.random() * style.colors.length)],
      shape: style.shape,
    });
  }

  // ---------- รูปทรงประกาย ----------
  function drawSpark(p) {
    // ดาว 4 แฉก
    const s = p.size * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
  }

  function drawHeart(p) {
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.7);
    ctx.bezierCurveTo(-s * 1.8, -s * 0.5, -s * 0.7, -s * 1.7, 0, -s * 0.7);
    ctx.bezierCurveTo(s * 0.7, -s * 1.7, s * 1.8, -s * 0.5, 0, s * 0.7);
    ctx.fill();
  }

  function drawSnow(p) {
    const s = p.size * 1.3;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = p.color;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
    }
  }

  function drawEmber(p) {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  const DRAW = { spark: drawSpark, heart: drawHeart, snow: drawSnow, ember: drawEmber };

  // ---------- วนวาด (เฉพาะตอนมีประกาย) ----------
  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ripples = ripples.filter((r) => r.life > 0);
    ripples.forEach((r) => {
      r.radius += 3.2;
      r.life -= 0.035;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * r.life + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.shape === 'ember' ? -0.03 : 0.05; // ไฟลอยขึ้น อย่างอื่นค่อย ๆ ตก
      p.vx *= 0.97;
      p.spin += 0.08;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.scale(0.4 + p.life * 0.6, 0.4 + p.life * 0.6);
      DRAW[p.shape](p);
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    if (particles.length > 0 || ripples.length > 0) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function start() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  // ---------- ฟังเมาส์ ----------
  if (canFollowMouse) {
    window.addEventListener('pointermove', (event) => {
      const now = performance.now();
      if (now - lastSpawn < 16 || particles.length > 160) return; // ไม่เกิน ~60 ครั้งต่อวินาที
      lastSpawn = now;
      addParticle(event.clientX, event.clientY, false);
      start();
    });
  }

  window.addEventListener('pointerdown', (event) => {
    const style = currentStyle();
    ripples.push({ x: event.clientX, y: event.clientY, radius: 4, life: 1, color: style.colors[0] });
    for (let i = 0; i < 16; i++) addParticle(event.clientX, event.clientY, true);
    start();
  });

  window.addEventListener('resize', resize);
  resize();
  document.body.appendChild(canvas);
})();
