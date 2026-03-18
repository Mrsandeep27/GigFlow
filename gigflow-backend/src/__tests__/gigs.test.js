const pool = require('../config/db');
const gigsController = require('../controllers/gigs');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: { id: 'user-1', role: 'employer' },
  ...overrides,
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('Gigs Controller', () => {
  describe('createGig', () => {
    it('rejects workers from posting', async () => {
      const req = mockReq({ user: { id: 'u1', role: 'worker' }, body: { title: 'Test', description: 'Desc' } });
      const res = mockRes();
      await gigsController.createGig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('creates gig for employer', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 42 }] });
      const req = mockReq({ body: { title: 'New Job', description: 'Details here' } });
      const res = mockRes();
      await gigsController.createGig(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ gigId: 42 }));
    });
  });

  describe('updateGig', () => {
    it('rejects non-owners', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ created_by: 'other-user', current_status: 'open' }] });
      const req = mockReq({ params: { id: 1 }, body: { title: 'Updated' } });
      const res = mockRes();
      await gigsController.updateGig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('enforces status transitions — rejects completed to open', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ created_by: 'user-1', current_status: 'completed' }] });
      const req = mockReq({ params: { id: 1 }, body: { status: 'open' } });
      const res = mockRes();
      await gigsController.updateGig(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("Cannot change status from 'completed' to 'open'"),
      }));
    });

    it('allows valid status transition — open to closed', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'user-1', current_status: 'open' }] })
        .mockResolvedValueOnce({});
      const req = mockReq({ params: { id: 1 }, body: { status: 'closed' } });
      const res = mockRes();
      await gigsController.updateGig(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('updated') }));
    });

    it('rejects budget where min > max', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ created_by: 'user-1', current_status: 'open' }] });
      const req = mockReq({ params: { id: 1 }, body: { budget_min: 10000, budget_max: 5000 } });
      const res = mockRes();
      await gigsController.updateGig(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('budget') }));
    });
  });

  describe('deleteGig', () => {
    it('rejects non-owners', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ created_by: 'other-user' }] });
      const req = mockReq({ params: { id: 1 } });
      const res = mockRes();
      await gigsController.deleteGig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getGigById', () => {
    it('returns 404 if not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { id: 999 } });
      const res = mockRes();
      await gigsController.getGigById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns gig data', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Job' }] });
      const req = mockReq({ params: { id: 1 } });
      const res = mockRes();
      await gigsController.getGigById(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 1, title: 'Test Job' });
    });
  });
});
