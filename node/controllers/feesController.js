const mongoose = require('mongoose');
const Fee = require('../models/Fee');
const Student = require('../models/Student');

const buildTenantFilter = (req) => ({ userId: req.user.id });

// Helper to recalc student fee status
const recalcStudentFees = async (userId, studentId) => {
  try {
    const fees = await Fee.find({ userId, studentId });
    const totalDue = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaid = fees
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const status =
      totalDue <= 0
        ? 'paid'
        : fees.some((f) => f.status === 'overdue')
        ? 'overdue'
        : fees.some((f) => f.status === 'pending')
        ? 'pending'
        : 'partial';
    await Student.findOneAndUpdate({ _id: studentId, userId }, { feesStatus: status, feesPaid: totalPaid, totalFees: totalDue });
  } catch (e) {
    console.error('recalcStudentFees error:', e);
  }
};

const getFees = async (req, res) => {
  try {
    const { studentId, status, batchId, search } = req.query;
    const filter = buildTenantFilter(req);
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    if (batchId) filter.batchId = batchId;
    if (search) {
      // search by description or populate later not easy; we'll filter after if needed
      filter.$or = [{ description: new RegExp(search, 'i') }];
    }
    const fees = await Fee.find(filter)
      .populate({ path: 'studentId', select: 'name parentName batchId', populate: { path: 'batchId', select: 'name' } })
      .populate({ path: 'batchId', select: 'name' })
      .sort({ dueDate: -1, createdAt: -1 });
    res.json({ success: true, data: fees });
  } catch (err) {
    console.error('getFees error:', err);
    res.status(500).json({ message: 'Failed to fetch fees' });
  }
};

const getFee = async (req, res) => {
  try {
    const fee = await Fee.findOne({ _id: req.params.id, ...buildTenantFilter(req) })
      .populate({ path: 'studentId', select: 'name parentName batchId', populate: { path: 'batchId', select: 'name' } });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.json({ success: true, data: fee });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch fee' });
  }
};

const createFee = async (req, res) => {
  try {
    const { studentId, batchId, amount, dueDate, status, description, paidDate } = req.body;
    if (!studentId) return res.status(400).json({ message: 'Student is required' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (!dueDate) return res.status(400).json({ message: 'Due date is required' });
    const student = await Student.findOne({ _id: studentId, userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const fee = await Fee.create({
      userId: req.user.id,
      studentId,
      batchId: batchId || student.batchId,
      amount: Number(amount),
      dueDate,
      paidDate: paidDate || (status === 'paid' ? new Date() : undefined),
      status: status || 'pending',
      description: description || '',
    });
    await recalcStudentFees(req.user.id, studentId);
    const populated = await Fee.findById(fee._id).populate('studentId', 'name parentName batchId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('createFee error:', err);
    res.status(500).json({ message: 'Failed to create fee' });
  }
};

const updateFee = async (req, res) => {
  try {
    const { amount, dueDate, status, description, paidDate, batchId } = req.body;
    const fee = await Fee.findOne({ _id: req.params.id, ...buildTenantFilter(req) });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    if (amount !== undefined) fee.amount = Number(amount);
    if (dueDate !== undefined) fee.dueDate = dueDate;
    if (status !== undefined) fee.status = status;
    if (description !== undefined) fee.description = description;
    if (batchId !== undefined) fee.batchId = batchId;
    if (paidDate !== undefined) fee.paidDate = paidDate;
    if (status === 'paid' && !fee.paidDate) fee.paidDate = new Date();
    await fee.save();
    await recalcStudentFees(req.user.id, fee.studentId);
    const populated = await Fee.findById(fee._id).populate('studentId', 'name parentName batchId');
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error('updateFee error:', err);
    res.status(500).json({ message: 'Failed to update fee' });
  }
};

const deleteFee = async (req, res) => {
  try {
    const fee = await Fee.findOneAndDelete({ _id: req.params.id, ...buildTenantFilter(req) });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    await recalcStudentFees(req.user.id, fee.studentId);
    res.json({ success: true, message: 'Fee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete fee' });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { feeId, amount, paidDate, notes } = req.body;
    const fee = await Fee.findOne({ _id: feeId, ...buildTenantFilter(req) });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    const payAmt = Number(amount) || Number(fee.amount);
    fee.status = 'paid';
    fee.paidDate = paidDate || new Date();
    if (notes !== undefined) fee.description = notes || fee.description;
    await fee.save();
    await recalcStudentFees(req.user.id, fee.studentId);
    const populated = await Fee.findById(fee._id).populate('studentId', 'name parentName batchId');
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error('recordPayment error:', err);
    res.status(500).json({ message: 'Failed to record payment' });
  }
};

const createInstallmentPlan = async (req, res) => {
  try {
    const { studentId, batchId, totalFee, installments } = req.body;
    if (!studentId || !totalFee || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({ message: 'studentId, totalFee and installments are required' });
    }
    const student = await Student.findOne({ _id: studentId, userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const sum = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    if (Math.round(sum * 100) !== Math.round(Number(totalFee) * 100)) {
      return res.status(400).json({ message: 'Installment amounts must equal total fee' });
    }
    const planId = new mongoose.Types.ObjectId();
    const docs = installments.map((inst, idx) => ({
      userId: req.user.id,
      studentId,
      batchId: batchId || student.batchId,
      amount: Number(inst.amount),
      dueDate: inst.dueDate ? new Date(inst.dueDate) : new Date(),
      status: 'pending',
      description: `Installment ${idx + 1} of ${installments.length}`,
      installmentNumber: idx + 1,
      installmentCount: installments.length,
      installmentPlanId: planId,
      paidAmount: 0,
    }));
    const created = await Fee.insertMany(docs);
    res.status(201).json({ success: true, data: { planId, installments: created } });
  } catch (err) {
    console.error('createInstallmentPlan error:', err);
    res.status(500).json({ message: 'Failed to create installment plan' });
  }
};

const getInstallmentPlan = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.studentId, userId: req.user.id }).select('name').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const fees = await Fee.find({ userId: req.user.id, studentId: req.params.studentId, installmentPlanId: { $ne: null } }).sort({ installmentNumber: 1 }).lean();
    if (!fees.length) return res.status(404).json({ message: 'No installment plan found' });
    const totalFee = fees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const totalPaid = fees.reduce((s, f) => s + (Number(f.paidAmount) || 0), 0);
    res.json({ success: true, data: {
      studentId: student._id,
      studentName: student.name,
      totalFee,
      totalPaid,
      remainingBalance: totalFee - totalPaid,
      installments: fees.map((f) => ({
        installmentNumber: f.installmentNumber,
        amount: f.amount,
        paidAmount: f.paidAmount || 0,
        remaining: (f.amount || 0) - (f.paidAmount || 0),
        dueDate: f.dueDate,
        status: f.status,
      })),
    } });
  } catch (err) { console.error('getInstallmentPlan error:', err); res.status(500).json({ message: 'Failed to fetch installment plan' }); }
};

const updateInstallmentPlan = async (req, res) => {
  try {
    const { studentId, installments } = req.body;
    if (!studentId || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({ message: 'studentId and installments are required' });
    }
    const student = await Student.findOne({ _id: studentId, userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const existing = await Fee.find({ userId: req.user.id, studentId, installmentPlanId: { $ne: null } });
    if (!existing.length) return res.status(404).json({ message: 'No installment plan found' });
    const sum = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const total = existing.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    if (Math.round(sum * 100) !== Math.round(total * 100)) {
      return res.status(400).json({ message: 'Installment amounts must equal total fee' });
    }
    // Update only unpaid installments' amounts/dueDates
    for (const inst of installments) {
      const fee = existing.find((f) => f.installmentNumber === inst.installmentNumber);
      if (!fee) continue;
      if (fee.status === 'paid') continue; // don't modify paid
      if (inst.amount !== undefined) fee.amount = Number(inst.amount);
      if (inst.dueDate) fee.dueDate = new Date(inst.dueDate);
      await fee.save();
    }
    const updated = await Fee.find({ userId: req.user.id, studentId, installmentPlanId: { $ne: null } }).sort({ installmentNumber: 1 });
    res.json({ success: true, data: updated });
  } catch (err) { console.error('updateInstallmentPlan error:', err); res.status(500).json({ message: 'Failed to update installment plan' }); }
};

const recordInstallmentPayment = async (req, res) => {
  try {
    const { feeId, amount, paidDate, method, reference } = req.body;
    if (!feeId || !amount || Number(amount) <= 0) return res.status(400).json({ message: 'feeId and positive amount required' });
    const fee = await Fee.findOne({ _id: feeId, ...buildTenantFilter(req) });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    const remaining = (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0);
    const payAmt = Number(amount);
    if (payAmt > remaining + 0.0001) return res.status(400).json({ message: 'Payment exceeds remaining balance' });
    fee.paidAmount = (Number(fee.paidAmount) || 0) + payAmt;
    fee.paidDate = paidDate ? new Date(paidDate) : new Date();
    if (fee.paidAmount >= (Number(fee.amount) || 0) - 0.0001) fee.status = 'paid';
    else fee.status = 'partial';
    if (method) fee.description = `${fee.description || ''} | ${method}${reference ? ' ' + reference : ''}`.trim();
    await fee.save();
    await recalcStudentFees(req.user.id, fee.studentId);
    res.json({ success: true, data: fee });
  } catch (err) { console.error('recordInstallmentPayment error:', err); res.status(500).json({ message: 'Failed to record installment payment' }); }
};

module.exports = { getFees, getFee, createFee, updateFee, deleteFee, recordPayment, createInstallmentPlan, getInstallmentPlan, updateInstallmentPlan, recordInstallmentPayment };