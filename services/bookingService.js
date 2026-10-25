const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const { checkObjectId } = require('../utils/validate');
const studentService = require('./studentService');
const realtime = require('../sockets/realtime');

// Used by both REST and GraphQL, so the booking rules live only here.

async function bookingView(slot, bookedAt) {
  const room = await Room.findOne({ roomCode: slot.roomCode });
  return {
    slotId: String(slot._id),
    roomCode: slot.roomCode,
    roomName: room ? room.name : null,
    building: room ? room.building : null,
    date: slot.date,
    startHour: slot.startHour,
    seatsLeft: slot.seats - slot.booked,
    bookedAt,
  };
}

async function bookSlot(regNo, slotId) {
  if (slotId === undefined || slotId === null || slotId === '') {
    throw ApiError.badRequest('slotId is required');
  }
  checkObjectId(slotId, 'slotId');

  const student = await studentService.getStudent(regNo);
  if (!await Slot.exists({ _id: slotId })) throw ApiError.notFound('Slot not found', 'SLOT_NOT_FOUND');

  if (await Booking.exists({ student: student._id, slot: slotId })) {
    throw ApiError.conflict('You have already booked this slot', 'ALREADY_BOOKED');
  }

  // One atomic update: booked only goes up if there is still a free seat.
  // If two students race for the last seat, MongoDB lets exactly one of these through.
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $lt: ['$booked', '$seats'] } },
    { $inc: { booked: 1 } },
    { returnDocument: 'after' },
  );
  if (!slot) throw ApiError.conflict('This slot is already full', 'SLOT_FULL');

  let booking;
  try {
    booking = await Booking.create({ student: student._id, slot: slot._id });
  } catch (err) {
    // We took a seat but could not save the booking (for example the same
    // student sent two requests at once), so give the seat back.
    const restored = await Slot.findByIdAndUpdate(slot._id, { $inc: { booked: -1 } }, { returnDocument: 'after' });
    realtime.slotUpdated(restored);
    if (err.code === 11000) throw ApiError.conflict('You have already booked this slot', 'ALREADY_BOOKED');
    throw err;
  }

  realtime.slotUpdated(slot);
  return bookingView(slot, booking.bookedAt);
}

async function cancelBooking(regNo, slotId) {
  checkObjectId(slotId, 'slotId');
  const student = await studentService.getStudent(regNo);

  const booking = await Booking.findOneAndDelete({ student: student._id, slot: slotId });
  if (!booking) throw ApiError.notFound('This student has no booking for that slot', 'BOOKING_NOT_FOUND');

  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, booked: { $gt: 0 } },
    { $inc: { booked: -1 } },
    { returnDocument: 'after' },
  );
  realtime.slotUpdated(slot);
}

// Every booking of one student with the room name, date and start hour.
async function listBookings(regNo) {
  const student = await studentService.getStudent(regNo);

  const rows = await Booking.aggregate([
    { $match: { student: student._id } },
    { $lookup: { from: Slot.collection.name, localField: 'slot', foreignField: '_id', as: 'slot' } },
    { $unwind: '$slot' },
    { $lookup: { from: Room.collection.name, localField: 'slot.roomCode', foreignField: 'roomCode', as: 'room' } },
    { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
    { $sort: { 'slot.date': 1, 'slot.startHour': 1 } },
    {
      $project: {
        _id: 0,
        slotId: { $toString: '$slot._id' },
        roomCode: '$slot.roomCode',
        roomName: '$room.name',
        building: '$room.building',
        date: '$slot.date',
        startHour: '$slot.startHour',
        bookedAt: 1,
      },
    },
  ]);
  return rows;
}

module.exports = { bookSlot, cancelBooking, listBookings };
