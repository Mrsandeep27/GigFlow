const pool = require('../config/db');
const reviewsController = require('../controllers/reviews');

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

describe('Reviews Controller', () => {
  describe('createReview', () => {
    it('rejects self-review', async () => {
      const req = mockReq({ body: { gig_id: 1, reviewed_id: 'user-1', rating: 5 } });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('yourself') }));
    });

    it('rejects invalid rating', async () => {
      const req = mockReq({ body: { gig_id: 1, reviewed_id: 'user-2', rating: 6 } });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects rating of 0', async () => {
      const req = mockReq({ body: { gig_id: 1, reviewed_id: 'user-2', rating: 0 } });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('verifies gig exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // gig not found
      const req = mockReq({ body: { gig_id: 999, reviewed_id: 'user-2', rating: 4 } });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('verifies reviewer participated in gig', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, created_by: 'emp-1', assigned_to: 'worker-2', status: 'completed' }] }) // gig
        .mockResolvedValueOnce({ rows: [] }); // no participation
      const req = mockReq({ body: { gig_id: 1, reviewed_id: 'emp-1', rating: 4 } });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows employer to review assigned worker', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, created_by: 'user-1', assigned_to: 'worker-1', status: 'completed' }] }) // gig
        .mockResolvedValueOnce({ rows: [] }) // no existing review
        .mockResolvedValueOnce({}) // insert review
        .mockResolvedValueOnce({ rows: [{ avg_rating: '4.50', total: '2' }] }) // recalculate
        .mockResolvedValueOnce({}); // update user
      const req = mockReq({
        body: { gig_id: 1, reviewed_id: 'worker-1', rating: 5, comment: 'Great work' },
        user: { id: 'user-1', role: 'employer' },
      });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      // Verify rating recalculation was called
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AVG(rating)'),
        ['worker-1']
      );
    });

    it('prevents duplicate reviews', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, created_by: 'user-1', assigned_to: 'worker-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }); // existing review
      const req = mockReq({
        body: { gig_id: 1, reviewed_id: 'worker-1', rating: 4 },
        user: { id: 'user-1', role: 'employer' },
      });
      const res = mockRes();
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('already') }));
    });
  });
});
