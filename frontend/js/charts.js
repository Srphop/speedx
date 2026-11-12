// ===== กราฟวงกลม / โดนัท / แท่งแนวนอน (วาดด้วย SVG และ HTML เอง ไม่ต้องใช้ไลบรารี) =====

// สีประจำคณะ (ตาม design) คณะอื่นใช้สีเทา
const FACULTY_COLORS = {
  'วิศวกรรมศาสตร์': '#8B2549',
  'วิทยาศาสตร์': '#6B46B0',
  'นิเทศศาสตร์': '#305EAA',
  'อักษรศาสตร์': '#A35F19',
};
const OTHER_COLOR = '#66717A';

// สีกราฟงบ: เขียวหลายเฉด + เทา (ค่าจริงอยู่ใน CSS เพื่อให้เปลี่ยนตามธีม)
function budgetColor(index) {
  return `var(--chart-${(index % 5) + 1})`;
}

// กล่องข้อความลอยตอนชี้เมาส์ที่กราฟ (ใช้ร่วมกันทุกกราฟ)
let tooltip = null;
function showTooltip(event, html) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}
function hideTooltip() {
  if (tooltip) tooltip.hidden = true;
}

let chartCount = 0; // ใช้ตั้งชื่อหน้ากากของแต่ละกราฟไม่ให้ซ้ำกัน

// จุดบนวงกลม (มุมเริ่มที่ 12 นาฬิกา หมุนตามเข็ม)
function pointOnCircle(cx, cy, radius, fraction) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

// รูปชิ้นพาย 1 ชิ้น จาก fraction start ถึง end
function slicePath(start, end, outer, inner) {
  const c = 110;
  if (end - start >= 0.9999) end = start + 0.9999; // ชิ้นเดียวเต็มวง
  const large = end - start > 0.5 ? 1 : 0;
  const [x1, y1] = pointOnCircle(c, c, outer, start);
  const [x2, y2] = pointOnCircle(c, c, outer, end);
  if (inner === 0) {
    return `M${c},${c} L${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} Z`;
  }
  const [x3, y3] = pointOnCircle(c, c, inner, end);
  const [x4, y4] = pointOnCircle(c, c, inner, start);
  return `M${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
}

/**
 * วาดกราฟวงกลมหรือโดนัท + คำอธิบายสี (legend)
 * items: [{ label, value, color }]
 * options: { donut, centerLabel, centerValue, formatValue, title, emptyMessage }
 */
function drawPieChart(container, items, options = {}) {
  const formatValue = options.formatValue || ((v) => v);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    renderEmpty(container, options.emptyMessage || 'ยังไม่มีข้อมูลสำหรับแสดงกราฟ');
    return;
  }

  const inner = options.donut ? 64 : 0;
  let start = 0;
  const slices = items.map((item, index) => {
    const fraction = item.value / total;
    const path = slicePath(start, start + fraction, 104, inner);
    start += fraction;
    const percent = Math.round(fraction * 1000) / 10;
    return `<path d="${path}" style="fill:${item.color}" data-index="${index}" data-percent="${percent}"></path>`;
  });

  // ตัวเลขกลางโดนัท ใส่ centerCount เพื่อให้ตัวเลขวิ่งขึ้น (ดู animations.js)
  const countAttributes = options.centerCount !== undefined
    ? `data-count="${options.centerCount}" data-format="${options.centerFormat || ''}"`
    : '';
  const center = options.donut
    ? `<text x="110" y="102" text-anchor="middle" class="chart-center-label">${escapeHtml(options.centerLabel || '')}</text>
       <text x="110" y="128" text-anchor="middle" class="chart-center-value num" ${countAttributes}>${escapeHtml(options.centerValue || '')}</text>`
    : '';

  // หน้ากากวงกลมที่ค่อย ๆ เปิดตามเข็มนาฬิกา ทำให้กราฟดูเหมือนถูกวาดขึ้นมา
  chartCount += 1;
  const maskId = `chart-mask-${chartCount}`;
  const sweepMask = `<defs><mask id="${maskId}">
      <circle class="chart-sweep" cx="110" cy="110" r="55" fill="none" stroke="#fff" stroke-width="112"
        pathLength="1" stroke-dasharray="1" stroke-dashoffset="${prefersReducedMotion() ? 0 : 1}" transform="rotate(-90 110 110)"/>
    </mask></defs>`;

  const legend = items
    .map((item, index) => {
      const percent = Math.round((item.value / total) * 1000) / 10;
      return `<li style="--i:${index}">
        <span class="legend-swatch" style="background:${item.color}"></span>
        <span>${escapeHtml(item.label)}</span>
        <span class="num">${escapeHtml(formatValue(item.value))}</span>
        <span class="legend-percent num">${percent}%</span>
      </li>`;
    })
    .join('');

  container.removeAttribute('aria-busy');
  container.innerHTML = `
    <div class="chart-layout">
      <svg class="chart-svg" viewBox="0 0 220 220" role="img" aria-label="${escapeHtml(options.title || 'กราฟ')} รายละเอียดอยู่ในตารางสีข้างกราฟ">
        ${sweepMask}<g mask="url(#${maskId})">${slices.join('')}</g>${center}
      </svg>
      <ul class="legend">${legend}</ul>
    </div>`;

  animateCounters(container);

  container.querySelectorAll('path').forEach((path) => {
    const item = items[Number(path.dataset.index)];
    path.addEventListener('pointermove', (event) =>
      showTooltip(event, `<strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(formatValue(item.value))} (${path.dataset.percent}%)`)
    );
    path.addEventListener('pointerleave', hideTooltip);
  });
}

/**
 * วาดแท่งแนวนอน มีชื่อและตัวเลขกำกับทุกแท่ง
 * items: [{ label, value, percent }]
 */
function drawBarList(container, items, options = {}) {
  const formatValue = options.formatValue || ((v) => v);
  const max = Math.max(0, ...items.map((item) => item.value));

  if (max <= 0) {
    renderEmpty(container, options.emptyMessage || 'ยังไม่มีข้อมูลสำหรับแสดงกราฟ');
    return;
  }

  container.removeAttribute('aria-busy');
  container.innerHTML = `<ul class="bar-list">${items
    .map(
      (item, index) => `<li style="--i:${index}">
        <div class="bar-row-top">
          <span>${escapeHtml(item.label)}</span>
          <span class="num"><strong>${escapeHtml(formatValue(item.value))}</strong> <span class="muted">${item.percent}%</span></span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${(item.value / max) * 100}%"></div></div>
      </li>`
    )
    .join('')}</ul>`;
}
