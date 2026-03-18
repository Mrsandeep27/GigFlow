const pool = require('../config/db');
const appController = require('../controllers/applications');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  user: { id: 'user-1', role: 'worker' },
  ...overrides,
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('Applications Controller', () => {
  describe('apply', () => {
    it('rejects employer applications', async () => {
      const req = mockReq({ user: { id: 'u1', role: 'employer' }, body: { gig_id: 1 } });
      const res = mockRes();
      await appController.apply(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('prevents applying to own job', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Job', created_by: 'user-1', status: 'open', is_fake_flagged: false }] });
      const req = mockReq({ body: { gig_id: 1 } });
      const res = mockRes();
      await appController.apply(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('prevents applying to closed jobs', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Job', created_by: 'other', status: 'closed', is_fake_flagged: false }] });
      const req = mockReq({ body: { gig_id: 1 } });
      const res = mockRes();
      await appController.apply(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('prevents duplicate applications', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Job', created_by: 'other', status: 'open', is_fake_flagged: false }] })
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }); // existing application
      const req = mockReq({ body: { gig_id: 1 } });
      const res = mockRes();
      await appController.apply(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateStatus', () => {
    it('enforces status machine — rejects rejected to shortlisted', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, status: 'rejected', gig_id: 10, created_by: 'user-1',
          gig_title: 'Job', applicant_id: 'w1', applicant_name: 'Worker',
        }],
      });
      const req = mockReq({
        params: { id: 1 },
        body: { status: 'shortlisted' },
        user: { id: 'user-1', role: 'employer' },
      });
      const res = mockRes();
      await appController.updateStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("Cannot change status from 'rejected' to 'shortlisted'"),
      }));
    });

    it('allows valid transition — applied to viewed', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, status: 'applied', gig_id: 10, created_by: 'user-1',
            gig_title: 'Job', applicant_id: 'w1', applicant_name: 'Worker',
          }],
        })
        .mockResolvedValueOnce({}) // update
        .mockResolvedValueOnce({}); // notification
      const req = mockReq({
        params: { id: 1 },
        body: { status: 'viewed' },
        user: { id: 'user-1', role: 'employer' },
      });
      const res = mockRes();
      await appController.updateStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Status updated' }));
    });

    it('allows shortlisted to offer', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, status: 'shortlisted', gig_id: 10, created_by: 'user-1',
            gig_title: 'Job', applicant_id: 'w1', applicant_name: 'Worker',
          }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      const req = mockReq({
        params: { id: 1 },
        body: { status: 'offer' },
        user: { id: 'user-1', role: 'employer' },
      });
      const res = mockRes();
      await appController.updateStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Status updated' }));
    });
  });
});
