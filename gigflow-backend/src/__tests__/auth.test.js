const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

describe('Auth Middleware', () => {
  const mockReq = (token) => ({
    headers: { authorization: token ? `Bearer ${token}` : undefined },
  });
  const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('rejects requests without token', () => {
    const req = mockReq(null);
    const res = mockRes();
    authMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens', () => {
    const req = mockReq('invalid-token');
    const res = mockRes();
    authMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('sets req.user for valid tokens', () => {
    const token = jwt.sign({ id: 'user-1', email: 'test@test.com', role: 'worker' }, 'test-secret');
    const req = mockReq(token);
    const res = mockRes();
    authMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
    expect(req.user.role).toBe('worker');
  });
});

describe('requireRole Middleware', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };
  const mockNext = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated users', () => {
    const req = {};
    const res = mockRes();
    requireRole('employer')(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects wrong role', () => {
    const req = { user: { id: 'u1', role: 'worker' } };
    const res = mockRes();
    requireRole('employer')(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows correct role', () => {
    const req = { user: { id: 'u1', role: 'employer' } };
    const res = mockRes();
    requireRole('employer')(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('allows multiple roles', () => {
    const req = { user: { id: 'u1', role: 'worker' } };
    const res = mockRes();
    requireRole('worker', 'employer')(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
