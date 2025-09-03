/**
 * Test file to validate spotService pagination fixes
 * This verifies that the pagination issues have been resolved
 */

import { SpotService } from '../services/spotService';

describe('SpotService Pagination Fixes', () => {
  let spotService: SpotService;

  beforeEach(() => {
    spotService = new SpotService();
  });

  it('should return pagination object with all required properties', async () => {
    try {
      const result = await spotService.getSpots({}, { limit: 10, offset: 0 });
      
      // Verify pagination object has all required properties
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBeDefined();
      expect(result.pagination.limit).toBeDefined();
      expect(result.pagination.offset).toBeDefined();
      expect(result.pagination.total).toBeDefined();
      expect(result.pagination.totalPages).toBeDefined();
      expect(result.pagination.hasNextPage).toBeDefined();
      expect(result.pagination.hasPreviousPage).toBeDefined();

      // Verify metadata is present
      expect(result.metadata).toBeDefined();
      expect(result.metadata.statusCounts).toBeDefined();
      expect(result.metadata.typeCounts).toBeDefined();
      expect(result.metadata.occupancyRate).toBeDefined();

      console.log('✓ All pagination properties are present');
      console.log('✓ Metadata structure is correct');
      console.log('✓ No TypeScript compilation errors');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  it('should handle empty spot results gracefully', async () => {
    try {
      // Test with filters that return no results
      const result = await spotService.getSpots({ 
        status: 'available', 
        floor: 999 // Non-existent floor
      }, { limit: 10, offset: 0 });
      
      // Should not throw errors and should have valid pagination
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(false);

      console.log('✓ Empty results handled correctly');
    } catch (error) {
      console.error('Empty results test failed:', error);
      throw error;
    }
  });
});