const { Router } = require('express');
const rooms = require('../controllers/roomController');

const router = Router();

router.get('/', rooms.list);
router.post('/', rooms.create);
router.get('/:roomCode', rooms.getOne);
router.put('/:roomCode', rooms.replace);
router.patch('/:roomCode', rooms.update);
router.delete('/:roomCode', rooms.remove);

module.exports = router;
