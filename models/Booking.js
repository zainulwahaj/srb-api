const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  },
  { timestamps: { createdAt: 'bookedAt', updatedAt: false } },
);

// The database itself refuses a second booking of the same slot by the same student
bookingSchema.index({ student: 1, slot: 1 }, { unique: true });
bookingSchema.index({ slot: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
