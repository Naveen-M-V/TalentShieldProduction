/**
 * Tests for Ported Leave Endpoints using mocked models.
 */

jest.mock('../models/AnnualLeaveBalance', () => {
  const MockBalance = jest.fn(function MockBalance(data) {
    Object.assign(this, data);
    this._id = this._id || 'balance-id';
    this.adjustments = this.adjustments || [];
    this.save = jest.fn().mockResolvedValue(this);
  });

  MockBalance.findOneAndUpdate = jest.fn();
  MockBalance.find = jest.fn();
  MockBalance.findOne = jest.fn();
  MockBalance.findById = jest.fn();
  MockBalance.recalculateUsedDays = jest.fn();

  return MockBalance;
});

jest.mock('../models/LeaveRecord', () => ({
  findById: jest.fn()
}));

jest.mock('../models/EmployeesHub', () => ({
  findOne: jest.fn()
}));

const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const LeaveRecord = require('../models/LeaveRecord');
const EmployeeHub = require('../models/EmployeesHub');
const controller = require('../controllers/unifiedLeaveController');

function createResponse() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.status = jest.fn(code => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn(payload => {
    res.body = payload;
    return res;
  });
  res.setHeader = jest.fn((name, value) => {
    res.headers[name.toLowerCase()] = value;
  });
  res.send = jest.fn(payload => {
    res.text = payload;
    return res;
  });
  return res;
}

describe('Ported Leave Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/leave/balances/upload', () => {
    test('uploads balances', async () => {
      EmployeeHub.findOne.mockResolvedValue({ _id: 'emp-1' });
      AnnualLeaveBalance.findOneAndUpdate.mockResolvedValue({ _id: 'bal-1' });

      const req = {
        body: {
          balances: [{
            identifier: 'person@test.com',
            leaveYearStart: '2026-04-01',
            leaveYearEnd: '2027-03-31',
            entitlementDays: 30,
            carryOverDays: 5
          }]
        }
      };
      const res = createResponse();

      await controller.uploadLeaveBalances(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ total: 1 })
      }));
      expect(EmployeeHub.findOne).toHaveBeenCalledWith({ email: 'person@test.com' });
    });

    test('rejects empty request', async () => {
      const req = { body: {} };
      const res = createResponse();

      await controller.uploadLeaveBalances(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('handles invalid identifiers', async () => {
      const req = { body: { balances: [{ identifier: 'bad-id' }] } };
      const res = createResponse();

      await controller.uploadLeaveBalances(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          failed: [expect.objectContaining({ reason: expect.stringMatching(/Invalid identifier/) })]
        })
      }));
    });
  });

  describe('GET /api/leave/balances/export', () => {
    test('exports to CSV', async () => {
      AnnualLeaveBalance.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            {
              user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', vtid: 'VT001', department: 'HR' },
              leaveYearStart: new Date('2026-04-01'),
              leaveYearEnd: new Date('2027-03-31'),
              entitlementDays: 28,
              carryOverDays: 5,
              adjustments: [{ days: 2 }],
              usedDays: 10,
              remainingDays: 23
            }
          ])
        })
      });

      const req = {};
      const res = createResponse();

      await controller.exportLeaveBalances(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="leave-balances.csv"');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Alice Smith'));
    });
  });

  describe('PUT /api/leave/records/:id', () => {
    test('updates to approved', async () => {
      const record = {
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined)
      };
      LeaveRecord.findById
        .mockResolvedValueOnce(record)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue({ _id: 'record-1', status: 'approved' })
            })
          })
        });

      const req = { params: { id: 'record-1' }, body: { status: 'approved' }, actorId: 'actor-1' };
      const res = createResponse();

      await controller.updateLeaveRecord(req, res);

      expect(record.status).toBe('approved');
      expect(record.approvedBy).toBe('actor-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('returns 404 for missing', async () => {
      LeaveRecord.findById.mockResolvedValueOnce(null);

      const req = { params: { id: 'missing' }, body: {} };
      const res = createResponse();

      await controller.updateLeaveRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('PUT leave balance :userId', () => {
    test('updates days', async () => {
      const balance = new AnnualLeaveBalance({
        _id: 'bal-1',
        user: 'user-1',
        leaveYearStart: new Date('2026-04-01'),
        leaveYearEnd: new Date('2027-03-31'),
        entitlementDays: 28,
        carryOverDays: 0,
        usedDays: 0,
        remainingDays: 28,
        adjustments: []
      });
      balance.save = jest.fn().mockResolvedValue(balance);

      AnnualLeaveBalance.findOne.mockResolvedValue(balance);
      AnnualLeaveBalance.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(balance) });

      const req = { params: { userId: 'user-1' }, body: { totalDays: 32 }, actorId: 'actor-1' };
      const res = createResponse();

      await controller.updateLeaveBalanceWithValidation(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ entitlementDays: 32 })
      }));
    });

    test('rejects > 60', async () => {
      const req = { params: { userId: 'user-1' }, body: { totalDays: 70 } };
      const res = createResponse();

      await controller.updateLeaveBalanceWithValidation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/between 0 and 60/)
      }));
    });

    test('creates balance (enhanced)', async () => {
      AnnualLeaveBalance.findOne.mockResolvedValue(null);
      AnnualLeaveBalance.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'new-bal', entitlementDays: 25, carryOverDays: 3 })
      });

      const req = { params: { userId: 'user-2' }, body: { entitlementDays: 25, carryOverDays: 3, reason: 'Init' }, actorId: 'actor-2' };
      const res = createResponse();

      await controller.updateLeaveBalanceWithValidation(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ entitlementDays: 25, carryOverDays: 3 })
      }));
    });

    test('404 if missing (legacy)', async () => {
      AnnualLeaveBalance.findOne.mockResolvedValue(null);

      const req = { params: { userId: 'user-3' }, body: { totalDays: 28 } };
      const res = createResponse();

      await controller.updateLeaveBalanceWithValidation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
