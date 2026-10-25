// Fills the database with sample data: 3 rooms, 11 slots, 3 students and
// 2 bookings that make one slot full (handy for testing SLOT_FULL).
// Run with: npm run seed   (it clears the four collections first)
const mongoose = require('mongoose');
const env = require('../config/env');
const Room = require('../models/Room');
const Slot = require('../models/Slot');
const Student = require('../models/Student');
const Booking = require('../models/Booking');

const rooms = [
  { roomCode: 'ROOM-01', name: 'Quiet Study Room', building: 'Library Block', seats: 4 },
  { roomCode: 'ROOM-02', name: 'Group Discussion Room', building: 'Academic Block 2', seats: 6 },
  { roomCode: 'ROOM-03', name: 'Study Pod', building: 'CS Department', seats: 2 },
];

const slotPlan = [
  ['ROOM-01', '2026-11-02', [8, 10, 12, 14, 16]],
  ['ROOM-01', '2026-11-03', [10]],
  ['ROOM-02', '2026-11-02', [10, 14]],
  ['ROOM-02', '2026-11-03', [12]],
  ['ROOM-03', '2026-11-03', [8, 16]],
];

const students = [
  { regNo: 'FA23-BAI-058', name: 'Zain Ul Wahaj', email: 'fa23-bai-058@students.example.edu' },
  { regNo: 'FA23-BCS-045', name: 'Ali Raza', email: 'fa23-bcs-045@students.example.edu' },
  { regNo: 'FA23-BSE-112', name: 'Hira Khan', email: 'fa23-bse-112@students.example.edu' },
];

async function seed() {
  await mongoose.connect(env.mongoUrl);
  await Promise.all([Room, Slot, Student, Booking].map((m) => m.deleteMany({})));
  await Promise.all([Room, Slot, Student, Booking].map((m) => m.init()));

  const roomDocs = await Room.insertMany(rooms);
  const seatsOf = Object.fromEntries(roomDocs.map((r) => [r.roomCode, r.seats]));

  const slots = [];
  for (const [roomCode, date, hours] of slotPlan) {
    for (const startHour of hours) slots.push({ roomCode, date, startHour, seats: seatsOf[roomCode], booked: 0 });
  }
  const slotDocs = await Slot.insertMany(slots);
  const studentDocs = await Student.insertMany(students);

  // Fill the 8:00 Study Pod slot completely (2 of 2 seats)
  const pod = slotDocs.find((s) => s.roomCode === 'ROOM-03' && s.startHour === 8);
  const ali = studentDocs.find((s) => s.regNo === 'FA23-BCS-045');
  const hira = studentDocs.find((s) => s.regNo === 'FA23-BSE-112');
  await Booking.insertMany([{ student: ali._id, slot: pod._id }, { student: hira._id, slot: pod._id }]);
  await Slot.updateOne({ _id: pod._id }, { $set: { booked: 2 } });

  console.log(`Inserted ${roomDocs.length} rooms, ${slotDocs.length} slots, ${studentDocs.length} students, 2 bookings`);
  console.log(`Full slot (for the SLOT_FULL test): ${pod._id}  ROOM-03 2026-11-03 08:00`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
