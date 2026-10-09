const express = require('express');
const ctrl = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // every application route requires login

router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').get(ctrl.getOne).put(ctrl.update).delete(ctrl.remove);

module.exports = router;
