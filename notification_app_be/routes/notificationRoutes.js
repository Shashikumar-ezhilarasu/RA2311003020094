const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

router.get('/stream', controller.stream);
router.get('/priority-inbox', controller.getPriorityInbox);

router.get('/', controller.getAll);
router.post('/', controller.createNotif);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.deleteNotif);

module.exports = router;
