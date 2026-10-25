const studentService = require('../services/studentService');

async function create(req, res) {
  const student = await studentService.createStudent(req.body);
  res.status(201).location(`/api/v1/students/${student.regNo}`).json(student);
}

async function getOne(req, res) {
  res.json(await studentService.getStudent(req.params.regNo));
}

module.exports = { create, getOne };
