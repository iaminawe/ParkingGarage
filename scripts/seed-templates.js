#!/usr/bin/env node
/**
 * Seed notification templates for the parking garage system
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const templates = [
  {
    name: 'PARKING_SESSION_STARTED_EMAIL',
    type: 'PARKING_SESSION_STARTED',
    channel: 'EMAIL',
    subject: 'Parking Session Started - Spot {{spotNumber}}',
    body: '<h2>Parking Session Started</h2><p>Hi {{userName}},</p><p>Your parking session has been started:</p><ul><li><strong>Vehicle:</strong> {{licensePlate}}</li><li><strong>Spot Number:</strong> {{spotNumber}}</li><li><strong>Start Time:</strong> {{startTime}}</li></ul><p>Thank you for using our parking service!</p>',
    variables: JSON.stringify(['userName', 'licensePlate', 'spotNumber', 'startTime']),
    description: 'Notifies user when their parking session starts',
    language: 'en',
    isActive: true,
    version: 1
  },
  {
    name: 'PAYMENT_CONFIRMATION_EMAIL',
    type: 'PAYMENT_CONFIRMATION',
    channel: 'EMAIL',
    subject: 'Payment Confirmation - ${{amount}}',
    body: '<h2>Payment Confirmation</h2><p>Hi {{userName}},</p><p>Payment successful:</p><ul><li><strong>Amount:</strong> ${{amount}}</li><li><strong>Date:</strong> {{paymentDate}}</li></ul><p>Thank you!</p>',
    variables: JSON.stringify(['userName', 'amount', 'paymentDate']),
    description: 'Confirms successful payment',
    language: 'en',
    isActive: true,
    version: 1
  },
  {
    name: 'PARKING_SESSION_STARTED_SMS',
    type: 'PARKING_SESSION_STARTED',
    channel: 'SMS',
    subject: 'Parking Started',
    body: 'Parking started: Spot {{spotNumber}}, License: {{licensePlate}}',
    variables: JSON.stringify(['spotNumber', 'licensePlate']),
    description: 'SMS notification when parking starts',
    language: 'en',
    isActive: true,
    version: 1
  },
  {
    name: 'SPOT_AVAILABILITY_IN_APP',
    type: 'SPOT_AVAILABILITY',
    channel: 'IN_APP',
    subject: 'Parking Spot Available',
    body: 'Spot {{spotNumber}} ({{spotType}}) is now available!',
    variables: JSON.stringify(['spotNumber', 'spotType']),
    description: 'In-app notification for available spots',
    language: 'en',
    isActive: true,
    version: 1
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding notification templates...');
  
  try {
    for (const template of templates) {
      const existing = await prisma.notificationTemplate.findUnique({
        where: { name: template.name }
      });
      
      if (existing) {
        console.log('📝 Template already exists:', template.name);
      } else {
        await prisma.notificationTemplate.create({
          data: template
        });
        console.log('✨ Created template:', template.name);
      }
    }
    
    console.log('✅ Template seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplates();