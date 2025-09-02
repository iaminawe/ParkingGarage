/**
 * Unit tests for validation utilities
 * 
 * Tests all validation functions with comprehensive edge cases,
 * boundary conditions, and malicious input scenarios.
 */

import {
  validateLicensePlate,
  validateEmail,
  validatePhone,
  validateSpotNumber,
  validateParkingDuration,
  validatePaymentAmount,
  sanitizeString,
  validateDateRange,
  validatePaginationParams
} from '../../../src/utils/validators';

describe('Validation Utilities', () => {
  describe('validateLicensePlate', () => {
    it('should validate standard license plates', () => {
      const validPlates = [
        'ABC123',
        'AB1234',
        'A123456',
        'ABC1234',
        '123ABC',
        '1AB234',
        'XYZ789'
      ];

      validPlates.forEach(plate => {
        expect(validateLicensePlate(plate)).toBe(true);
      });
    });

    it('should reject invalid license plates', () => {
      const invalidPlates = [
        '',
        'A',
        'AB',
        'ABCDEFGHIJ', // Too long
        '123456789', // Too many numbers
        'ABCDEFG',   // Too many letters
        'ABC-123',   // Invalid character
        'ABC 123',   // Space
        'abc123',    // Lowercase (should be normalized)
        '!@#123',    // Special characters
        null,
        undefined
      ];

      invalidPlates.forEach(plate => {
        expect(validateLicensePlate(plate as any)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateLicensePlate(' ABC123 ')).toBe(true); // Should trim
      expect(validateLicensePlate('0000000')).toBe(false);  // All zeros
      expect(validateLicensePlate('AAAAAAA')).toBe(false);  // All letters
    });
  });

  describe('validateEmail', () => {
    it('should validate standard email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example.co.uk',
        'user123@example-site.org',
        'test@localhost.localdomain',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user..double@example.com',
        'user@example',
        'user@example.',
        'user name@example.com', // Space
        'user@exam ple.com',     // Space in domain
        '.user@example.com',     // Leading dot
        'user.@example.com',     // Trailing dot
        'user@-example.com',     // Leading dash in domain
        'user@example-.com',     // Trailing dash in domain
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email as any)).toBe(false);
      });
    });

    it('should handle case sensitivity correctly', () => {
      expect(validateEmail('User@Example.COM')).toBe(true);
      expect(validateEmail('USER@EXAMPLE.COM')).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('should validate various phone number formats', () => {
      const validPhones = [
        '+1234567890',
        '+1-234-567-8900',
        '(123) 456-7890',
        '123-456-7890',
        '123.456.7890',
        '123 456 7890',
        '1234567890',
        '+44 20 7946 0958',
        '+49 30 901820'
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123',
        '12345',           // Too short
        '123456789012345', // Too long
        'abcdefghij',      // Letters
        '123-abc-4567',    // Mixed
        '+++1234567890',   // Multiple plus signs
        '123--456-7890',   // Multiple dashes
        '123..456.7890',   // Multiple dots
        '+',
        '-',
        '.',
        null,
        undefined
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhone(phone as any)).toBe(false);
      });
    });

    it('should handle international formats', () => {
      expect(validatePhone('+44 20 7946 0958')).toBe(true);   // UK
      expect(validatePhone('+49 30 901820')).toBe(true);      // Germany
      expect(validatePhone('+33 1 42 86 83 26')).toBe(true);  // France
      expect(validatePhone('+81 3 3230 9631')).toBe(true);    // Japan
    });
  });

  describe('validateSpotNumber', () => {
    it('should validate standard spot number formats', () => {
      const validSpotNumbers = [
        'A001',
        'B123',
        'Z999',
        'AA01',
        'AB12',
        'XY99',
        '001',
        '123',
        '999',
        'PREMIUM1',
        'VIP001',
        'HANDICAP1'
      ];

      validSpotNumbers.forEach(spotNumber => {
        expect(validateSpotNumber(spotNumber)).toBe(true);
      });
    });

    it('should reject invalid spot numbers', () => {
      const invalidSpotNumbers = [
        '',
        'A',
        '1',
        'A0000',    // Too many digits
        'ABCDEFG',  // Too many letters
        'A-001',    // Invalid character
        'A 001',    // Space
        'a001',     // Lowercase
        '!@#',      // Special characters
        null,
        undefined
      ];

      invalidSpotNumbers.forEach(spotNumber => {
        expect(validateSpotNumber(spotNumber as any)).toBe(false);
      });
    });
  });

  describe('validateParkingDuration', () => {
    it('should validate reasonable parking durations', () => {
      const validDurations = [
        1,      // 1 minute
        60,     // 1 hour
        120,    // 2 hours
        480,    // 8 hours
        1440,   // 24 hours
        2880,   // 48 hours
        10080   // 1 week
      ];

      validDurations.forEach(duration => {
        expect(validateParkingDuration(duration)).toBe(true);
      });
    });

    it('should reject invalid parking durations', () => {
      const invalidDurations = [
        0,
        -1,
        -60,
        0.5,        // Fractional minutes
        20160,      // 2 weeks (too long)
        100000,     // Unreasonably long
        Infinity,
        -Infinity,
        NaN,
        null,
        undefined,
        '60' as any  // String instead of number
      ];

      invalidDurations.forEach(duration => {
        expect(validateParkingDuration(duration as any)).toBe(false);
      });
    });
  });

  describe('validatePaymentAmount', () => {
    it('should validate reasonable payment amounts', () => {
      const validAmounts = [
        0.01,   // 1 cent
        1.00,   // $1
        5.50,   // $5.50
        25.99,  // $25.99
        100.00, // $100
        999.99  // $999.99
      ];

      validAmounts.forEach(amount => {
        expect(validatePaymentAmount(amount)).toBe(true);
      });
    });

    it('should reject invalid payment amounts', () => {
      const invalidAmounts = [
        0,
        -0.01,
        -10.00,
        1000.00,    // Too high
        10000,      // Way too high
        0.001,      // Fractional cent
        Infinity,
        -Infinity,
        NaN,
        null,
        undefined,
        '10.00' as any  // String instead of number
      ];

      invalidAmounts.forEach(amount => {
        expect(validatePaymentAmount(amount as any)).toBe(false);
      });
    });

    it('should handle edge cases for currency', () => {
      expect(validatePaymentAmount(0.001)).toBe(false);  // Fractional cent
      expect(validatePaymentAmount(999.999)).toBe(false); // More than 2 decimal places
      expect(validatePaymentAmount(100.1)).toBe(true);   // 1 decimal place is OK
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize potentially dangerous strings', () => {
      const testCases = [
        {
          input: '<script>alert("xss")</script>',
          expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        },
        {
          input: 'Normal string',
          expected: 'Normal string'
        },
        {
          input: 'String with "quotes" and \'apostrophes\'',
          expected: 'String with &quot;quotes&quot; and &#x27;apostrophes&#x27;'
        },
        {
          input: 'String & ampersands',
          expected: 'String &amp; ampersands'
        },
        {
          input: 'SQL injection\'; DROP TABLE users; --',
          expected: 'SQL injection&#x27;; DROP TABLE users; --'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeString(input)).toBe(expected);
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(123 as any)).toBe('123');
      expect(sanitizeString(true as any)).toBe('true');
      expect(sanitizeString({} as any)).toBe('[object Object]');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(10000);
      const result = sanitizeString(longString, 1000);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('validateDateRange', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const past = new Date('2024-01-01T12:00:00Z');
    const future = new Date('2024-01-30T12:00:00Z');

    it('should validate reasonable date ranges', () => {
      expect(validateDateRange(past, now)).toBe(true);
      expect(validateDateRange(past, future)).toBe(true);
      expect(validateDateRange(now, future)).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      expect(validateDateRange(future, past)).toBe(false); // End before start
      expect(validateDateRange(now, now)).toBe(false);     // Same date
      expect(validateDateRange(null as any, future)).toBe(false);
      expect(validateDateRange(past, null as any)).toBe(false);
      expect(validateDateRange(undefined as any, future)).toBe(false);
    });

    it('should validate maximum range limits', () => {
      const veryFuture = new Date('2025-01-01T12:00:00Z'); // 1 year later
      expect(validateDateRange(past, veryFuture, 365 * 24 * 60 * 60 * 1000)).toBe(true);
      expect(validateDateRange(past, veryFuture, 30 * 24 * 60 * 60 * 1000)).toBe(false);
    });

    it('should handle invalid date objects', () => {
      const invalidDate = new Date('invalid');
      expect(validateDateRange(invalidDate, future)).toBe(false);
      expect(validateDateRange(past, invalidDate)).toBe(false);
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate reasonable pagination parameters', () => {
      const validParams = [
        { page: 1, limit: 10 },
        { page: 1, limit: 25 },
        { page: 5, limit: 50 },
        { page: 10, limit: 100 }
      ];

      validParams.forEach(params => {
        expect(validatePaginationParams(params.page, params.limit)).toBe(true);
      });
    });

    it('should reject invalid pagination parameters', () => {
      const invalidParams = [
        { page: 0, limit: 10 },     // Page starts at 1
        { page: -1, limit: 10 },    // Negative page
        { page: 1, limit: 0 },      // Zero limit
        { page: 1, limit: -10 },    // Negative limit
        { page: 1, limit: 1001 },   // Too high limit
        { page: 10001, limit: 10 }, // Too high page
        { page: 1.5, limit: 10 },   // Fractional page
        { page: 1, limit: 10.5 },   // Fractional limit
        { page: NaN, limit: 10 },
        { page: 1, limit: NaN },
        { page: Infinity, limit: 10 },
        { page: 1, limit: Infinity }
      ];

      invalidParams.forEach(params => {
        expect(validatePaginationParams(params.page, params.limit)).toBe(false);
      });
    });

    it('should handle string inputs that can be converted to numbers', () => {
      expect(validatePaginationParams('1' as any, '10' as any)).toBe(true);
      expect(validatePaginationParams('5' as any, '25' as any)).toBe(true);
      expect(validatePaginationParams('abc' as any, '10' as any)).toBe(false);
      expect(validatePaginationParams('1' as any, 'xyz' as any)).toBe(false);
    });
  });

  describe('security and edge cases', () => {
    it('should handle extremely long inputs', () => {
      const extremelyLongString = 'a'.repeat(1000000);
      
      expect(validateLicensePlate(extremelyLongString)).toBe(false);
      expect(validateEmail(extremelyLongString + '@example.com')).toBe(false);
      expect(validatePhone(extremelyLongString)).toBe(false);
      expect(validateSpotNumber(extremelyLongString)).toBe(false);
      
      const sanitized = sanitizeString(extremelyLongString, 1000);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('should handle Unicode and special characters', () => {
      const unicodeStrings = [
        'José García',
        '北京市',
        'Москва',
        '🚗🅿️',
        'café@résumé.com'
      ];

      unicodeStrings.forEach(str => {
        // License plates should not accept Unicode
        expect(validateLicensePlate(str)).toBe(false);
        
        // Sanitization should handle Unicode safely
        const sanitized = sanitizeString(str);
        expect(typeof sanitized).toBe('string');
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    it('should handle null prototype objects', () => {
      const nullProtoObject = Object.create(null);
      nullProtoObject.toString = undefined;
      
      expect(() => sanitizeString(nullProtoObject)).not.toThrow();
    });

    it('should prevent ReDoS attacks', () => {
      const maliciousInputs = [
        'a'.repeat(10000) + '@' + 'b'.repeat(10000) + '.com',
        '(' + '('.repeat(1000) + ')'.repeat(1000),
        '+1-' + '2-'.repeat(1000) + '3456',
        '<' + 'script'.repeat(1000) + '>'
      ];

      maliciousInputs.forEach(input => {
        const start = Date.now();
        
        validateEmail(input);
        validatePhone(input);
        sanitizeString(input);
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });
    });

    it('should handle circular references in objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      expect(() => sanitizeString(circularObj)).not.toThrow();
    });
  });

  describe('performance tests', () => {
    it('should validate large batches efficiently', () => {
      const licensePlates = Array.from({ length: 10000 }, (_, i) => `ABC${i.toString().padStart(4, '0')}`);
      const emails = Array.from({ length: 10000 }, (_, i) => `user${i}@example.com`);
      
      const start = Date.now();
      
      licensePlates.forEach(plate => validateLicensePlate(plate));
      emails.forEach(email => validateEmail(email));
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should sanitize large strings efficiently', () => {
      const largeHtml = '<div>' + 'content '.repeat(10000) + '</div>';
      
      const start = Date.now();
      const sanitized = sanitizeString(largeHtml);
      const duration = Date.now() - start;
      
      expect(sanitized).toContain('&lt;div&gt;');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('integration scenarios', () => {
    it('should validate complete vehicle registration data', () => {
      const validVehicleData = {
        licensePlate: 'ABC123',
        ownerEmail: 'owner@example.com',
        ownerPhone: '+1-234-567-8900',
        spotNumber: 'A001'
      };
      
      expect(validateLicensePlate(validVehicleData.licensePlate)).toBe(true);
      expect(validateEmail(validVehicleData.ownerEmail)).toBe(true);
      expect(validatePhone(validVehicleData.ownerPhone)).toBe(true);
      expect(validateSpotNumber(validVehicleData.spotNumber)).toBe(true);
    });

    it('should validate complete parking session data', () => {
      const sessionData = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        duration: 480, // 8 hours
        amount: 25.50,
        page: 1,
        limit: 20
      };
      
      expect(validateDateRange(sessionData.startDate, sessionData.endDate)).toBe(true);
      expect(validateParkingDuration(sessionData.duration)).toBe(true);
      expect(validatePaymentAmount(sessionData.amount)).toBe(true);
      expect(validatePaginationParams(sessionData.page, sessionData.limit)).toBe(true);
    });

    it('should handle mixed valid and invalid data', () => {
      const mixedData = {
        validLicense: 'ABC123',
        invalidLicense: 'INVALID_LICENSE_PLATE',
        validEmail: 'user@example.com',
        invalidEmail: 'invalid-email',
        validAmount: 10.50,
        invalidAmount: -5.00
      };
      
      expect(validateLicensePlate(mixedData.validLicense)).toBe(true);
      expect(validateLicensePlate(mixedData.invalidLicense)).toBe(false);
      expect(validateEmail(mixedData.validEmail)).toBe(true);
      expect(validateEmail(mixedData.invalidEmail)).toBe(false);
      expect(validatePaymentAmount(mixedData.validAmount)).toBe(true);
      expect(validatePaymentAmount(mixedData.invalidAmount)).toBe(false);
    });
  });
});
