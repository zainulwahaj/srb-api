const mongoose = require('mongoose');
const { isValidDate } = require('../utils/validate');

const START_HOURS = [8, 10, 12, 14, 16];

const slotSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: [true, 'roomCode is required'], uppercase: true, trim: true },
    // Kept as "YYYY-MM-DD" text so filtering by ?date= is a plain equality match
    // and there are no time zone surprises.
    date: {
      type: String,
      required: [true, 'date is required'],
      validate: { validator: isValidDate, message: 'date must be a real date in YYYY-MM-DD format' },
    },
    startHour: {
      type: Number,
      required: [true, 'startHour is required'],
      enum: { values: START_HOURS, message: 'startHour must be one of 8, 10, 12, 14 or 16' },
    },
    seats: { type: Number, required: true, min: 1 },
    booked: {
      type: Number,
      default: 0,
      min: [0, 'booked cannot be negative'],
      validate: {
        validator(v) { return v <= this.seats; },
        message: 'booked cannot be more than seats',
      },
    },
  },
  { timestamps: true },
);

// One slot per room, day and start hour
slotSchema.index({ roomCode: 1, date: 1, startHour: 1 }, { unique: true });

slotSchema.virtual('seatsLeft').get(function seatsLeft() {
  return this.seats - this.booked;
});

slotSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Slot', slotSchema);
module.exports.START_HOURS = START_HOURS;
