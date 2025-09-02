import { UserRepository, CreateUserData, UpdateUserData, UserSearchCriteria } from '@/repositories/UserRepository';
import { testDb } from '@tests/helpers/test-database';
import { TestDataFactory } from '@tests/helpers/test-factories';
import { TestUtils } from '@tests/helpers/test-utils';
import { DatabaseService } from '@/services/DatabaseService';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    await testDb.setupDatabase();
    databaseService = DatabaseService.getInstance();
  });

  afterAll(async () => {
    await testDb.teardownDatabase();
  });

  beforeEach(async () => {
    await testDb.setupDatabase();
    userRepository = new UserRepository(databaseService);
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        phoneNumber: '+1234567890',
        preferredLanguage: 'en',
        timezone: 'UTC'
      };

      const user = await userRepository.createUser(userData);

      expect(user).toBeTruthy();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
      expect(user.phoneNumber).toBe(userData.phoneNumber);
      expect(user.preferredLanguage).toBe('en');
      expect(user.timezone).toBe('UTC');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with default values when optional fields are not provided', async () => {
      const userData: CreateUserData = {
        email: 'minimal@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user = await userRepository.createUser(userData);

      expect(user.role).toBe('USER'); // Default role
      expect(user.isActive).toBe(true); // Default active
      expect(user.preferredLanguage).toBe('en'); // Default language
      expect(user.timezone).toBe('UTC'); // Default timezone
    });

    it('should normalize email to lowercase when creating user', async () => {
      const userData: CreateUserData = {
        email: 'Test.Email@EXAMPLE.COM',
        passwordHash: 'hashedpassword123'
      };

      const user = await userRepository.createUser(userData);

      expect(user.email).toBe('test.email@example.com');
    });

    it('should throw error when creating user with duplicate email', async () => {
      const userData: CreateUserData = {
        email: 'duplicate@example.com',
        passwordHash: 'hashedpassword123'
      };

      await userRepository.createUser(userData);

      await expect(userRepository.createUser(userData))
        .rejects.toThrow('User with email duplicate@example.com already exists');
    });

    it('should find user by ID', async () => {
      const testUser = await testDb.createTestUser();
      
      const foundUser = await userRepository.findById(testUser.id);

      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(testUser.id);
      expect(foundUser!.email).toBe(testUser.email);
    });

    it('should return null when user not found by ID', async () => {
      const foundUser = await userRepository.findById('non-existent-id');

      expect(foundUser).toBeNull();
    });

    it('should update user successfully', async () => {
      const testUser = await testDb.createTestUser();
      
      const updateData: UpdateUserData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        phoneNumber: '+9876543210',
        isActive: false
      };

      const updatedUser = await userRepository.update(testUser.id, updateData);

      expect(updatedUser.firstName).toBe('UpdatedFirst');
      expect(updatedUser.lastName).toBe('UpdatedLast');
      expect(updatedUser.phoneNumber).toBe('+9876543210');
      expect(updatedUser.isActive).toBe(false);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(testUser.updatedAt.getTime());
    });

    it('should delete user successfully', async () => {
      const testUser = await testDb.createTestUser();
      
      await userRepository.delete(testUser.id);

      const foundUser = await userRepository.findById(testUser.id);
      expect(foundUser).toBeNull();
    });

    it('should count users correctly', async () => {
      // Create multiple test users
      await Promise.all([
        testDb.createTestUser({ email: 'user1@example.com' }),
        testDb.createTestUser({ email: 'user2@example.com' }),
        testDb.createTestUser({ email: 'user3@example.com' })
      ]);

      const count = await userRepository.count();

      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Find Operations', () => {
    let testUsers: any[];

    beforeEach(async () => {
      testUsers = await Promise.all([
        testDb.createTestUser({
          email: 'admin@example.com',
          role: 'ADMIN',
          isActive: true,
          firstName: 'Admin',
          lastName: 'User'
        }),
        testDb.createTestUser({
          email: 'user@example.com',
          role: 'USER',
          isActive: true,
          firstName: 'Regular',
          lastName: 'User'
        }),
        testDb.createTestUser({
          email: 'inactive@example.com',
          role: 'USER',
          isActive: false,
          firstName: 'Inactive',
          lastName: 'User'
        })
      ]);
    });

    it('should find user by email', async () => {
      const foundUser = await userRepository.findByEmail('admin@example.com');

      expect(foundUser).toBeTruthy();
      expect(foundUser!.email).toBe('admin@example.com');
      expect(foundUser!.role).toBe('ADMIN');
    });

    it('should find user by email case-insensitive', async () => {
      const foundUser = await userRepository.findByEmail('ADMIN@EXAMPLE.COM');

      expect(foundUser).toBeTruthy();
      expect(foundUser!.email).toBe('admin@example.com');
    });

    it('should return null when user not found by email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    it('should find users by role', async () => {
      const users = await userRepository.findByRole('USER');

      expect(users.length).toBeGreaterThanOrEqual(2);
      users.forEach(user => {
        expect(user.role).toBe('USER');
      });
    });

    it('should find active users', async () => {
      const activeUsers = await userRepository.findActiveUsers();

      expect(activeUsers.length).toBeGreaterThanOrEqual(2);
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should find users by Google ID', async () => {
      const testUser = await testDb.createTestUser({
        email: 'google@example.com',
        googleId: 'google123456'
      });

      const foundUser = await userRepository.findByGoogleId('google123456');

      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(testUser.id);
      expect(foundUser!.googleId).toBe('google123456');
    });

    it('should find users by GitHub ID', async () => {
      const testUser = await testDb.createTestUser({
        email: 'github@example.com',
        githubId: 'github123456'
      });

      const foundUser = await userRepository.findByGithubId('github123456');

      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(testUser.id);
      expect(foundUser!.githubId).toBe('github123456');
    });
  });

  describe('Search Functionality', () => {
    let searchTestUsers: any[];

    beforeEach(async () => {
      const baseDate = new Date();
      const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000);

      searchTestUsers = await Promise.all([
        testDb.createTestUser({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true,
          phoneNumber: '+1234567890',
          createdAt: thirtyDaysAgo,
          lastLoginAt: tenDaysAgo
        }),
        testDb.createTestUser({
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'USER',
          isActive: false,
          isEmailVerified: false,
          phoneNumber: '+9876543210',
          createdAt: tenDaysAgo,
          lastLoginAt: new Date()
        })
      ]);
    });

    it('should search users by email', async () => {
      const criteria: UserSearchCriteria = {
        email: 'john.doe'
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].email).toContain('john.doe');
    });

    it('should search users by first name', async () => {
      const criteria: UserSearchCriteria = {
        firstName: 'Jane'
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].firstName).toContain('Jane');
    });

    it('should search users by last name', async () => {
      const criteria: UserSearchCriteria = {
        lastName: 'Smith'
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].lastName).toContain('Smith');
    });

    it('should search users by role', async () => {
      const criteria: UserSearchCriteria = {
        role: 'ADMIN'
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(user => {
        expect(user.role).toBe('ADMIN');
      });
    });

    it('should search users by active status', async () => {
      const criteria: UserSearchCriteria = {
        isActive: false
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(user => {
        expect(user.isActive).toBe(false);
      });
    });

    it('should search users by email verification status', async () => {
      const criteria: UserSearchCriteria = {
        isEmailVerified: true
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(user => {
        expect(user.isEmailVerified).toBe(true);
      });
    });

    it('should search users by phone number', async () => {
      const criteria: UserSearchCriteria = {
        phoneNumber: '123456'
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].phoneNumber).toContain('123456');
    });

    it('should search users by registration date range', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const criteria: UserSearchCriteria = {
        registeredFrom: twentyDaysAgo,
        registeredTo: fiveDaysAgo
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(user => {
        expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(twentyDaysAgo.getTime());
        expect(user.createdAt.getTime()).toBeLessThanOrEqual(fiveDaysAgo.getTime());
      });
    });

    it('should search users with multiple criteria', async () => {
      const criteria: UserSearchCriteria = {
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true
      };

      const results = await userRepository.search(criteria);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(user => {
        expect(user.role).toBe('ADMIN');
        expect(user.isActive).toBe(true);
        expect(user.isEmailVerified).toBe(true);
      });
    });

    it('should return empty array when no users match search criteria', async () => {
      const criteria: UserSearchCriteria = {
        email: 'nonexistent@nowhere.com',
        role: 'NONEXISTENT_ROLE'
      };

      const results = await userRepository.search(criteria);

      expect(results).toHaveLength(0);
    });
  });

  describe('Authentication Features', () => {
    let authTestUser: any;

    beforeEach(async () => {
      authTestUser = await testDb.createTestUser({
        email: 'auth@example.com',
        passwordHash: 'originalHash',
        isEmailVerified: false,
        isTwoFactorEnabled: false
      });
    });

    it('should update login information', async () => {
      const loginData = {
        lastLoginAt: new Date(),
        loginAttempts: 3
      };

      const updatedUser = await userRepository.updateLoginInfo(authTestUser.id, loginData);

      expect(updatedUser.lastLoginAt).toEqual(loginData.lastLoginAt);
      expect(updatedUser.loginAttempts).toBe(3);
    });

    it('should lock user account', async () => {
      const lockoutDuration = 15; // 15 minutes

      const lockedUser = await userRepository.lockAccount(authTestUser.id, lockoutDuration);

      expect(lockedUser.lockoutUntil).toBeInstanceOf(Date);
      expect(lockedUser.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(lockedUser.loginAttempts).toBe(0);
    });

    it('should unlock user account', async () => {
      // First lock the account
      await userRepository.lockAccount(authTestUser.id);

      const unlockedUser = await userRepository.unlockAccount(authTestUser.id);

      expect(unlockedUser.lockoutUntil).toBeNull();
      expect(unlockedUser.loginAttempts).toBe(0);
    });

    it('should find locked users', async () => {
      await userRepository.lockAccount(authTestUser.id);

      const lockedUsers = await userRepository.findLockedUsers();

      expect(lockedUsers.length).toBeGreaterThanOrEqual(1);
      const foundLockedUser = lockedUsers.find(user => user.id === authTestUser.id);
      expect(foundLockedUser).toBeTruthy();
      expect(foundLockedUser!.lockoutUntil).toBeInstanceOf(Date);
    });

    it('should set email verification token', async () => {
      const token = 'verification_token_123';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const updatedUser = await userRepository.setEmailVerificationToken(
        authTestUser.id,
        token,
        expiresAt
      );

      expect(updatedUser.emailVerificationToken).toBe(token);
      expect(updatedUser.emailVerificationExpires).toEqual(expiresAt);
    });

    it('should verify email with valid token', async () => {
      const token = 'verification_token_456';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await userRepository.setEmailVerificationToken(authTestUser.id, token, expiresAt);

      const verifiedUser = await userRepository.verifyEmail(token);

      expect(verifiedUser).toBeTruthy();
      expect(verifiedUser!.isEmailVerified).toBe(true);
      expect(verifiedUser!.emailVerificationToken).toBeNull();
      expect(verifiedUser!.emailVerificationExpires).toBeNull();
    });

    it('should return null when verifying email with invalid token', async () => {
      const result = await userRepository.verifyEmail('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null when verifying email with expired token', async () => {
      const token = 'expired_token';
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // Expired 1 hour ago

      await userRepository.setEmailVerificationToken(authTestUser.id, token, expiredDate);

      const result = await userRepository.verifyEmail(token);

      expect(result).toBeNull();
    });

    it('should set password reset token', async () => {
      const token = 'reset_token_123';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const updatedUser = await userRepository.setPasswordResetToken(
        authTestUser.id,
        token,
        expiresAt
      );

      expect(updatedUser.passwordResetToken).toBe(token);
      expect(updatedUser.passwordResetExpires).toEqual(expiresAt);
    });

    it('should reset password with valid token', async () => {
      const token = 'reset_token_456';
      const newPasswordHash = 'newHashedPassword';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await userRepository.setPasswordResetToken(authTestUser.id, token, expiresAt);

      const resetUser = await userRepository.resetPassword(token, newPasswordHash);

      expect(resetUser).toBeTruthy();
      expect(resetUser!.passwordHash).toBe(newPasswordHash);
      expect(resetUser!.passwordResetToken).toBeNull();
      expect(resetUser!.passwordResetExpires).toBeNull();
      expect(resetUser!.lastPasswordChange).toBeInstanceOf(Date);
      expect(resetUser!.loginAttempts).toBe(0);
      expect(resetUser!.lockoutUntil).toBeNull();
    });

    it('should return null when resetting password with invalid token', async () => {
      const result = await userRepository.resetPassword('invalid_token', 'newPassword');

      expect(result).toBeNull();
    });
  });

  describe('Two-Factor Authentication', () => {
    let twoFactorTestUser: any;

    beforeEach(async () => {
      twoFactorTestUser = await testDb.createTestUser({
        email: '2fa@example.com',
        isTwoFactorEnabled: false
      });
    });

    it('should enable two-factor authentication', async () => {
      const secret = '2FA_SECRET_123';
      const backupCodes = ['code1', 'code2', 'code3'];

      const updatedUser = await userRepository.enableTwoFactor(
        twoFactorTestUser.id,
        secret,
        backupCodes
      );

      expect(updatedUser.isTwoFactorEnabled).toBe(true);
      expect(updatedUser.twoFactorSecret).toBe(secret);
      expect(updatedUser.twoFactorBackupCodes).toBe(JSON.stringify(backupCodes));
    });

    it('should disable two-factor authentication', async () => {
      // First enable 2FA
      await userRepository.enableTwoFactor(twoFactorTestUser.id, 'secret', ['code1']);

      const disabledUser = await userRepository.disableTwoFactor(twoFactorTestUser.id);

      expect(disabledUser.isTwoFactorEnabled).toBe(false);
      expect(disabledUser.twoFactorSecret).toBeNull();
      expect(disabledUser.twoFactorBackupCodes).toBeNull();
    });
  });

  describe('User Statistics', () => {
    beforeEach(async () => {
      // Create diverse users for statistics testing
      await Promise.all([
        testDb.createTestUser({
          email: 'admin1@example.com',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true,
          isTwoFactorEnabled: true
        }),
        testDb.createTestUser({
          email: 'admin2@example.com',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true
        }),
        testDb.createTestUser({
          email: 'user1@example.com',
          role: 'USER',
          isActive: true,
          isEmailVerified: false
        }),
        testDb.createTestUser({
          email: 'user2@example.com',
          role: 'USER',
          isActive: false,
          isEmailVerified: true
        }),
        testDb.createTestUser({
          email: 'locked@example.com',
          role: 'USER',
          lockoutUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          lastLoginAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        })
      ]);
    });

    it('should calculate comprehensive user statistics', async () => {
      const stats = await userRepository.getStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(5);
      expect(stats.active).toBeGreaterThanOrEqual(3);
      expect(stats.inactive).toBeGreaterThanOrEqual(1);
      expect(stats.verified).toBeGreaterThanOrEqual(2);
      expect(stats.unverified).toBeGreaterThanOrEqual(1);
      expect(stats.withTwoFactor).toBeGreaterThanOrEqual(1);
      expect(stats.locked).toBeGreaterThanOrEqual(1);
      expect(stats.byRole).toBeDefined();
      expect(stats.byRole.ADMIN).toBeGreaterThanOrEqual(2);
      expect(stats.byRole.USER).toBeGreaterThanOrEqual(3);
      expect(stats.recentLogins).toBeDefined();
    });

    it('should have correct statistics totals', async () => {
      const stats = await userRepository.getStats();

      // Active + Inactive should equal Total
      expect(stats.active + stats.inactive).toBe(stats.total);

      // Verified + Unverified should equal Total
      expect(stats.verified + stats.unverified).toBe(stats.total);

      // Sum of role counts should equal total
      const roleSum = Object.values(stats.byRole).reduce((sum, count) => sum + count, 0);
      expect(roleSum).toBe(stats.total);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await Promise.all([
        testDb.createTestUser({
          email: 'pwd1@example.com',
          passwordChangeRequired: true
        }),
        testDb.createTestUser({
          email: 'pwd2@example.com',
          passwordChangeRequired: true
        }),
        testDb.createTestUser({
          email: 'normal@example.com',
          passwordChangeRequired: false
        })
      ]);
    });

    it('should find users requiring password change', async () => {
      const users = await userRepository.findUsersRequiringPasswordChange();

      expect(users.length).toBeGreaterThanOrEqual(2);
      users.forEach(user => {
        expect(user.passwordChangeRequired).toBe(true);
      });
    });

    it('should handle pagination in find operations', async () => {
      const options = {
        skip: 0,
        take: 2
      };

      const users = await userRepository.findMany({}, options);

      expect(users.length).toBeLessThanOrEqual(2);
    });

    it('should handle ordering in find operations', async () => {
      const options = {
        orderBy: { createdAt: 'desc' as const }
      };

      const users = await userRepository.findMany({}, options);

      // Should be ordered by creation date descending
      for (let i = 1; i < users.length; i++) {
        expect(users[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          users[i].createdAt.getTime()
        );
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error by closing the connection
      const originalPrisma = userRepository['prisma'];
      
      try {
        // Replace prisma with a mock that throws errors
        (userRepository as any).prisma = {
          user: {
            findFirst: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          }
        };

        await expect(userRepository.findByEmail('test@example.com'))
          .rejects.toThrow('Database connection failed');
      } finally {
        // Restore original prisma
        (userRepository as any).prisma = originalPrisma;
      }
    });

    it('should handle invalid user IDs gracefully', async () => {
      const result = await userRepository.findById('invalid-uuid');
      expect(result).toBeNull();
    });

    it('should handle empty search criteria', async () => {
      const criteria: UserSearchCriteria = {};
      const results = await userRepository.search(criteria);

      expect(Array.isArray(results)).toBe(true);
      // Should return all users when no criteria specified
    });

    it('should handle null and undefined values in updates', async () => {
      const testUser = await testDb.createTestUser();
      
      const updateData: UpdateUserData = {
        firstName: undefined,
        lastName: null as any,
        phoneNumber: ''
      };

      const updatedUser = await userRepository.update(testUser.id, updateData);

      expect(updatedUser).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk user creation efficiently', async () => {
      const userCount = 50;
      const userDataArray = Array.from({ length: userCount }, (_, i) => ({
        email: `bulk${i}@example.com`,
        passwordHash: `hashedpassword${i}`
      }));

      const startTime = Date.now();
      
      const createdUsers = await Promise.all(
        userDataArray.map(userData => userRepository.createUser(userData))
      );
      
      const duration = Date.now() - startTime;

      expect(createdUsers).toHaveLength(userCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all users were created correctly
      createdUsers.forEach((user, index) => {
        expect(user.email).toBe(`bulk${index}@example.com`);
      });
    });

    it('should handle concurrent read operations efficiently', async () => {
      const testUser = await testDb.createTestUser();
      
      const concurrentReads = Array.from({ length: 20 }, () => 
        userRepository.findById(testUser.id)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentReads);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // All results should be the same user
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result!.id).toBe(testUser.id);
      });
    });

    it('should maintain performance with large result sets', async () => {
      // This test assumes some users already exist from previous tests
      const { duration } = await TestUtils.measureExecutionTime(async () => {
        return userRepository.search({});
      });

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Transaction Support', () => {
    it('should support database transactions', async () => {
      const userData: CreateUserData = {
        email: 'transaction@example.com',
        passwordHash: 'hashedpassword'
      };

      await testDb.withTransaction(async (tx) => {
        const user = await userRepository.createUser(userData);
        
        // Verify user exists within transaction
        const foundUser = await userRepository.findByEmail(userData.email, {}, tx);
        expect(foundUser).toBeTruthy();
        expect(foundUser!.id).toBe(user.id);
      });

      // Verify user exists after transaction commits
      const finalUser = await userRepository.findByEmail(userData.email);
      expect(finalUser).toBeTruthy();
    });
  });
});