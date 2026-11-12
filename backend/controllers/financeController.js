// ===== หน้า งบการเงิน =====
const { getClubData, sumBy, withPercent } = require('../services/clubData');

// GET /api/finance → ยอดรวม + ใช้ไปตามหมวด + แหล่งเงิน + ค่าใช้จ่ายรายกิจกรรม
// ทุกตัวเลขคำนวณจากแถวในชีต ไม่มีตัวเลขเขียนตายตัว
async function getFinance(req, res, next) {
  try {
    const { funding, expenses, events } = await getClubData();

    const totalFunding = funding.reduce((sum, f) => sum + f.amount, 0);
    const totalSpent = expenses.reduce((sum, x) => sum + x.amount, 0);

    const spendingByCategory = withPercent(sumBy(expenses, 'category'), totalSpent).map((item) => ({
      category: item.key,
      amount: item.amount,
      percent: item.percent,
    }));

    // แหล่งเงิน: ได้มาเท่าไหร่ และถูกใช้ไปเท่าไหร่แล้ว
    const fundingSources = withPercent(
      funding.map((f) => ({
        funding_id: f.funding_id,
        source_name: f.source_name,
        source_type: f.source_type,
        amount: f.amount,
        spent: expenses.filter((x) => x.funding_id === f.funding_id).reduce((s, x) => s + x.amount, 0),
      })),
      totalFunding
    );

    // ค่าใช้จ่ายจริงของแต่ละกิจกรรม (เฉพาะกิจกรรมที่มีค่าใช้จ่าย)
    const spendingByEvent = events
      .map((event) => ({
        event_id: event.event_id,
        title: event.title,
        start_at: event.start_at,
        planned_budget: event.planned_budget,
        amount: expenses.filter((x) => x.event_id === event.event_id).reduce((s, x) => s + x.amount, 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

    res.json({
      total_funding: totalFunding,
      total_spent: totalSpent,
      remaining: totalFunding - totalSpent,
      used_percent: totalFunding > 0 ? Math.round((totalSpent / totalFunding) * 1000) / 10 : 0,
      spending_by_category: spendingByCategory,
      funding_sources: fundingSources,
      spending_by_event: spendingByEvent,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getFinance };
