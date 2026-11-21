const express = require('express');
const router = express.Router();
const feesCtrl = require('../controllers/feesController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);
router.get('/', feesCtrl.getFees);
router.get('/installment-plan/:studentId', feesCtrl.getInstallmentPlan);
router.put('/installment-plan/:studentId', feesCtrl.updateInstallmentPlan);
router.post('/', feesCtrl.createFee);
router.put('/:id', feesCtrl.updateFee);
router.delete('/:id', feesCtrl.deleteFee);
router.post('/payments', feesCtrl.recordPayment);
router.post('/installment-payment', feesCtrl.recordInstallmentPayment);
router.post('/installment-plan', feesCtrl.createInstallmentPlan);

module.exports = router;