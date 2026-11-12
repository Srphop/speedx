// ===== อวกาศของหน้าเข้าสู่ระบบ / สมัครบัญชี =====
// 1) ฝั่งซ้าย: ดาวพุ่งเข้าหาจอช้า ๆ + ดาวตกเป็นระยะ
// 2) ตอนกดปุ่ม: อวกาศขยายเต็มจอ ดาวเร่งเป็นเส้นแสง (warp speed) รอบโลโก้
//    สำเร็จ → โลโก้พุ่งเข้าหาจอ + แฟลช แล้วเข้าเว็บ   ไม่สำเร็จ → จอเต็มค่อย ๆ หายไป
// สัญญาณมาจาก auth-form.js: 'space-warp' (เริ่ม/หยุด) และ 'space-jump' (สำเร็จ)
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAR_COLORS = ['255,255,255', '255,255,255', '255,255,255', '200,220,255', '160,236,41'];
  const NORMAL_SPEED = 0.25; // ลอยช้า ๆ
  const WARP_SPEED = 9; // ตอนเร่งเต็มจอ

  /**
   * สร้างทุ่งดาวบน canvas
   * options.centerY = ตำแหน่งจุดหายของดาว (0-1 ของความสูง)
   * options.meteors = มีดาวตกไหม
   */
  function createStarfield(canvas, options) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let stars = [];
    let meteors = [];
    let speed = options.startSpeed || NORMAL_SPEED;
    let targetSpeed = speed;
    let nextMeteorAt = 0;
    let running = true;

    // ดาว 1 ดวง = ตำแหน่งใน 3 มิติ (z ยิ่งน้อยยิ่งใกล้จอ)
    function newStar(far) {
      return {
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: far ? width : Math.random() * width,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        twinkle: Math.random() * Math.PI * 2,
      };
    }

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = Array.from({ length: options.count || 280 }, () => newStar(false));
    }

    function drawStars(seconds) {
      const cx = width / 2;
      const cy = height * options.centerY;
      const focal = width * 0.6;

      stars.forEach((star, index) => {
        const previousZ = star.z;
        star.z -= speed * 60 * seconds * (width / 600);
        star.twinkle += seconds * 3;

        if (star.z <= 1) {
          stars[index] = newStar(true);
          return;
        }

        const sx = cx + (star.x / star.z) * focal;
        const sy = cy + (star.y / star.z) * focal;
        if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) {
          stars[index] = newStar(true);
          return;
        }

        const closeness = 1 - star.z / width;
        const size = 0.6 + closeness * 2.2;
        const alpha = Math.min(1, 0.35 + closeness * 0.9) * (0.75 + Math.sin(star.twinkle) * 0.25);

        // ยิ่งเร็ว ยิ่งเห็นเป็นเส้นยาว
        const trailZ = previousZ + speed * width * 0.02;
        ctx.strokeStyle = `rgba(${star.color}, ${alpha})`;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + (star.x / trailZ) * focal, cy + (star.y / trailZ) * focal);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      });
    }

    // ดาวตก: เริ่มจากขอบบน/ขวา พุ่งลงซ้าย หางเรืองแสง
    function drawMeteors(seconds, now) {
      if (now > nextMeteorAt) {
        const fromTop = Math.random() > 0.4;
        meteors.push({
          x: fromTop ? Math.random() * width * 1.2 : width + 20,
          y: fromTop ? -20 : Math.random() * height * 0.5,
          speed: 700 + Math.random() * 600,
          length: 140 + Math.random() * 160,
          life: 1,
        });
        nextMeteorAt = now + 900 + Math.random() * 1800;
      }

      const angle = Math.PI * 0.78;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      meteors = meteors.filter((m) => m.life > 0 && m.y < height + 200 && m.x > -300);
      meteors.forEach((m) => {
        m.x += dx * m.speed * seconds;
        m.y += dy * m.speed * seconds;
        m.life -= seconds * 0.6;

        const tailX = m.x - dx * m.length;
        const tailY = m.y - dy * m.length;
        const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${m.life})`);
        gradient.addColorStop(0.3, `rgba(200, 255, 140, ${m.life * 0.6})`);
        gradient.addColorStop(1, 'rgba(160, 236, 41, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${m.life})`;
        ctx.shadowColor = 'rgba(200, 255, 140, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    resize();
    new ResizeObserver(resize).observe(canvas);

    if (reduceMotion) {
      drawStars(0); // ลดการเคลื่อนไหว → ดาวนิ่ง ๆ
      return { setSpeed() {}, stop() {} };
    }

    let last = performance.now();
    function frame(now) {
      if (!running) return;
      const seconds = Math.min((now - last) / 1000, 0.05);
      last = now;
      speed += (targetSpeed - speed) * Math.min(1, seconds * 2.5); // ค่อย ๆ เร่ง/ผ่อน
      ctx.clearRect(0, 0, width, height);
      drawStars(seconds);
      if (options.meteors) drawMeteors(seconds, now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      setSpeed(value) {
        targetSpeed = value;
      },
      stop() {
        running = false;
      },
    };
  }

  // ---------- 1) ฝั่งซ้ายของการ์ด ----------
  const panelCanvas = document.querySelector('.space-canvas');
  if (panelCanvas) createStarfield(panelCanvas, { centerY: 0.4, meteors: true });

  if (reduceMotion) return; // ไม่มีจอเต็มสำหรับคนที่ลดการเคลื่อนไหว

  // ---------- 2) warp เต็มจอตอนกดปุ่ม ----------
  let overlay = null;
  let overlayField = null;
  let hideTimer = null;

  function showOverlay() {
    clearTimeout(hideTimer);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'warp-overlay';
      overlay.setAttribute('role', 'status');
      overlay.innerHTML = `
        <canvas class="warp-canvas" aria-hidden="true"></canvas>
        <div class="warp-center">
          <img class="warp-logo" src="assets/logo-original.png" alt="">
          <p class="warp-text">กำลังเข้าสู่ระบบ…</p>
        </div>
        <div class="warp-flash" aria-hidden="true"></div>`;
      document.body.appendChild(overlay);
      overlayField = createStarfield(overlay.querySelector('.warp-canvas'), {
        centerY: 0.5,
        count: 420,
        startSpeed: 1,
      });
    }
    overlay.classList.remove('leaving');
    requestAnimationFrame(() => overlay.classList.add('visible'));
    overlayField.setSpeed(WARP_SPEED);
  }

  function hideOverlay() {
    if (!overlay) return;
    overlayField.setSpeed(NORMAL_SPEED);
    overlay.classList.remove('visible');
    overlay.classList.add('leaving');
    hideTimer = setTimeout(() => {
      overlayField.stop();
      overlay.remove();
      overlay = null;
    }, 600);
  }

  document.addEventListener('space-warp', (event) => {
    if (event.detail) showOverlay();
    else hideOverlay();
  });

  // สำเร็จ: โลโก้พุ่งเข้าหาจอ + แฟลช (auth-form.js รอ 0.9 วิ แล้วค่อยเปลี่ยนหน้า)
  document.addEventListener('space-jump', () => {
    showOverlay();
    overlayField.setSpeed(WARP_SPEED * 2.5);
    overlay.querySelector('.warp-text').textContent = 'ยินดีต้อนรับ';
    overlay.classList.add('jumping');
  });
})();
