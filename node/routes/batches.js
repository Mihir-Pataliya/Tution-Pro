const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');

router.use(requireAuth, requireOwner);

// GET /api/batches - Get all batches
router.get('/', batchController.getAllBatches);

// POST /api/batches - Create a new batch
router.post('/', batchController.createBatch);

// PUT /api/batches/:id - Update a batch
router.put('/:id', batchController.updateBatch);

// DELETE /api/batches/:id - Delete a batch
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
