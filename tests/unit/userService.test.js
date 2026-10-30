const UserService = require('../../api-service/src/services/UserService');
const { ConflictError, NotFoundError, ValidationError } = require('../../api-service/src/utils/errors');

describe('Unit Tests: UserService', () => {
  let mockUserRepo;
  let userService;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn()
    };
    userService = new UserService(mockUserRepo);
  });

  describe('createUser', () => {
    test('should validate input and call repository create', async () => {
      const payload = { username: 'testuser', email: 'test@example.com' };
      const createdUser = { id: 1, ...payload, created_at: new Date().toISOString() };
      mockUserRepo.create.mockResolvedValue(createdUser);

      const result = await userService.createUser(payload);

      expect(mockUserRepo.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com'
      });
      expect(result).toEqual(createdUser);
    });

    test('should propagate ConflictError on duplicate username or email', async () => {
      const payload = { username: 'existing', email: 'existing@example.com' };
      mockUserRepo.create.mockRejectedValue(new ConflictError('User already exists'));

      await expect(userService.createUser(payload)).rejects.toThrow(ConflictError);
    });
  });

  describe('getUserById', () => {
    test('should return user when valid ID exists', async () => {
      const user = { id: 1, username: 'alice', email: 'alice@example.com' };
      mockUserRepo.findById.mockResolvedValue(user);

      const result = await userService.getUserById(1);
      expect(result).toEqual(user);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
    });

    test('should throw NotFoundError when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(userService.getUserById(99)).rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError when ID is invalid', async () => {
      await expect(userService.getUserById('invalid-id')).rejects.toThrow(ValidationError);
      await expect(userService.getUserById(-5)).rejects.toThrow(ValidationError);
    });
  });

  describe('getUsers', () => {
    test('should return paginated user list', async () => {
      const users = [
        { id: 1, username: 'u1', email: 'u1@test.com' },
        { id: 2, username: 'u2', email: 'u2@test.com' }
      ];
      mockUserRepo.findAll.mockResolvedValue({ users, total: 2 });

      const result = await userService.getUsers({ page: '1', limit: '10' });

      expect(result.data).toEqual(users);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        total_pages: 1
      });
    });
  });
});
