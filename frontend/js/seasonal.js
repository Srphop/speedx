// ===== เอฟเฟกต์ธีมเทศกาล: วิ่งตลอดเวลาบน <canvas> ที่ลอยอยู่เหนือหน้าเว็บ =====
//   คริสต์มาส  → หิมะตก
//   วาเลนไทน์  → หัวใจลอยขึ้น
//   ฮาโลวีน    → ค้างคาวบิน + ประกายไฟลอยขึ้น
//   นีออนม่วง  → ริบบิ้นพลังงาน + ประกาย + สายฟ้าแลบ
//   ดาบมรกต    → ไฟเขียวลอย + หมอกม่วง + รอยฟันดาบ
//   ไซเบอร์    → สายข้อมูลตก + หกเหลี่ยมลอย + เส้นสแกน
// canvas กดทะลุได้ (pointer-events: none) เลยไม่บังปุ่ม
// คนที่ตั้งเครื่องให้ลดการเคลื่อนไหว จะไม่มีเอฟเฟกต์

let seasonCanvas = null;
let seasonFrame = null;

function random(min, max) {
  return min + Math.random() * (max - min);
}

// ---------- หิมะ ----------
function makeSnow(width, height) {
  const count = Math.min(90, Math.round((width * height) / 16000));
  return Array.from({ length: count }, () => ({
    x: random(0, width),
    y: random(-height, height),
    radius: random(1.2, 3.6),
    speed: random(20, 60), // พิกเซลต่อวินาที
    sway: random(0, Math.PI * 2),
    alpha: random(0.5, 0.95),
  }));
}

function drawSnow(ctx, flakes, width, height, seconds) {
  flakes.forEach((f) => {
    f.y += f.speed * seconds;
    f.sway += seconds;
    const x = f.x + Math.sin(f.sway) * 12;
    if (f.y > height + 5) {
      f.y = -5;
      f.x = random(0, width);
    }
    ctx.beginPath();
    ctx.arc(x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
    ctx.fill();
  });
}

// ---------- หัวใจ ----------
const HEART_COLORS = ['#ff5c8a', '#ff8fab', '#e0466f', '#ffc2d1'];

function makeHearts(width, height) {
  const count = Math.min(30, Math.round((width * height) / 45000));
  return Array.from({ length: count }, () => ({
    x: random(0, width),
    y: random(0, height * 1.5),
    size: random(8, 18),
    speed: random(18, 45),
    sway: random(0, Math.PI * 2),
    spin: random(-0.4, 0.4),
    angle: random(-0.3, 0.3),
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    alpha: random(0.45, 0.85),
  }));
}

function drawHeartShape(ctx, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.6);
  ctx.bezierCurveTo(-s * 1.6, -s * 0.4, -s * 0.6, -s * 1.5, 0, -s * 0.6);
  ctx.bezierCurveTo(s * 0.6, -s * 1.5, s * 1.6, -s * 0.4, 0, s * 0.6);
  ctx.fill();
}

function drawHearts(ctx, hearts, width, height, seconds) {
  hearts.forEach((h) => {
    h.y -= h.speed * seconds; // ลอยขึ้น
    h.sway += seconds * 1.2;
    h.angle += h.spin * seconds;
    if (h.y < -20) {
      h.y = height + 20;
      h.x = random(0, width);
    }
    ctx.save();
    ctx.translate(h.x + Math.sin(h.sway) * 16, h.y);
    ctx.rotate(h.angle);
    ctx.globalAlpha = h.alpha;
    ctx.fillStyle = h.color;
    drawHeartShape(ctx, h.size);
    ctx.restore();
  });
}

// ---------- ฮาโลวีน ----------
function makeHalloween(width, height) {
  const bats = Array.from({ length: Math.min(9, Math.round(width / 180)) }, () => newBat(width, height, true));
  const embers = Array.from({ length: Math.min(40, Math.round((width * height) / 30000)) }, () => ({
    x: random(0, width),
    y: random(0, height),
    radius: random(1, 2.6),
    speed: random(10, 30),
    sway: random(0, Math.PI * 2),
    alpha: random(0.3, 0.8),
  }));
  return { bats, embers };
}

function newBat(width, height, anywhere) {
  const goingRight = Math.random() > 0.5;
  return {
    x: anywhere ? random(0, width) : goingRight ? -40 : width + 40,
    baseY: random(height * 0.08, height * 0.85),
    size: random(14, 26),
    speed: random(60, 130) * (goingRight ? 1 : -1),
    flap: random(0, Math.PI * 2),
    bob: random(0, Math.PI * 2),
  };
}

function drawBat(ctx, bat) {
  const s = bat.size;
  const wing = Math.sin(bat.flap) * s * 0.55; // ปีกขยับขึ้นลง
  const y = bat.baseY + Math.sin(bat.bob) * 18;

  ctx.save();
  ctx.translate(bat.x, y);
  ctx.fillStyle = '#0b0710';
  ctx.shadowColor = 'rgba(255, 122, 26, 0.75)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  // ปีกซ้าย
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-s * 0.5, -s * 0.2 - wing, -s, -wing);
  ctx.quadraticCurveTo(-s * 0.7, s * 0.05, -s * 0.45, s * 0.12);
  ctx.quadraticCurveTo(-s * 0.25, s * 0.02, 0, s * 0.2);
  // ปีกขวา
  ctx.quadraticCurveTo(s * 0.25, s * 0.02, s * 0.45, s * 0.12);
  ctx.quadraticCurveTo(s * 0.7, s * 0.05, s, -wing);
  ctx.quadraticCurveTo(s * 0.5, -s * 0.2 - wing, 0, 0);
  ctx.fill();
  // ตัว
  ctx.beginPath();
  ctx.ellipse(0, s * 0.05, s * 0.13, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalloween(ctx, scene, width, height, seconds) {
  scene.embers.forEach((e) => {
    e.y -= e.speed * seconds;
    e.sway += seconds;
    if (e.y < -5) {
      e.y = height + 5;
      e.x = random(0, width);
    }
    ctx.beginPath();
    ctx.arc(e.x + Math.sin(e.sway) * 10, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 140, 40, ${e.alpha})`;
    ctx.fill();
  });

  scene.bats.forEach((bat, index) => {
    bat.x += bat.speed * seconds;
    bat.flap += seconds * 14;
    bat.bob += seconds * 2;
    if (bat.x < -60 || bat.x > width + 60) scene.bats[index] = newBat(width, height, false);
    drawBat(ctx, bat);
  });
}

// ================= ธีมภาพพื้นหลัง =================

// ประกายเล็ก ๆ ลอยขึ้น (ใช้ร่วมกันทั้ง 3 ธีม)
function newSpark(width, height, colors, anywhere) {
  return {
    x: random(0, width),
    y: anywhere ? random(0, height) : height + random(0, 40),
    size: random(1, 2.8),
    speed: random(25, 80),
    drift: random(-12, 12),
    flicker: random(0, Math.PI * 2),
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

function drawSparks(ctx, sparks, width, height, seconds, colors) {
  sparks.forEach((p, index) => {
    p.y -= p.speed * seconds;
    p.x += p.drift * seconds;
    p.flicker += seconds * 6;
    if (p.y < -10) sparks[index] = newSpark(width, height, colors, false);
    const alpha = 0.45 + Math.sin(p.flicker) * 0.35;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    glow.addColorStop(0, p.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
  });
  ctx.globalAlpha = 1;
}

// เส้นเรืองแสง: วาดซ้อน 3 ชั้น (กว้างจาง → บางสว่าง) ให้ดูเรืองโดยไม่ต้องใช้ shadowBlur
function glowStroke(ctx, drawPath, color, alpha) {
  [[14, 0.06], [6, 0.16], [1.6, 0.9]].forEach(([lineWidth, a]) => {
    ctx.globalAlpha = a * alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    drawPath();
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// ---------- นีออนม่วง: ริบบิ้นพลังงานม่วงฟ้า + ประกาย + สายฟ้าแลบ ----------
const NEON_COLORS = ['#C77DFF', '#7DF9FF', '#FFFFFF', '#E0AAFF'];

function makeNeon(width, height) {
  return {
    time: 0,
    ribbons: [
      { base: 0.12, amp: 40, freq: 0.006, speed: 0.9, color: '#C77DFF' },
      { base: 0.9, amp: 55, freq: 0.004, speed: -0.7, color: '#7DF9FF' },
      { base: 0.82, amp: 30, freq: 0.009, speed: 1.3, color: '#E0AAFF' },
    ],
    sparks: Array.from({ length: Math.min(60, Math.round(width / 22)) }, () => newSpark(width, height, NEON_COLORS, true)),
    bolt: null,
    nextBolt: random(2, 4),
  };
}

// สายฟ้าซิกแซกจากขอบจอ
function makeBolt(width, height) {
  const fromLeft = Math.random() < 0.5;
  const points = [];
  let x = fromLeft ? random(0, width * 0.15) : random(width * 0.85, width);
  let y = random(0, height * 0.3);
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    points.push([x, y]);
    x += (fromLeft ? 1 : -1) * random(10, 40);
    y += random(20, 55);
  }
  return { points, life: 0.35 };
}

function drawNeon(ctx, scene, width, height, seconds) {
  scene.time += seconds;
  ctx.globalCompositeOperation = 'lighter';
  scene.ribbons.forEach((r) => {
    glowStroke(ctx, () => {
      for (let x = -20; x <= width + 20; x += 16) {
        const y = height * r.base + Math.sin(x * r.freq + scene.time * r.speed) * r.amp + Math.sin(x * r.freq * 2.3 - scene.time) * r.amp * 0.3;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }, r.color, 0.8);
  });
  drawSparks(ctx, scene.sparks, width, height, seconds, NEON_COLORS);

  scene.nextBolt -= seconds;
  if (scene.nextBolt <= 0) {
    scene.bolt = makeBolt(width, height);
    scene.nextBolt = random(3, 6);
  }
  if (scene.bolt) {
    scene.bolt.life -= seconds;
    if (scene.bolt.life <= 0) scene.bolt = null;
    else {
      const flash = scene.bolt.life / 0.35;
      glowStroke(ctx, () => scene.bolt.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))), '#E0AAFF', flash);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- ดาบมรกต: ไฟสีเขียวลอยขึ้น + หมอกม่วง + รอยฟันดาบ ----------
const BLADE_COLORS = ['#39E07A', '#8FF5B4', '#C6FFD9'];

function makeBlade(width, height) {
  return {
    embers: Array.from({ length: Math.min(55, Math.round(width / 24)) }, () => newSpark(width, height, BLADE_COLORS, true)),
    mists: Array.from({ length: 7 }, () => ({
      x: random(0, width),
      y: random(height * 0.3, height),
      radius: random(160, 320),
      speed: random(8, 22),
      alpha: random(0.05, 0.11),
    })),
    slash: null,
    nextSlash: random(2, 3.5),
  };
}

// รอยฟัน: เส้นเฉียงพุ่งผ่านจอเร็ว ๆ แล้วจางหาย
function makeSlash(width, height) {
  const y1 = random(height * 0.1, height * 0.6);
  return { x1: random(-100, width * 0.3), y1, x2: random(width * 0.7, width + 100), y2: y1 + random(-height * 0.35, height * 0.35), age: 0 };
}

function drawBlade(ctx, scene, width, height, seconds) {
  // หมอกม่วงลอยช้า ๆ
  scene.mists.forEach((m) => {
    m.y -= m.speed * seconds;
    if (m.y < -m.radius) {
      m.y = height + m.radius;
      m.x = random(0, width);
    }
    const fog = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
    fog.addColorStop(0, `rgba(177, 92, 255, ${m.alpha})`);
    fog.addColorStop(1, 'rgba(177, 92, 255, 0)');
    ctx.fillStyle = fog;
    ctx.fillRect(m.x - m.radius, m.y - m.radius, m.radius * 2, m.radius * 2);
  });

  ctx.globalCompositeOperation = 'lighter';
  drawSparks(ctx, scene.embers, width, height, seconds, BLADE_COLORS);

  scene.nextSlash -= seconds;
  if (scene.nextSlash <= 0) {
    scene.slash = makeSlash(width, height);
    scene.nextSlash = random(4, 7);
  }
  if (scene.slash) {
    const s = scene.slash;
    s.age += seconds;
    const draw = Math.min(1, s.age / 0.18); // พุ่งออกไป 0.18 วินาที
    const fade = s.age < 0.18 ? 1 : Math.max(0, 1 - (s.age - 0.18) / 0.6);
    if (fade <= 0) scene.slash = null;
    else {
      const tipX = s.x1 + (s.x2 - s.x1) * draw;
      const tipY = s.y1 + (s.y2 - s.y1) * draw;
      glowStroke(ctx, () => {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(tipX, tipY);
      }, '#5CF095', fade);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- ไซเบอร์: สายข้อมูลตกลงมา + เส้นสแกน + หกเหลี่ยมลอย ----------
function makeCyber(width, height) {
  return {
    streams: Array.from({ length: Math.min(40, Math.round(width / 40)) }, () => ({
      x: Math.round(random(0, width) / 24) * 24,
      y: random(-height, height),
      length: random(60, 180),
      speed: random(80, 220),
      alpha: random(0.15, 0.5),
    })),
    hexes: Array.from({ length: 9 }, () => ({
      x: random(0, width),
      y: random(0, height),
      size: random(14, 42),
      spin: random(-0.4, 0.4),
      angle: random(0, Math.PI),
      speed: random(6, 18),
      alpha: random(0.15, 0.4),
    })),
    scan: random(0, height),
  };
}

function hexPath(ctx, x, y, size, angle) {
  for (let i = 0; i <= 6; i++) {
    const a = angle + (Math.PI / 3) * i;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function drawCyber(ctx, scene, width, height, seconds) {
  ctx.globalCompositeOperation = 'lighter';
  scene.streams.forEach((s) => {
    s.y += s.speed * seconds;
    if (s.y - s.length > height) {
      s.y = random(-200, 0);
      s.x = Math.round(random(0, width) / 24) * 24;
    }
    const tail = ctx.createLinearGradient(s.x, s.y - s.length, s.x, s.y);
    tail.addColorStop(0, 'rgba(54, 200, 255, 0)');
    tail.addColorStop(1, `rgba(140, 230, 255, ${s.alpha})`);
    ctx.fillStyle = tail;
    ctx.fillRect(s.x, s.y - s.length, 2, s.length);
    ctx.fillStyle = `rgba(220, 248, 255, ${s.alpha + 0.3})`;
    ctx.fillRect(s.x - 1, s.y - 2, 4, 4);
  });

  scene.hexes.forEach((h) => {
    h.angle += h.spin * seconds;
    h.y -= h.speed * seconds;
    if (h.y < -60) {
      h.y = height + 60;
      h.x = random(0, width);
    }
    glowStroke(ctx, () => hexPath(ctx, h.x, h.y, h.size, h.angle), Math.random() < 0.003 ? '#FF4D6D' : '#36C8FF', h.alpha);
  });

  // แถบสแกนเลื่อนจากบนลงล่าง
  scene.scan = (scene.scan + 90 * seconds) % (height + 200);
  const band = ctx.createLinearGradient(0, scene.scan - 100, 0, scene.scan);
  band.addColorStop(0, 'rgba(54, 200, 255, 0)');
  band.addColorStop(1, 'rgba(54, 200, 255, 0.07)');
  ctx.fillStyle = band;
  ctx.fillRect(0, scene.scan - 100, width, 100);
  ctx.fillStyle = 'rgba(140, 230, 255, 0.25)';
  ctx.fillRect(0, scene.scan, width, 1);
  ctx.globalCompositeOperation = 'source-over';
}

const SEASON_EFFECTS = {
  christmas: { make: makeSnow, draw: drawSnow },
  valentine: { make: makeHearts, draw: drawHearts },
  halloween: { make: makeHalloween, draw: drawHalloween },
  neon: { make: makeNeon, draw: drawNeon },
  blade: { make: makeBlade, draw: drawBlade },
  cyber: { make: makeCyber, draw: drawCyber },
};

function stopSeasonEffect() {
  if (seasonFrame) cancelAnimationFrame(seasonFrame);
  seasonFrame = null;
  if (seasonCanvas) seasonCanvas.remove();
  seasonCanvas = null;
}

function startSeasonEffect(theme) {
  stopSeasonEffect();
  const effect = SEASON_EFFECTS[theme];
  if (!effect || !document.body) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'season-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  seasonCanvas = canvas;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let particles = null;

  // ปรับขนาด canvas ให้คมชัดตามหน้าจอ
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = effect.make(width, height);
  }
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  function frame(now) {
    if (canvas !== seasonCanvas) {
      window.removeEventListener('resize', resize);
      return; // เปลี่ยนธีมไปแล้ว
    }
    const seconds = Math.min((now - last) / 1000, 0.05); // กันกระตุกตอนสลับแท็บกลับมา
    last = now;
    ctx.clearRect(0, 0, width, height);
    effect.draw(ctx, particles, width, height, seconds);
    seasonFrame = requestAnimationFrame(frame);
  }
  seasonFrame = requestAnimationFrame(frame);
}

// เริ่มเอฟเฟกต์ตามธีมที่เลือกไว้ (theme.js ใส่ data-theme ไว้ตั้งแต่ใน <head>)
startSeasonEffect(document.documentElement.getAttribute('data-theme'));
