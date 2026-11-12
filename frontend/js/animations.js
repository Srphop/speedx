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
