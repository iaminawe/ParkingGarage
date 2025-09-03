#!/usr/bin/env node
/**
 * Test script for the NotificationService to verify database operations work correctly
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationService() {
  console.log('🧪 Testing NotificationService database operations...\n');

  try {
    // 1. Check if templates exist
    console.log('1. Checking notification templates...');
    const templates = await prisma.notificationTemplate.findMany({
      select: { name: true, type: true, channel: true, isActive: true }
    });
    console.log(`   ✅ Found ${templates.length} templates`);
    templates.forEach(t => console.log(`      - ${t.name} (${t.type}/${t.channel})`));

    // 2. Create a test user if one doesn't exist
    console.log('\n2. Creating test user...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      create: {
        email: 'test@example.com',
        passwordHash: 'test-hash',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        phoneNumber: '+1234567890',
        isPhoneVerified: true,
      },
      update: {},
    });
    console.log(`   ✅ Test user: ${testUser.email} (ID: ${testUser.id})`);

    // 3. Create notification preferences for test user
    console.log('\n3. Setting up notification preferences...');
    const channels = ['EMAIL', 'SMS', 'IN_APP', 'PUSH'];
    for (const channel of channels) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_channel: { userId: testUser.id, channel }
        },
        create: {
          userId: testUser.id,
          channel,
          enabled: true,
          frequency: 'IMMEDIATE',
          timezone: 'UTC',
        },
        update: {
          enabled: true,
        },
      });
    }
    console.log('   ✅ Notification preferences configured');

    // 4. Test notification creation
    console.log('\n4. Creating test notification...');
    const testNotification = await prisma.notification.create({
      data: {
        userId: testUser.id,
        type: 'PARKING_SESSION_STARTED',
        channel: 'EMAIL',
        status: 'PENDING',
        priority: 'MEDIUM',
        subject: 'Test Parking Session',
        content: 'This is a test notification for parking session starting at spot A-1',
        metadata: JSON.stringify({ spotNumber: 'A-1', licensePlate: 'TEST123' }),
      },
    });
    console.log(`   ✅ Created notification: ${testNotification.id}`);

    // 5. Test notification log creation
    console.log('\n5. Creating notification log entry...');
    const logEntry = await prisma.notificationLog.create({
      data: {
        notificationId: testNotification.id,
        status: 'SENT',
        details: JSON.stringify({ channel: 'EMAIL', action: 'sent_via_test' }),
      },
    });
    console.log(`   ✅ Created log entry: ${logEntry.id}`);

    // 6. Test marking as read
    console.log('\n6. Marking notification as read...');
    const updatedNotification = await prisma.notification.update({
      where: { id: testNotification.id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
    console.log(`   ✅ Marked as read: ${updatedNotification.status}`);

    // 7. Query user's notifications
    console.log('\n7. Querying user notifications...');
    const userNotifications = await prisma.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        subject: true,
        createdAt: true,
        readAt: true,
      },
    });
    console.log(`   ✅ Found ${userNotifications.length} notifications for user:`);
    userNotifications.forEach(n => {
      console.log(`      - ${n.subject} (${n.type}/${n.channel}) - ${n.status}`);
    });

    // 8. Query notification preferences
    console.log('\n8. Querying user preferences...');
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: testUser.id },
      select: {
        channel: true,
        enabled: true,
        frequency: true,
        timezone: true,
      },
    });
    console.log(`   ✅ Found preferences for ${preferences.length} channels:`);
    preferences.forEach(p => {
      console.log(`      - ${p.channel}: ${p.enabled ? 'enabled' : 'disabled'} (${p.frequency})`);
    });

    console.log('\n🎉 All tests passed! NotificationService database operations are working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationService()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));