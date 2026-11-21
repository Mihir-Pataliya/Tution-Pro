const mongoose = require('mongoose');
const fs = require('fs');
const https = require('https');
const path = require('path');
const tls = require('tls');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Enquiry = require('../models/Enquiry');
const User = require('../models/User');
const copilotUsage = new Map();

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const money = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const requestOpenAi = (payload) => new Promise((resolve, reject) => {
  let agent;
  if (process.env.OPENAI_CA_CERT_PATH) {
    const caPath = path.resolve(__dirname, '..', process.env.OPENAI_CA_CERT_PATH);
    const extraCa = fs.readFileSync(caPath);
    agent = new https.Agent({ ca: [...tls.rootCertificates, extraCa] });
  }

  const request = https.request('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    agent,
  }, (response) => {
    const chunks = [];
    let bytes = 0;
    response.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) request.destroy(new Error('AI provider response was too large'));
      else chunks.push(chunk);
    });
    response.on('end', () => {
      try {
        resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      } catch {
        reject(new Error('AI provider returned an invalid response'));
      }
    });
  });
  request.setTimeout(20_000, () => request.destroy(new Error('AI provider request timed out')));
  request.on('error', reject);
  request.end(JSON.stringify(payload));
});

const getDashboardOverview = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisMonth = monthStart(now);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [students, batches, todayAttendance, monthFees, feeTotals, revenueRows, enrollmentRows, batchAttendance, recentEnquiries, enquiryCount, enquiryPipeline, dueFollowUps, ownerSettings] = await Promise.all([
      Student.find({ userId: ownerId }).select('name batchId monthlyFee isActive createdAt').lean(),
      Batch.find({ userId: ownerId, isActive: true }).select('name subject timings days maxStudents isActive').lean(),
      Attendance.find({ userId: ownerId, date: { $gte: todayStart, $lt: tomorrow } }).select('status batchId').lean(),
      Fee.find({ userId: ownerId, status: 'paid', paidDate: { $gte: thisMonth, $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } }).select('amount').lean(),
      Fee.aggregate([
        { $match: { userId: ownerId } },
        { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Fee.aggregate([
        { $match: { userId: ownerId, status: 'paid', $or: [{ paidDate: { $gte: chartStart } }, { paidDate: null, createdAt: { $gte: chartStart } }] } },
        { $project: { monthDate: { $ifNull: ['$paidDate', '$createdAt'] }, amount: 1 } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$monthDate' } }, total: { $sum: '$amount' } } },
      ]),
      Student.aggregate([
        { $match: { userId: ownerId, createdAt: { $gte: chartStart } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { userId: ownerId, date: { $gte: chartStart } } },
        { $group: { _id: { batchId: '$batchId', status: '$status' }, total: { $sum: 1 } } },
      ]),
      Enquiry.find({ userId: ownerId }).select('studentName parentName interestedCourse status createdAt followUpDate').sort({ createdAt: -1 }).limit(5).lean(),
      Enquiry.countDocuments({ userId: ownerId, status: { $in: ['new', 'contacted', 'demo_scheduled'] } }),
      Enquiry.aggregate([{ $match: { userId: ownerId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Enquiry.countDocuments({ userId: ownerId, status: { $in: ['new', 'contacted', 'demo_scheduled'] }, followUpDate: { $ne: null, $lt: tomorrow } }),
      User.findById(ownerId).select('notificationPreferences').lean(),
    ]);

    const studentsByBatch = new Map();
    students.forEach((student) => {
      const id = student.batchId ? String(student.batchId) : 'unassigned';
      studentsByBatch.set(id, (studentsByBatch.get(id) || 0) + 1);
    });
    const attendanceByBatch = new Map();
    batchAttendance.forEach((row) => {
      const id = String(row._id.batchId);
      const stat = attendanceByBatch.get(id) || { present: 0, late: 0, total: 0 };
      stat[row._id.status] = (stat[row._id.status] || 0) + row.total;
      stat.total += row.total;
      attendanceByBatch.set(id, stat);
    });
    const fees = Object.fromEntries(feeTotals.map((row) => [row._id, { amount: money(row.amount), count: row.count }]));
    const revenueByMonth = new Map(revenueRows.map((row) => [row._id, money(row.total)]));
    const enrollmentByMonth = new Map(enrollmentRows.map((row) => [row._id, row.total]));
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: date.toLocaleString('en', { month: 'short' }), revenue: revenueByMonth.get(key) || 0, enrollments: enrollmentByMonth.get(key) || 0 };
    });

    const activeStudents = students.filter((student) => student.isActive).length;
    const assignedStudents = students.filter((student) => student.isActive && student.batchId).length;
    const presentToday = todayAttendance.filter((record) => record.status === 'present' || record.status === 'late').length;
    const monthlyRevenue = monthFees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
    const schedule = batches
      .filter((batch) => !Array.isArray(batch.days) || batch.days.length === 0 || batch.days.some((day) => day.toLowerCase() === now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase()))
      .map((batch) => ({ name: batch.name, subject: batch.subject || 'General', timing: batch.timings || 'Time not set', studentCount: studentsByBatch.get(String(batch._id)) || 0 }))
      .sort((a, b) => a.timing.localeCompare(b.timing));
    const classPerformance = batches.map((batch) => {
      const attendance = attendanceByBatch.get(String(batch._id)) || { present: 0, late: 0, total: 0 };
      const attendanceRate = attendance.total ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : null;
      return { name: batch.name, subject: batch.subject || 'General', students: studentsByBatch.get(String(batch._id)) || 0, attendanceRate };
    });
    const outstanding = money((fees.pending?.amount || 0) + (fees.overdue?.amount || 0) + (fees.partial?.amount || 0));
    const notificationPreferences = ownerSettings?.notificationPreferences || {};
    const notifications = [];
    if (notificationPreferences.enquiries !== false && enquiryCount > 0) notifications.push({ id: 'enquiries', message: `${enquiryCount} active ${enquiryCount === 1 ? 'enquiry is' : 'enquiries are'} being tracked.` });
    if (notificationPreferences.followUps !== false && dueFollowUps > 0) notifications.push({ id: 'followUps', message: `${dueFollowUps} enquiry ${dueFollowUps === 1 ? 'follow-up is' : 'follow-ups are'} due.` });
    if (notificationPreferences.fees !== false && outstanding > 0) notifications.push({ id: 'fees', message: `${outstanding.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} in fees is pending or overdue.` });
    if (notificationPreferences.attendance !== false && todayAttendance.length === 0) notifications.push({ id: 'attendance', message: 'No attendance has been recorded today.' });

    res.json({ success: true, data: {
      generatedAt: now.toISOString(),
      kpis: { students: students.length, activeStudents, assignedStudents, newStudentsThisMonth: students.filter((student) => student.createdAt >= thisMonth).length, activeBatches: batches.length, presentToday, monthlyRevenue: money(monthlyRevenue), outstandingFees: outstanding },
      revenue: months,
      enrollment: months.map(({ key, label, enrollments }) => ({ key, label, enrollments })),
      fees: { collected: money(fees.paid?.amount || 0), pending: money(fees.pending?.amount || 0) + money(fees.partial?.amount || 0), overdue: money(fees.overdue?.amount || 0) },
      enquiries: { active: enquiryCount, pipeline: Object.fromEntries((enquiryPipeline || []).map((row) => [row._id || 'unknown', row.count])) },
      recentEnquiries,
      notifications,
      batches: batches.map((batch) => ({ id: String(batch._id), name: batch.name, subject: batch.subject || '', students: studentsByBatch.get(String(batch._id)) || 0, capacity: batch.maxStudents || 0 })),
      schedule,
      classPerformance,
      attendance: { present: presentToday, absent: todayAttendance.filter((record) => record.status === 'absent').length, totalMarked: todayAttendance.length },
      insights: [
        students.length === 0 ? 'Add your first students to start seeing enrollment trends.' : `${students.filter((student) => student.createdAt >= thisMonth).length} students joined this month.`,
        todayAttendance.length === 0 ? 'No attendance has been recorded today.' : `${presentToday} of ${todayAttendance.length} attendance records are present or late today.`,
        outstanding > 0 ? `There is ${outstanding.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} in pending or overdue fees.` : 'No pending or overdue fees are recorded.',
      ],
    } });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard overview' });
  }
};

const askCopilot = async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 600) : '';
  if (!question) return res.status(400).json({ message: 'Enter a question for the Tuition Copilot' });

  const nowMs = Date.now();
  const currentUsage = copilotUsage.get(req.user.id);
  if (currentUsage && nowMs - currentUsage.startedAt < 60_000 && currentUsage.count >= 12) {
    return res.status(429).json({ message: 'Please wait a minute before asking Copilot again' });
  }
  copilotUsage.set(req.user.id, currentUsage && nowMs - currentUsage.startedAt < 60_000
    ? { ...currentUsage, count: currentUsage.count + 1 }
    : { startedAt: nowMs, count: 1 });

  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const [studentCount, batchCount, todayAttendance, feeRows] = await Promise.all([
      Student.countDocuments({ userId: ownerId, isActive: true }),
      Batch.countDocuments({ userId: ownerId, isActive: true }),
      Attendance.countDocuments({ userId: ownerId, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date(new Date().setHours(0, 0, 0, 0)).setDate(new Date().getDate() + 1)) }, status: { $in: ['present', 'late'] } }),
      Fee.aggregate([{ $match: { userId: ownerId, status: { $in: ['pending', 'partial', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const context = { activeStudents: studentCount, activeBatches: batchCount, attendancePresentToday: todayAttendance, outstandingFees: money(feeRows[0]?.total || 0) };
    if (!process.env.OPENAI_API_KEY) {
      const answer = /draft|write|create|generate/i.test(question)
        ? `Draft: Hello! This is a friendly reminder that tuition fees are pending. Please review the outstanding balance of ₹${context.outstandingFees.toLocaleString('en-IN')} and contact us if you have already made the payment. Thank you.`
        : `Here is a snapshot from your tuition data: ${context.activeStudents} active students across ${context.activeBatches} active batches, ${context.attendancePresentToday} marked present today, and ₹${context.outstandingFees.toLocaleString('en-IN')} outstanding. Add OPENAI_API_KEY on the server to enable generated answers.`;
      return res.json({ success: true, data: { answer, generated: false } });
    }

    const response = await requestOpenAi({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise and practical tuition-center operations copilot. Answer from the provided aggregate figures only. Never claim to have access to individual student records.' },
          { role: 'user', content: `Aggregated tuition-center figures: ${JSON.stringify(context)}\nQuestion: ${question}` },
        ],
        max_tokens: 280,
    });
    if (response.status < 200 || response.status >= 300) {
      const providerCode = response.body.error?.code || response.body.error?.type;
      if (providerCode === 'insufficient_quota' || providerCode === 'credit_balance_exhausted') {
        return res.status(402).json({ message: 'OpenAI API credits are exhausted. Add API credits in your OpenAI platform billing settings, then try again.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ message: 'OpenAI is receiving too many requests right now. Please wait a moment and try again.' });
      }
      if (response.status === 401) {
        return res.status(502).json({ message: 'OpenAI rejected the API key. Check OPENAI_API_KEY in node/.env and restart the backend.' });
      }
      throw new Error(`AI provider returned ${response.status} (${providerCode || 'unknown error'})`);
    }
    const result = response.body;
    res.json({ success: true, data: { answer: result.choices?.[0]?.message?.content?.trim() || 'I could not prepare an answer just now.', generated: true } });
  } catch (error) {
    console.error('Copilot error:', error.cause?.code || error.message);
    res.status(502).json({ message: 'Tuition Copilot is temporarily unavailable. Please try again.' });
  }
};

// Kept for compatibility with existing clients.
const getDashboardStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const [totalStudents, activeBatches, presentToday, pending] = await Promise.all([
      Student.countDocuments({ userId, isActive: true }),
      Batch.countDocuments({ userId, isActive: true }),
      Attendance.countDocuments({ userId, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date(new Date().setHours(0, 0, 0, 0)).setDate(new Date().getDate() + 1)) }, status: { $in: ['present', 'late'] } }),
      Fee.aggregate([{ $match: { userId, status: { $in: ['pending', 'partial', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({ success: true, data: { totalStudents, activeBatches, presentToday, pendingFees: money(pending[0]?.total || 0) } });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

module.exports = { getDashboardOverview, getDashboardStats, askCopilot };
