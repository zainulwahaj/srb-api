// Thin layer over the same services the REST controllers use.
const roomService = require('../services/roomService');
const slotService = require('../services/slotService');
const studentService = require('../services/studentService');
const bookingService = require('../services/bookingService');
const ApiError = require('../utils/ApiError');

const resolvers = {
  Query: {
    rooms: () => roomService.listRooms(),
    slots: (_, { roomCode, date }) => slotService.findSlots({ roomCode, date }),
    // A missing student is just null here instead of an error
    student: async (_, { regNo }) => {
      try {
        return await studentService.getStudent(regNo);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  },

  Mutation: {
    bookSlot: (_, { regNo, slotId }) => bookingService.bookSlot(regNo, slotId),
    cancelBooking: async (_, { regNo, slotId }) => {
      await bookingService.cancelBooking(regNo, slotId);
      return true;
    },
  },

  Slot: {
    id: (slot) => String(slot._id),
    seatsLeft: (slot) => slot.seats - slot.booked,
    roomName: async (slot) => {
      const room = await roomService.getRoom(slot.roomCode).catch(() => null);
      return room ? room.name : null;
    },
  },

  Booking: {
    bookedAt: (b) => (b.bookedAt ? new Date(b.bookedAt).toISOString() : null),
  },

  Student: {
    bookings: (student) => bookingService.listBookings(student.regNo),
  },
};

module.exports = resolvers;
