const pool = require('../config/db');
const bidsController = require('../controllers/bids');

// Mock pool
jest.mock('../config/db', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    query: jest.fn(),
    connect: jest.fn(() => Promise.resolve(mockClient)),
    _mockClient: mockClient,
  };
});

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  user: { id: 'user-1', role: 'worker', name: 'Test User' },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('Bids Controller', () => {
  describe('getBidsForGig', () => {
    it('returns 404 if gig not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const req = mockReq({ params: { gigId: 999 } });
      const res = mockRes();
      await bidsController.getBidsForGig(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 if user is not gig owner', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ created_by: 'other-user' }] });
      const req = mockReq({ params: { gigId: 1 } });
      const res = mockRes();
      await bidsController.getBidsForGig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns bids if user is owner', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'user-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, amount: 5000 }] });
      const req = mockReq({ params: { gigId: 1 } });
      const res = mockRes();
      await bidsController.getBidsForGig(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1, amount: 5000 }]);
    });
  });

  describe('createBid', () => {
    it('rejects employer bids', async () => {
      const req = mockReq({ user: { id: 'u1', role: 'employer' }, body: { gigId: 1 } });
      const res = mockRes();
      await bidsController.createBid(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('prevents self-bidding', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, created_by: 'user-1', status: 'open' }] });
      const req = mockReq({ body: { gigId: 1, amount: 1000, message: 'test' } });
      const res = mockRes();
      await bidsController.createBid(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('own gig') }));
    });

    it('prevents duplicate bids', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, created_by: 'other', status: 'open' }] })
        .mockResolvedValueOnce({ rows: [{ id: 5, status: 'pending' }] });
      const req = mockReq({ body: { gigId: 1, amount: 1000, message: 'test' } });
      const res = mockRes();
      await bidsController.createBid(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates bid and notifies employer', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Job', created_by: 'emp-1', status: 'open' }] })
        .mockResolvedValueOnce({ rows: [] }) // no existing bid
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // INSERT
        .mockResolvedValueOnce({}) // update total_bids
        .mockResolvedValueOnce({}); // notification
      const req = mockReq({ body: { gigId: 1, amount: 5000, message: 'I can do this' } });
      const res = mockRes();
      await bidsController.createBid(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ bidId: 10 }));
    });
  });

  describe('withdrawBid', () => {
    it('only allows withdrawing pending bids', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, gig_id: 5, status: 'accepted' }] });
      const req = mockReq({ params: { bidId: 1 } });
      const res = mockRes();
      await bidsController.withdrawBid(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('decrements total_bids on withdrawal', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, gig_id: 5, status: 'pending' }] })
        .mockResolvedValueOnce({}) // update bid status
        .mockResolvedValueOnce({}); // decrement total_bids
      const req = mockReq({ params: { bidId: 1 } });
      const res = mockRes();
      await bidsController.withdrawBid(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('withdrawn') }));
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST(total_bids - 1'),
        [5]
      );
    });
  });

  describe('acceptBid', () => {
    it('rejects non-owners', async () => {
      const client = pool._mockClient;
      client.query.mockResolvedValueOnce({
        rows: [{ id: 1, bidder_id: 'w1', created_by: 'other-emp', status: 'pending', gig_status: 'open', gig_title: 'Job' }]
      });
      const req = mockReq({ params: { bidId: 1 }, user: { id: 'user-1', role: 'employer' } });
      const res = mockRes();
      await bidsController.acceptBid(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects already-accepted bids', async () => {
      const client = pool._mockClient;
      client.query.mockResolvedValueOnce({
        rows: [{ id: 1, bidder_id: 'w1', created_by: 'user-1', status: 'accepted', gig_status: 'open', gig_title: 'Job' }]
      });
      const req = mockReq({ params: { bidId: 1 }, user: { id: 'user-1', role: 'employer' } });
      const res = mockRes();
      await bidsController.acceptBid(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateBid', () => {
    it('only allows editing pending bids', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'accepted' }] });
      const req = mockReq({ params: { bidId: 1 }, body: { amount: 6000 } });
      const res = mockRes();
      await bidsController.updateBid(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates bid successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] })
        .mockResolvedValueOnce({});
      const req = mockReq({ params: { bidId: 1 }, body: { amount: 6000, message: 'updated' } });
      const res = mockRes();
      await bidsController.updateBid(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('updated') }));
    });
  });
});
