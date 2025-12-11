import { describe, it, expect, beforeEach } from 'vitest';
import { registerUserValidation, loginUserValidation } from '../../src/utils/validation.utils.js';

describe('Validation Utils', () => {
  describe('registerUserValidation', () => {
    it('should have correct validation rules', () => {
      expect(registerUserValidation).toHaveLength(5);
      expect(registerUserValidation[0]).toHaveProperty('field', 'firstName');
      expect(registerUserValidation[1]).toHaveProperty('field', 'lastName');
      expect(registerUserValidation[2]).toHaveProperty('field', 'username');
      expect(registerUserValidation[3]).toHaveProperty('field', 'email');
      expect(registerUserValidation[4]).toHaveProperty('field', 'password');
    });

    it('should have username length validation', () => {
      const usernameValidation = registerUserValidation.find(v => v.field === 'username');
      expect(usernameValidation.options).toEqual(
        expect.objectContaining({ min: 5, max: 12 })
      );
    });
  });

  describe('loginUserValidation', () => {
    it('should have correct validation rules', () => {
      expect(loginUserValidation).toHaveLength(2);
      expect(loginUserValidation[0]).toHaveProperty('field', 'email');
      expect(loginUserValidation[1]).toHaveProperty('field', 'password');
    });
  });
});