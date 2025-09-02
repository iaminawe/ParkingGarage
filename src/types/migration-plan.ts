/**
 * TypeScript Migration Plan and Dependency Analysis
 *
 * This file contains the analysis of dependencies between JavaScript modules
 * and provides a structured plan for migrating them to TypeScript in the
 * optimal order to minimize circular dependencies and breaking changes.
 */

// Dependency Analysis
export interface ModuleDependency {
  module: string;
  dependsOn: string[];
  importedBy: string[];
  complexity: 'low' | 'medium' | 'high';
  migrationPriority: number;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  notes: string[];
}

export const JAVASCRIPT_MODULES_ANALYSIS: ModuleDependency[] = [
  {
    module: 'src/storage/memoryStore.js',
    dependsOn: [],
    importedBy: [
      'src/services/garageService.js',
      'src/services/spotService.js',
      'src/services/analyticsService.js',
    ],
    complexity: 'low',
    migrationPriority: 1,
    riskLevel: 'low',
    estimatedEffort: '2 hours',
    notes: [
      'Singleton pattern implementation',
      'No external dependencies',
      'Simple Map-based storage',
      'Well-defined interface',
    ],
  },
  {
    module: 'src/models/spot.js',
    dependsOn: ['src/utils/validators.js'],
    importedBy: [
      'src/models/garage.js',
      'src/services/spotService.js',
      'src/services/garageService.js',
      'src/services/spotAssignmentService.js',
    ],
    complexity: 'medium',
    migrationPriority: 2,
    riskLevel: 'low',
    estimatedEffort: '3 hours',
    notes: [
      'Class-based model with methods',
      'Validation dependencies',
      'Well-structured with clear interface',
      'Used by multiple services',
    ],
  },
  {
    module: 'src/models/vehicle.js',
    dependsOn: ['src/utils/validators.js'],
    importedBy: [
      'src/services/checkinService.js',
      'src/services/checkoutService.js',
      'src/services/analyticsService.js',
    ],
    complexity: 'medium',
    migrationPriority: 2,
    riskLevel: 'low',
    estimatedEffort: '3 hours',
    notes: [
      'Class-based model with business logic',
      'Billing calculation methods',
      'Validation dependencies',
      'Core domain model',
    ],
  },
  {
    module: 'src/models/garage.js',
    dependsOn: ['src/models/spot.js', 'src/utils/validators.js'],
    importedBy: ['src/services/garageService.js', 'src/services/analyticsService.js'],
    complexity: 'medium',
    migrationPriority: 3,
    riskLevel: 'medium',
    estimatedEffort: '4 hours',
    notes: [
      'Depends on Spot model',
      'Complex configuration structure',
      'Floor and bay management',
      'Rate calculations',
    ],
  },
  {
    module: 'src/services/spotAssignmentService.js',
    dependsOn: ['src/repositories/spotRepository.js', 'src/models/spot.js'],
    importedBy: ['src/services/checkinService.js', 'src/routes/spots.js'],
    complexity: 'high',
    migrationPriority: 4,
    riskLevel: 'medium',
    estimatedEffort: '6 hours',
    notes: [
      'Complex algorithm implementation',
      'Repository dependencies',
      'Scoring and optimization logic',
      'Business rule implementation',
    ],
  },
  {
    module: 'src/services/billingService.js',
    dependsOn: ['src/utils/timeCalculator.js'],
    importedBy: ['src/services/checkoutService.js', 'src/controllers/checkoutController.js'],
    complexity: 'high',
    migrationPriority: 4,
    riskLevel: 'medium',
    estimatedEffort: '5 hours',
    notes: [
      'Complex billing calculations',
      'Rate type handling',
      'Feature premium calculations',
      'Grace period logic',
    ],
  },
  {
    module: 'src/services/analyticsService.js',
    dependsOn: [
      'src/repositories/garageRepository.js',
      'src/repositories/spotRepository.js',
      'src/repositories/vehicleRepository.js',
    ],
    importedBy: ['src/controllers/statsController.js', 'src/routes/stats.js'],
    complexity: 'high',
    migrationPriority: 5,
    riskLevel: 'high',
    estimatedEffort: '8 hours',
    notes: [
      'Multiple repository dependencies',
      'Complex statistical calculations',
      'Revenue and trend analysis',
      'Performance-critical code',
    ],
  },
  {
    module: 'src/app.js',
    dependsOn: ['src/routes/*.js', 'src/middleware/errorHandler.js'],
    importedBy: ['src/server.js'],
    complexity: 'medium',
    migrationPriority: 6,
    riskLevel: 'medium',
    estimatedEffort: '4 hours',
    notes: [
      'Express application setup',
      'Middleware configuration',
      'Route mounting',
      'Security configuration',
    ],
  },
  {
    module: 'src/server.js',
    dependsOn: ['src/app.js', 'src/utils/seedData.js'],
    importedBy: [],
    complexity: 'low',
    migrationPriority: 7,
    riskLevel: 'low',
    estimatedEffort: '2 hours',
    notes: [
      'Server startup logic',
      'Process management',
      'Graceful shutdown',
      'Environment configuration',
    ],
  },
  {
    module: 'src/routes/vehicles.js',
    dependsOn: ['src/controllers/VehicleController.js', 'src/middleware/validation/*.js'],
    importedBy: ['src/routes/index.js'],
    complexity: 'medium',
    migrationPriority: 8,
    riskLevel: 'low',
    estimatedEffort: '3 hours',
    notes: ['Route definitions', 'Middleware chaining', 'Validation integration', 'Error handling'],
  },
];

// Migration Plan Phases
export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  duration: string;
  modules: string[];
  objectives: string[];
  risks: string[];
  prerequisites: string[];
  deliverables: string[];
}

export const MIGRATION_PHASES: MigrationPhase[] = [
  {
    phase: 1,
    name: 'Foundation',
    description: 'Migrate core utilities and data storage without external dependencies',
    duration: '1-2 days',
    modules: ['src/storage/memoryStore.js'],
    objectives: [
      'Establish TypeScript foundation',
      'Create singleton pattern types',
      'Implement Map-based storage types',
      'No breaking changes',
    ],
    risks: ['Minimal risk - no dependencies'],
    prerequisites: [
      'TypeScript configuration complete',
      'Build system configured',
      'Testing infrastructure ready',
    ],
    deliverables: ['src/storage/MemoryStore.ts', 'Updated type definitions', 'Unit tests passing'],
  },
  {
    phase: 2,
    name: 'Domain Models',
    description: 'Migrate core domain models (Spot, Vehicle) with their business logic',
    duration: '2-3 days',
    modules: ['src/models/spot.js', 'src/models/vehicle.js'],
    objectives: [
      'Convert class-based models to TypeScript',
      'Maintain existing API contracts',
      'Strengthen type safety',
      'Preserve business logic',
    ],
    risks: ['Validation logic complexity', 'Method signature changes', 'Inheritance patterns'],
    prerequisites: [
      'Validator utilities migrated',
      'Phase 1 complete',
      'Type definitions available',
    ],
    deliverables: [
      'src/models/Spot.ts',
      'src/models/Vehicle.ts',
      'Enhanced type definitions',
      'Model tests updated',
    ],
  },
  {
    phase: 3,
    name: 'Complex Models',
    description: 'Migrate garage model with dependencies on other models',
    duration: '1-2 days',
    modules: ['src/models/garage.js'],
    objectives: [
      'Handle inter-model dependencies',
      'Complex configuration types',
      'Rate calculation logic',
      'Floor/bay management',
    ],
    risks: [
      'Circular dependency potential',
      'Complex nested structures',
      'Configuration validation',
    ],
    prerequisites: ['Phase 2 complete', 'Spot model migrated', 'Repository interfaces ready'],
    deliverables: ['src/models/Garage.ts', 'Configuration type definitions', 'Integration tests'],
  },
  {
    phase: 4,
    name: 'Business Services',
    description: 'Migrate complex business logic services',
    duration: '3-4 days',
    modules: ['src/services/spotAssignmentService.js', 'src/services/billingService.js'],
    objectives: [
      'Complex algorithm implementations',
      'Business rule enforcement',
      'Performance optimization',
      'Service interface compliance',
    ],
    risks: [
      'Algorithm complexity',
      'Performance regressions',
      'Business logic changes',
      'Repository integration',
    ],
    prerequisites: [
      'Phase 3 complete',
      'Repository interfaces defined',
      'Time calculator utilities ready',
    ],
    deliverables: [
      'src/services/SpotAssignmentService.ts',
      'src/services/BillingService.ts',
      'Service interface implementations',
      'Performance benchmarks',
    ],
  },
  {
    phase: 5,
    name: 'Analytics & Reporting',
    description: 'Migrate analytics service with multiple dependencies',
    duration: '2-3 days',
    modules: ['src/services/analyticsService.js'],
    objectives: [
      'Statistical calculation accuracy',
      'Multi-repository coordination',
      'Performance optimization',
      'Data aggregation logic',
    ],
    risks: [
      'High complexity',
      'Multiple dependencies',
      'Performance critical code',
      'Data consistency',
    ],
    prerequisites: [
      'All repository interfaces complete',
      'Phase 4 complete',
      'Performance monitoring ready',
    ],
    deliverables: [
      'src/services/AnalyticsService.ts',
      'Statistical type definitions',
      'Performance tests',
      'Data validation',
    ],
  },
  {
    phase: 6,
    name: 'Application Layer',
    description: 'Migrate application setup and server components',
    duration: '2 days',
    modules: ['src/app.js', 'src/server.js', 'src/routes/vehicles.js'],
    objectives: [
      'Express application typing',
      'Middleware integration',
      'Route type safety',
      'Error handling enhancement',
    ],
    risks: ['Middleware compatibility', 'Route handler types', 'Express version dependencies'],
    prerequisites: [
      'All service migrations complete',
      'Middleware types defined',
      'Route validation ready',
    ],
    deliverables: [
      'src/app.ts',
      'src/server.ts',
      'src/routes/vehicles.ts',
      'Application startup types',
      'Integration tests',
    ],
  },
];

// Risk Assessment
export interface RiskAssessment {
  category: string;
  risks: {
    risk: string;
    impact: 'low' | 'medium' | 'high';
    probability: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
}

export const MIGRATION_RISKS: RiskAssessment[] = [
  {
    category: 'Circular Dependencies',
    risks: [
      {
        risk: 'Model interdependencies creating circular imports',
        impact: 'high',
        probability: 'medium',
        mitigation: 'Use interface segregation and dependency injection patterns',
      },
      {
        risk: 'Service layer circular dependencies',
        impact: 'medium',
        probability: 'low',
        mitigation: 'Extract interfaces and use dependency inversion',
      },
    ],
  },
  {
    category: 'Type Safety',
    risks: [
      {
        risk: 'Loose typing in existing JavaScript code',
        impact: 'medium',
        probability: 'high',
        mitigation: 'Gradual typing approach with strict null checks',
      },
      {
        risk: 'Dynamic property access patterns',
        impact: 'medium',
        probability: 'medium',
        mitigation: 'Use index signatures and mapped types',
      },
    ],
  },
  {
    category: 'Performance',
    risks: [
      {
        risk: 'TypeScript compilation overhead',
        impact: 'low',
        probability: 'low',
        mitigation: 'Optimize build configuration and use incremental compilation',
      },
      {
        risk: 'Runtime type checking overhead',
        impact: 'medium',
        probability: 'low',
        mitigation: 'Use compile-time types only, avoid runtime type guards where possible',
      },
    ],
  },
  {
    category: 'Integration',
    risks: [
      {
        risk: 'Middleware compatibility issues',
        impact: 'high',
        probability: 'medium',
        mitigation: 'Create proper Express middleware types and test thoroughly',
      },
      {
        risk: 'Third-party library type conflicts',
        impact: 'medium',
        probability: 'medium',
        mitigation: 'Use @types packages and create custom declarations where needed',
      },
    ],
  },
];

// Conversion Guidelines
export interface ConversionGuideline {
  pattern: string;
  description: string;
  before: string;
  after: string;
  notes: string[];
}

export const CONVERSION_GUIDELINES: ConversionGuideline[] = [
  {
    pattern: 'Class Constructor Validation',
    description: 'Convert validation in constructors to TypeScript types',
    before: `constructor(data) {
  const validation = validate(data);
  if (!validation.isValid) {
    throw new Error(...);
  }
}`,
    after: `constructor(data: ValidatedData) {
  // Validation now handled by TypeScript type system
  // Runtime validation still possible if needed
}`,
    notes: [
      'Move validation to interface level where possible',
      'Keep runtime validation for external data',
      'Use branded types for validated data',
    ],
  },
  {
    pattern: 'Dynamic Property Access',
    description: 'Handle dynamic property access with proper typing',
    before: `const value = obj[key];`,
    after: `const value = obj[key as keyof typeof obj];
// Or use index signature:
interface DynamicObject {
  [key: string]: unknown;
}`,
    notes: [
      'Use keyof for known object shapes',
      'Use index signatures for truly dynamic objects',
      'Consider mapped types for transformation',
    ],
  },
  {
    pattern: 'Callback Functions',
    description: 'Type callback functions properly',
    before: `function process(callback) {
  callback(result);
}`,
    after: `function process<T>(callback: (result: T) => void): void {
  callback(result);
}`,
    notes: [
      'Use generic types for flexible callbacks',
      'Define callback interfaces for complex cases',
      'Consider Promise-based alternatives',
    ],
  },
];

// Success Metrics
export interface SuccessMetric {
  metric: string;
  target: string;
  measurement: string;
}

export const SUCCESS_METRICS: SuccessMetric[] = [
  {
    metric: 'Type Coverage',
    target: '> 90%',
    measurement: 'TypeScript compiler strict mode with no any types',
  },
  {
    metric: 'Build Time',
    target: '< 10% increase',
    measurement: 'Compare compilation time before and after migration',
  },
  {
    metric: 'Test Coverage',
    target: '100% tests passing',
    measurement: 'All existing tests should pass without modification',
  },
  {
    metric: 'Performance',
    target: 'No regression',
    measurement: 'Runtime performance benchmarks',
  },
  {
    metric: 'Bundle Size',
    target: '< 5% increase',
    measurement: 'Production bundle size comparison',
  },
];

export default {
  JAVASCRIPT_MODULES_ANALYSIS,
  MIGRATION_PHASES,
  MIGRATION_RISKS,
  CONVERSION_GUIDELINES,
  SUCCESS_METRICS,
};
