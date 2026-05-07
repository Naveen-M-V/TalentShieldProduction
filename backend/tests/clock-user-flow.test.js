const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  asyncHandler: (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  },
  authenticateSession: (req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'employee' };
    req.actorId = req.user._id;
    next();
  }
}));

jest.mock('../utils/shiftTimeLinker', () => ({
  findMatchingShift: jest.fn().mockResolvedValue(null),
  validateClockIn: jest.fn().mockReturnValue({ status: 'On Time', message: 'On time' }),
  calculateHoursWorked: jest.fn().mockReturnValue(8),
  calculateScheduledHours: jest.fn().mockReturnValue(8),
  updateShiftStatus: jest.fn().mockResolvedValue(null)
}));

jest.mock('../utils/identityHelper', () => ({
  resolveActorId: (req) => req.actorId || req.user?._id || null
}));

jest.mock('../models/Notification', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'notif-1' })
}));

// Lightweight mocks for models imported at top of clockRoutes
jest.mock('../models/User', () => ({}));
jest.mock('../models/EmployeesHub', () => ({}));
jest.mock('../models/LeaveRecord', () => ({}));
jest.mock('../models/AnnualLeaveBalance', () => ({}));
jest.mock('../models/Expense', () => ({}));
jest.mock('../models/LeaveRequest', () => ({}));
jest.mock('../services/employeeService', () => ({}));

const mockSave = jest.fn();

const mockTimeEntry = jest.fn().mockImplementation(function TimeEntry(data) {
  Object.assign(this, data);
  this._id = 'time-entry-1';
  this.save = mockSave.mockResolvedValue(this);
});

mockTimeEntry.findOne = jest.fn();

jest.mock('../models/TimeEntry', () => mockTimeEntry);

const TimeEntry = require('../models/TimeEntry');
const clockRoutes = require('../routes/clockRoutes');

describe('Clock user flow routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/clock', clockRoutes);
  });

  test('POST /api/clock/user/in uses hyphen statuses and saves clocked-in entry', async () => {
    TimeEntry.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/clock/user/in')
      .send({ workType: 'Regular', location: 'Work From Office' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Active-entry check must use schema-compatible statuses
    expect(TimeEntry.findOne).toHaveBeenCalledWith(expect.objectContaining({
      status: { $in: ['clocked-in', 'on-break'] }
    }));

    // Newly created entry must use schema-compatible status
    expect(TimeEntry).toHaveBeenCalledWith(expect.objectContaining({
      status: 'clocked-in'
    }));
  });

  test('POST /api/clock/user/out queries active entry with hyphen statuses', async () => {
    const activeEntry = {
      _id: 'time-entry-2',
      clockIn: new Date(),
      breaks: [],
      save: jest.fn().mockResolvedValue(true),
      shiftId: null,
      variance: 0
    };

    TimeEntry.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(activeEntry)
    });

    const res = await request(app)
      .post('/api/clock/user/out')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(TimeEntry.findOne).toHaveBeenCalledWith(expect.objectContaining({
      status: { $in: ['clocked-in', 'on-break'] }
    }));
  });
});
