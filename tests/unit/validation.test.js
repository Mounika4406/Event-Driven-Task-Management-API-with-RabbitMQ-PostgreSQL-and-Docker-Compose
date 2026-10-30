const {
  validateUserCreate,
  validateTaskCreate,
  validateTaskUpdate,
  parsePaginationParams
} = require('../../api-service/src/utils/validator');
const { ValidationError } = require('../../api-service/src/utils/errors');

describe('Unit Tests: Input Validations', () => {
  describe('validateUserCreate', () => {
    test('should validate and sanitize valid user creation payload', () => {
      const result = validateUserCreate({
        username: '  johndoe  ',
        email: '  John.Doe@Example.com  '
      });
      expect(result).toEqual({
        username: 'johndoe',
        email: 'john.doe@example.com'
      });
    });

    test('should reject missing or non-string username', () => {
      expect(() => validateUserCreate({ email: 'test@example.com' })).toThrow(ValidationError);
      expect(() => validateUserCreate({ username: 123, email: 'test@example.com' })).toThrow(ValidationError);
    });

    test('should reject username with length less than 3 or greater than 50', () => {
      expect(() => validateUserCreate({ username: 'ab', email: 'test@example.com' })).toThrow(ValidationError);
      expect(() => validateUserCreate({ username: 'a'.repeat(51), email: 'test@example.com' })).toThrow(ValidationError);
    });

    test('should reject missing or invalid email format', () => {
      expect(() => validateUserCreate({ username: 'validuser' })).toThrow(ValidationError);
      expect(() => validateUserCreate({ username: 'validuser', email: 'not-an-email' })).toThrow(ValidationError);
      expect(() => validateUserCreate({ username: 'validuser', email: '@missingusername.com' })).toThrow(ValidationError);
      expect(() => validateUserCreate({ username: 'validuser', email: 'user@domain' })).toThrow(ValidationError);
    });
  });

  describe('validateTaskCreate', () => {
    test('should validate and sanitize valid task payload with defaults', () => {
      const result = validateTaskCreate({
        title: 'Complete documentation',
        assigned_to: 2
      });
      expect(result).toEqual({
        title: 'Complete documentation',
        description: null,
        status: 'pending',
        assigned_to_user_id: 2
      });
    });

    test('should accept assigned_to_user_id alternative field and string integer', () => {
      const result = validateTaskCreate({
        title: 'Build CI/CD pipeline',
        description: 'Docker build and test automation',
        status: 'in-progress',
        assigned_to_user_id: '5'
      });
      expect(result).toEqual({
        title: 'Build CI/CD pipeline',
        description: 'Docker build and test automation',
        status: 'in-progress',
        assigned_to_user_id: 5
      });
    });

    test('should reject title shorter than 5 chars or longer than 100 chars', () => {
      expect(() => validateTaskCreate({ title: 'Task', assigned_to: 1 })).toThrow(ValidationError);
      expect(() => validateTaskCreate({ title: 'T'.repeat(101), assigned_to: 1 })).toThrow(ValidationError);
    });

    test('should reject description exceeding 500 chars', () => {
      expect(() => validateTaskCreate({
        title: 'Valid task title',
        description: 'D'.repeat(501),
        assigned_to: 1
      })).toThrow(ValidationError);
    });

    test('should reject invalid status enumeration', () => {
      expect(() => validateTaskCreate({
        title: 'Valid title',
        status: 'archived',
        assigned_to: 1
      })).toThrow(ValidationError);
    });

    test('should reject missing or invalid assigned_to user ID', () => {
      expect(() => validateTaskCreate({ title: 'Valid title' })).toThrow(ValidationError);
      expect(() => validateTaskCreate({ title: 'Valid title', assigned_to: 0 })).toThrow(ValidationError);
      expect(() => validateTaskCreate({ title: 'Valid title', assigned_to: -5 })).toThrow(ValidationError);
      expect(() => validateTaskCreate({ title: 'Valid title', assigned_to: 'abc' })).toThrow(ValidationError);
    });
  });

  describe('validateTaskUpdate', () => {
    test('should accept partial update of fields', () => {
      const result = validateTaskUpdate({
        status: 'completed'
      });
      expect(result).toEqual({ status: 'completed' });
    });

    test('should reject empty update payload', () => {
      expect(() => validateTaskUpdate({})).toThrow(ValidationError);
      expect(() => validateTaskUpdate({ unknown_field: 'ignored' })).toThrow(ValidationError);
    });

    test('should validate updated title length', () => {
      expect(() => validateTaskUpdate({ title: 'Bad' })).toThrow(ValidationError);
      expect(() => validateTaskUpdate({ title: 'T'.repeat(105) })).toThrow(ValidationError);
    });

    test('should validate updated status enum', () => {
      expect(() => validateTaskUpdate({ status: 'invalid-status' })).toThrow(ValidationError);
    });
  });

  describe('parsePaginationParams', () => {
    test('should return default pagination when query is empty', () => {
      const pagination = parsePaginationParams({});
      expect(pagination).toEqual({ page: 1, limit: 10, offset: 0 });
    });

    test('should parse custom valid page and limit', () => {
      const pagination = parsePaginationParams({ page: '3', limit: '25' });
      expect(pagination).toEqual({ page: 3, limit: 25, offset: 50 });
    });

    test('should reject invalid page or limit', () => {
      expect(() => parsePaginationParams({ page: '0' })).toThrow(ValidationError);
      expect(() => parsePaginationParams({ page: '-2' })).toThrow(ValidationError);
      expect(() => parsePaginationParams({ limit: '101' })).toThrow(ValidationError);
      expect(() => parsePaginationParams({ limit: '0' })).toThrow(ValidationError);
    });
  });
});
