const Room = require('../models/Room');
const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const { checkObjectId, isValidDate, positiveInt, requireObject } = require('../utils/validate');

async function createSlot(body) {
  requireObject(body);
  const { roomCode, date, startHour } = body;
  if (typeof roomCode !== 'string' || !roomCode.trim()) {
    throw ApiError.unprocessable('roomCode is required', 'VALIDATION_ERROR');
  }

  const room = await Room.findOne({ roomCode: roomCode.trim().toUpperCase() });
  if (!room) throw ApiError.notFound(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND');

  if (await Slot.exists({ roomCode: room.roomCode, date, startHour })) {
    throw ApiError.conflict(`${room.roomCode} already has a slot on ${date} at ${startHour}:00`, 'SLOT_EXISTS');
  }

  // seats is copied from the room now; changing the room later does not touch old slots
  return Slot.create({ roomCode: room.roomCode, date, startHour, seats: room.seats, booked: 0 });
}

async function getSlot(id) {
  checkObjectId(id, 'slot id');
  const slot = await Slot.findById(id);
  if (!slot) throw ApiError.notFound('Slot not found', 'SLOT_NOT_FOUND');
  return slot;
}

function buildFilter({ roomCode, date, hasSeats } = {}) {
  const filter = {};
  if (roomCode !== undefined) filter.roomCode = String(roomCode).trim().toUpperCase();
  if (date !== undefined) {
    if (!isValidDate(date)) throw ApiError.badRequest('date must be in YYYY-MM-DD format');
    filter.date = date;
  }
  if (hasSeats !== undefined) {
    if (hasSeats === 'true' || hasSeats === true) filter.$expr = { $lt: ['$booked', '$seats'] };
    else if (hasSeats === 'false' || hasSeats === false) filter.$expr = { $gte: ['$booked', '$seats'] };
    else throw ApiError.badRequest('hasSeats must be true or false');
  }
  return filter;
}

// GET /api/v1/slots?roomCode=ROOM-01&date=2026-11-02&hasSeats=true&page=1&limit=10
async function listSlots(query = {}) {
  const filter = buildFilter(query);
  const page = positiveInt(query.page, 'page', 1);
  const limit = positiveInt(query.limit, 'limit', 10, 100);

  const [data, total] = await Promise.all([
    Slot.find(filter).sort({ date: 1, startHour: 1, roomCode: 1 }).skip((page - 1) * limit).limit(limit),
    Slot.countDocuments(filter),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

// No paging: used by GraphQL and the live board, which show a whole room or day.
async function findSlots(filters = {}) {
  return Slot.find(buildFilter(filters)).sort({ date: 1, startHour: 1, roomCode: 1 });
}

module.exports = { createSlot, getSlot, listSlots, findSlots };
