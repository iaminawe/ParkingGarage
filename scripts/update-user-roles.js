#!/usr/bin/env node
/**
 * Quick script to update user roles for development/testing
 * This allows us to test the access control system
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRoles() {
  try {
    console.log('🔄 Updating user roles...');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user.role}`);
    });

    // Update specific users to admin/operator roles
    const updates = [];

    for (const user of users) {
      let newRole = user.role;
      
      // Assign roles based on email patterns
      if (user.email.includes('admin')) {
        newRole = 'ADMIN';
      } else if (user.email.includes('operator') || user.email.includes('manager')) {
        newRole = 'OPERATOR';
      } else if (user.email === 'test@example.com' || user.email === 'demo@example.com') {
        // Make test/demo users operators for testing
        newRole = 'OPERATOR';
      }

      if (newRole !== user.role) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { role: newRole }
        });
        updates.push({ email: user.email, oldRole: user.role, newRole });
        console.log(`✅ Updated ${user.email}: ${user.role} -> ${newRole}`);
      }
    }

    if (updates.length === 0) {
      console.log('📝 No role updates needed');
      
      // Create a test admin user if none exist
      const adminUsers = users.filter(u => u.email.includes('admin'));
      if (adminUsers.length === 0) {
        console.log('🔧 Creating test admin user...');
        
        // You would need to hash the password properly in a real scenario
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Admin123!', 12);
        
        const adminUser = await prisma.user.create({
          data: {
            email: 'admin@test.com',
            passwordHash: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isActive: true,
          }
        });
        console.log(`✅ Created admin user: admin@test.com`);
      }
    }

    console.log('\n🎉 Role update completed!');
    
  } catch (error) {
    console.error('❌ Error updating roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateUserRoles();
