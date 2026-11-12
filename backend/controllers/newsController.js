// ===== หน้า ข่าวสารชมรม =====
const { getClubData } = require('../services/clubData');

// GET /api/news → ข่าวเรียงจากใหม่ไปเก่า
async function getNews(req, res, next) {
  try {
    const { news, events } = await getClubData();

    const items = news
      .map((item) => {
        const event = events.find((e) => e.event_id === item.event_id);
        return {
          ...item,
          event_title: event ? event.title : null, // ข่าวที่ผูกกับกิจกรรม กดแล้วไปหน้ากิจกรรมนั้น
        };
      })
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    res.json({ news: items });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNews };
