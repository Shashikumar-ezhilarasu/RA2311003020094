const express = require('express');
const router = express.Router();
const controller = require('../controllers/maintenanceController');

router.get('/', controller.getAll);
router.post('/', controller.scheduleMaintenance);
router.patch('/:id/complete', controller.markCompleted);

module.exports = router;
