const { requireAuth } = require('../../api-service/src/middleware/auth');
const { UnauthorizedError } = require('../../api-service/src/utils/errors');

describe('Unit Tests: Auth Middleware (X-User-ID)', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      headers: {},
      header: function (name) {
        return this.headers[name.toLowerCase()] || this.headers[name];
      }
    };
    mockRes = {};
    nextFn = jest.fn();
  });

  test('should return 401 Unauthorized when X-User-ID header is missing', () => {
    requireAuth(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    const errorArg = nextFn.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(UnauthorizedError);
    expect(errorArg.statusCode).toBe(401);
    expect(errorArg.errorCode).toBe('UNAUTHORIZED');
  });

  test('should return 401 Unauthorized when X-User-ID header is empty string or whitespace', () => {
    mockReq.headers['x-user-id'] = '   ';

    requireAuth(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    const errorArg = nextFn.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(UnauthorizedError);
    expect(errorArg.statusCode).toBe(401);
  });

  test('should allow request through and attach userId when X-User-ID is present', () => {
    mockReq.headers['x-user-id'] = '42';

    requireAuth(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledWith();
    expect(mockReq.userId).toBe('42');
  });
});
