import { describe, it, expect } from 'vitest';
import { validateRegistration, validateLogin } from '../../src/utils/validation.utils.js';

describe('Validation Utils', () => {
  describe('validateRegistration', () => {
    it('should validate valid registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = validateRegistration(validData);
      expect(error).toBeUndefined();
    });

    it('should require username', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('username');
    });

    it('should require email', () => {
      const invalidData = {
        username: 'testuser',
        password: 'password123',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('email');
    });

    it('should require password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });

    it('should validate email format', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('email');
    });

    it('should enforce minimum username length', () => {
      const invalidData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('username');
    });

    it('should enforce maximum username length', () => {
      const invalidData = {
        username: 'a'.repeat(51),
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('username');
    });

    it('should enforce minimum password length', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345',
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });

    it('should enforce maximum password length', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'a'.repeat(15),
      };

      const { error } = validateRegistration(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });
  });

  describe('validateLogin', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = validateLogin(validData);
      expect(error).toBeUndefined();
    });

    it('should require email', () => {
      const invalidData = {
        password: 'password123',
      };

      const { error } = validateLogin(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('email');
    });

    it('should require password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const { error } = validateLogin(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });

    it('should validate email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const { error } = validateLogin(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('email');
    });

    it('should enforce minimum password length', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      };

      const { error } = validateLogin(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });

    it('should enforce maximum password length', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'a'.repeat(15),
      };

      const { error } = validateLogin(invalidData);
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('password');
    });
  });
});