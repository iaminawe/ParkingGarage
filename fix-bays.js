const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBayData() {
  console.log('🔧 Fixing bay data for parking spots...');
  
  try {
    // Get all floors first
    const floors = await prisma.floor.findMany({
      include: { spots: true }
    });
    
    console.log(`Found ${floors.length} floors to process`);
    
    for (const floor of floors) {
      console.log(`\nProcessing Floor ${floor.floorNumber} with ${floor.spots.length} spots...`);
      
      // Organize spots into bays (sections)
      const spotsPerBay = 25;
      const bays = ['A', 'B', 'C', 'D'];
      
      for (let i = 0; i < floor.spots.length; i++) {
        const spot = floor.spots[i];
        
        // Determine bay (section) based on spot index
        const bayIndex = Math.floor(i / spotsPerBay);
        const bayLetter = bays[bayIndex] || 'A'; // Default to A if out of range
        
        // Calculate spot number within bay
        const spotInBay = (i % spotsPerBay) + 1;
        
        // Create unique spot number: Floor + Bay + Number (e.g., 1A01, 1A02)
        const spotNumber = `${floor.floorNumber}${bayLetter}${String(spotInBay).padStart(2, '0')}-${spot.id.slice(-4)}`;
        
        // Determine spot type based on position
        let spotType = 'STANDARD';
        if (spotInBay <= 2) spotType = 'HANDICAP';
        else if (spotInBay <= 7) spotType = 'ELECTRIC';
        else if (spotInBay <= 12) spotType = 'COMPACT';
        else if (spotInBay > 20) spotType = 'OVERSIZED';
        
        // Check if spotNumber already exists and make it unique
        const existingSpot = await prisma.parkingSpot.findFirst({
          where: { spotNumber: spotNumber }
        });
        
        const finalSpotNumber = existingSpot ? `${spotNumber}-${i}` : spotNumber;
        
        // Update the spot
        await prisma.parkingSpot.update({
          where: { id: spot.id },
          data: {
            spotNumber: finalSpotNumber,
            section: bayLetter,
            level: floor.floorNumber,
            spotType: spotType
          }
        });
        
        if (i % 10 === 0) {
          console.log(`  Updated spot ${i + 1}/${floor.spots.length}: ${spotNumber} (${spotType})`);
        }
      }
      
      console.log(`✅ Floor ${floor.floorNumber} completed - organized into bays: ${bays.join(', ')}`);
    }
    
    // Verify the updates
    const updatedSpots = await prisma.parkingSpot.findMany({
      where: {
        spotNumber: { not: null }
      },
      take: 10
    });
    
    console.log('\n📊 Sample updated spots:');
    updatedSpots.forEach(spot => {
      console.log(`  ${spot.spotNumber} - Bay ${spot.section} - Level ${spot.level} - Type ${spot.spotType}`);
    });
    
    const totalUpdated = await prisma.parkingSpot.count({
      where: {
        spotNumber: { not: null },
        section: { not: null }
      }
    });
    
    console.log(`\n✅ Successfully updated ${totalUpdated} parking spots with bay information!`);
    
  } catch (error) {
    console.error('❌ Error fixing bay data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBayData();