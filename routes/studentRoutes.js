const { Router } = require('express');
const students = require('../controllers/studentController');
const bookings = require('../controllers/bookingController');

const router = Router();

router.post('/', students.create);
router.get('/:regNo', students.getOne);

router.get('/:regNo/bookings', bookings.list);
router.post('/:regNo/bookings', bookings.create);
router.delete('/:regNo/bookings/:slotId', bookings.remove);

module.exports = router;
