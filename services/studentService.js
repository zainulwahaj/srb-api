const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { requireObject } = require('../utils/validate');

async function createStudent(body) {
  requireObject(body);
  const { regNo, name, email } = body;

  if (typeof regNo === 'string' && await Student.exists({ regNo: regNo.trim().toUpperCase() })) {
    throw ApiError.conflict(`Student ${regNo.trim().toUpperCase()} already exists`, 'STUDENT_EXISTS');
  }
  return Student.create({ regNo, name, email });
}

async function getStudent(regNo) {
  const student = await Student.findOne({ regNo: String(regNo).trim().toUpperCase() });
  if (!student) throw ApiError.notFound(`Student ${regNo} not found`, 'STUDENT_NOT_FOUND');
  return student;
}

module.exports = { createStudent, getStudent };
