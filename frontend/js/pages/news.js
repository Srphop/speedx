// ===== หน้า ข่าวสารชมรม (หน้าแรกหลังล็อกอิน) =====
initLayout();

const noticeBox = document.getElementById('upcoming-notice');
const feed = document.getElementById('news-feed');

// การ์ดนับถอยหลัง "กิจกรรมใกล้ถึง" ใช้ข้อมูลชุดเดียวกับกระดิ่ง
const SPEED_LINES = `
  <svg class="speed-lines" viewBox="0 0 1200 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <path d="M520 260 C 760 200, 980 110, 1260 -40" stroke="#A0EC29" stroke-width="18" fill="none" stroke-linecap="round" pathLength="1" opacity="0.9"/>
    <path d="M600 280 C 820 220, 1020 140, 1260 30" stroke="#A0EC29" stroke-width="4" fill="none" stroke-linecap="round" pathLength="1" opacity="0.45"/>
    <path d="M460 240 C 700 170, 900 70, 1260 -110" stroke="#A0EC29" stroke-width="2" fill="none" stroke-linecap="round" pathLength="1" opacity="0.3"/>
  </svg>`;

function daysLeftText(days) {
  if (days <= 0) return { number: 'วันนี้', unit: '' };
  if (days === 1) return { number: 'พรุ่งนี้', unit: '' };
  return { number: String(days), unit: 'วัน' };
}

async function loadNotice() {
  try {
    const { notifications } = await getNotifications();
    const upcoming = notifications.filter((n) => n.type === 'event');

    if (upcoming.length === 0) {
      noticeBox.hidden = true;
      return;
    }

    const first = upcoming[0];
    const left = daysLeftText(first.days_left);
    const more = upcoming.length > 1 ? `<p class="countdown-more">และอีก ${upcoming.length - 1} กิจกรรมที่จะเริ่มใน 3 วันนี้ ดูได้ที่กระดิ่ง</p>` : '';

    noticeBox.innerHTML = `
      <div class="countdown">
        ${SPEED_LINES}
        <div class="countdown-days" aria-label="อีก ${first.days_left} วัน">
          <span class="countdown-number">${left.number}</span>
          <span class="countdown-unit">${left.unit}</span>
        </div>
        <div>
          <p class="countdown-label">${icon('bell')} กิจกรรมใกล้ถึง</p>
          <h2 class="countdown-title">${escapeHtml(first.title)}</h2>
          <p class="countdown-meta">
            <span>${escapeHtml(formatDateLong(first.start_at))}</span>
            <span>${escapeHtml(formatTime(first.start_at))} น.</span>
            <span>${escapeHtml(first.location)}</span>
          </p>
          ${more}
        </div>
        <a class="btn btn-primary" href="event.html?id=${encodeURIComponent(first.event_id)}">ดูรายละเอียด</a>
      </div>`;
  } catch (error) {
    noticeBox.hidden = true; // การ์ดนี้เป็นของเสริม ถ้าโหลดไม่ได้ก็ซ่อนไป
  }
}

// ช่องวันที่ด้านซ้ายของข่าว: วันที่ตัวใหญ่ + เดือน
function dateTileHtml(iso) {
  const day = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric' }).format(new Date(iso));
  const month = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, month: 'short' }).format(new Date(iso));
  return `<time class="date-tile" datetime="${escapeHtml(iso)}">
    <span class="date-tile-day">${escapeHtml(day)}</span>
    <span class="date-tile-month">${escapeHtml(month)}</span>
  </time>`;
}

// รูปประกอบข่าว: ถ้าในชีตใส่ลิงก์รูปไว้ (คอลัมน์ cover_image_url) ใช้รูปนั้น
// ถ้าไม่มี ใช้ภาพวาดตามประเภทกิจกรรมใน assets/news/
const NEWS_ILLUSTRATIONS = {
  'จิตอาสา': 'volunteer',
  'ให้ความรู้': 'learning',
  'สานสัมพันธ์': 'social',
  'รับน้อง': 'welcome',
};

function coverImageUrl(item) {
  if (item.cover_image_url) return item.cover_image_url;
  const name = NEWS_ILLUSTRATIONS[item.event_category] || 'announcement';
  return `assets/news/${name}.svg`;
}

function newsItemHtml(item) {
  const link = item.event_id ? `event.html?id=${encodeURIComponent(item.event_id)}` : null;
  const title = link ? `<a href="${link}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
  const eventLink = link
    ? `<a class="text-link" href="${link}">ดูกิจกรรม ${escapeHtml(item.event_title || '')}</a>`
    : '';

  return `
    <article class="news-item">
      <div class="news-cover-wrap">
        <img class="news-cover" src="${escapeHtml(coverImageUrl(item))}" alt="" loading="lazy">
        ${dateTileHtml(item.published_at)}
      </div>
      <div class="news-body">
        <div class="news-meta">
          <span class="tag">${escapeHtml(item.news_type)}</span>
        </div>
        <h3 class="news-title">${title}</h3>
        <p class="muted">${escapeHtml(item.summary)}</p>
        ${eventLink}
      </div>
    </article>`;
}

async function loadNews() {
  renderLoading(feed, 5);
  try {
    const { news } = await apiRequest('/api/news');
    if (news.length === 0) {
      renderEmpty(feed, 'ยังไม่มีข่าว เพิ่มข่าวได้ที่แท็บ News ใน Google Sheet');
      return;
    }
    feed.removeAttribute('aria-busy');
    feed.innerHTML = `<div class="news-feed">${news.map(newsItemHtml).join('<hr style="border:0;border-top:1px solid var(--divider);margin:8px 0">')}</div>`;
  } catch (error) {
    renderError(feed, error.message, loadNews);
  }
}

loadNotice();
loadNews();
