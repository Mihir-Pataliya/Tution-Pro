const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');
const enquiriesController = require('../controllers/enquiriesController');

const router = express.Router();
router.use(requireAuth, requireOwner);
router.get('/', enquiriesController.list);
router.post('/', enquiriesController.create);
router.put('/:id', enquiriesController.update);
router.post('/:id/convert', enquiriesController.convert);
router.delete('/:id', enquiriesController.remove);

module.exports = router;
