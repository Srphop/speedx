// ===== เอฟเฟกต์ธีมเทศกาล: วิ่งตลอดเวลาบน <canvas> ที่ลอยอยู่เหนือหน้าเว็บ =====
//   คริสต์มาส  → หิมะตก
//   วาเลนไทน์  → หัวใจลอยขึ้น
//   ฮาโลวีน    → ค้างคาวบิน + ประกายไฟลอยขึ้น
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

const SEASON_EFFECTS = {
  christmas: { make: makeSnow, draw: drawSnow },
  valentine: { make: makeHearts, draw: drawHearts },
  halloween: { make: makeHalloween, draw: drawHalloween },
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
