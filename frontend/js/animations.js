// ===== อนิเมชั่นที่ต้องใช้ JavaScript: ตัวเลขวิ่ง และสลับธีมแบบวงกลม =====

// ผู้ใช้ตั้งเครื่องให้ลดการเคลื่อนไหวไหม
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * ตัวเลขวิ่งจาก 0 ไปถึงค่าจริง เช่น ฿0 → ฿75,000
 * element: กล่องที่จะแสดงตัวเลข, target: ค่าจริง, format: ฟังก์ชันจัดรูปแบบ (เช่น formatMoney)
 */
function animateNumber(element, target, format = (n) => n.toLocaleString('th-TH'), duration = 900) {
  if (!element) return;
  if (prefersReducedMotion() || target === 0) {
    element.textContent = format(target);
    return;
  }

  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // เร็วตอนแรก ช้าลงตอนใกล้ถึง
    element.textContent = format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// เรียกกับทุก element ที่มี data-count="ตัวเลข" (และ data-format="money" ถ้าเป็นเงิน)
function animateCounters(container) {
  container.querySelectorAll('[data-count]').forEach((element) => {
    const format = element.dataset.format === 'money' ? formatMoney : (n) => n.toLocaleString('th-TH');
    animateNumber(element, Number(element.dataset.count), format);
  });
}

/**
 * สลับธีมแบบวงกลมกระจายออกจากปุ่มที่กด
 * เบราว์เซอร์ที่ไม่รองรับ View Transitions จะเปลี่ยนธีมทันทีแบบปกติ
 */
function switchThemeWithReveal(nextTheme, button) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    applyTheme(nextTheme);
    return Promise.resolve();
  }

  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const root = document.documentElement;
  root.classList.add('theme-switching');
  const transition = document.startViewTransition(() => applyTheme(nextTheme));

  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  });

  return transition.finished.finally(() => root.classList.remove('theme-switching'));
}

/**
 * พลุกระดาษเต็มจอ ใช้ตอนทำอะไรสำเร็จ เช่น เพิ่มกิจกรรม
 * origin: จุดที่ยิงออก { x, y } เป็นสัดส่วนของจอ (0-1)
 */
function launchConfetti(origin = { x: 0.5, y: 0.35 }) {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const styles = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--chart-1', '--chart-2', '--chart-3', '--chart-4']
    .map((name) => styles.getPropertyValue(name).trim())
    .concat(['#ffffff', '#f5b800']);

  const pieces = Array.from({ length: 160 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 7 + Math.random() * 11;
    return {
      x: width * origin.x,
      y: height * origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.4,
      round: Math.random() < 0.3,
    };
  });

  const start = performance.now();
  function frame(now) {
    const age = (now - start) / 1000;
    ctx.clearRect(0, 0, width, height);
    pieces.forEach((p) => {
      p.vy += 0.32; // แรงโน้มถ่วง
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += p.spinSpeed;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1.6) / 0.8);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.spin * 2)) + 1);
      }
      ctx.restore();
    });
    if (age < 2.4) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
