const { Router } = require('express');
const slots = require('../controllers/slotController');

const router = Router();

router.get('/', slots.list);
router.post('/', slots.create);
router.get('/:id', slots.getOne);

module.exports = router;
