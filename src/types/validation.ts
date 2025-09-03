/**
 * Validation and schema type definitions
 *
 * This module provides comprehensive type definitions for data validation,
 * schema definitions, sanitization, and input processing throughout the application.
 */

// Core validation types
export interface DataValidationResult {
  isValid: boolean;
  errors: DataValidationError[];
  warnings?: ValidationWarning[];
  data?: any;
}

export interface DataValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  constraints?: Record<string, any>;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

// Schema definition types
export interface DataValidationSchema {
  [key: string]: FieldSchema;
}

export interface FieldSchema {
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  default?: any;
  rules?: ValidationRule[];
  transform?: TransformFunction;
  custom?: CustomValidatorFunction;
  description?: string;
  example?: any;
}

export type FieldType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'date'
  | 'email'
  | 'url'
  | 'uuid'
  | 'phone'
  | 'password'
  | 'enum';

export interface ValidationRule {
  name: string;
  value?: any;
  message?: string;
}

export type TransformFunction = (value: any) => any;
export type CustomValidatorFunction = (value: any, context?: ValidationContext) => DataValidationResult | Promise<DataValidationResult>;

// Validation context
export interface ValidationContext {
  data: Record<string, any>;
  schema: DataValidationSchema;
  path: string[];
  options: DataValidationOptions;
  parent?: ValidationContext;
}

export interface DataValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  skipMissing?: boolean;
  recursive?: boolean;
  context?: Record<string, any>;
  messages?: Record<string, string>;
}

// Built-in validation rules
export interface StringRules {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?: 'email' | 'url' | 'uuid' | 'phone' | 'date' | 'time' | 'datetime';
  enum?: string[];
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

export interface NumberRules {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  multipleOf?: number;
}

export interface ArrayRules {
  minLength?: number;
  maxLength?: number;
  unique?: boolean;
  items?: FieldSchema;
}

export interface ObjectRules {
  properties?: DataValidationSchema;
  requiredProperties?: string[];
  additionalProperties?: boolean | FieldSchema;
}

// Sanitization types
export interface DataSanitizationRule {
  field: string;
  method: SanitizationMethod;
  options?: Record<string, any>;
}

export type SanitizationMethod = 
  | 'trim'
  | 'escape'
  | 'normalize'
  | 'stripTags'
  | 'blacklist'
  | 'whitelist'
  | 'toBoolean'
  | 'toInt'
  | 'toFloat'
  | 'toLowerCase'
  | 'toUpperCase'
  | 'removeEmptyStrings'
  | 'removeNull'
  | 'removeUndefined';

export interface DataSanitizationConfig {
  body?: DataSanitizationRule[];
  query?: DataSanitizationRule[];
  params?: DataSanitizationRule[];
  headers?: DataSanitizationRule[];
}

export interface SanitizationResult {
  data: any;
  changes: SanitizationChange[];
}

export interface SanitizationChange {
  field: string;
  from: any;
  to: any;
  method: SanitizationMethod;
}

// Request validation types
export interface RequestValidationSchema {
  body?: DataValidationSchema;
  query?: DataValidationSchema;
  params?: DataValidationSchema;
  headers?: DataValidationSchema;
}

export interface RequestValidationResult {
  isValid: boolean;
  errors: DataValidationError[];
  validated: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
}

// Domain-specific validation schemas  
// Vehicle validation
export interface DataVehicleValidationRules {
  licensePlate: {
    pattern: RegExp;
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  vehicleType: {
    enum: string[];
    required: boolean;
  };
  checkIn: {
    dateFormat: string;
    futureAllowed: boolean;
  };
  rateType: {
    enum: string[];
    default: string;
  };
}

export interface VehicleSearchValidation {
  licensePlate?: StringRules;
  vehicleType?: { enum: string[] };
  spotId?: { pattern: RegExp };
  floor?: NumberRules;
  dateFrom?: { format: 'date' };
  dateTo?: { format: 'date' };
}

// Spot validation
export interface DataSpotValidationRules {
  floor: NumberRules & {
    required: boolean;
  };
  bay: NumberRules & {
    required: boolean;
  };
  spotNumber: NumberRules & {
    required: boolean;
  };
  type: {
    enum: string[];
    required: boolean;
  };
  features: {
    array: true;
    items: { enum: string[] };
  };
}

export interface SpotFilterValidation {
  available?: { type: 'boolean' };
  vehicleType?: { enum: string[] };
  features?: ArrayRules;
  floor?: NumberRules;
  bay?: NumberRules;
}

// User validation
export interface UserValidationRules {
  email: StringRules & {
    format: 'email';
    required: boolean;
  };
  password: {
    minLength: number;
    pattern: RegExp;
    required: boolean;
  };
  firstName: StringRules;
  lastName: StringRules;
  phoneNumber: {
    pattern: RegExp;
    format: 'phone';
  };
  role: {
    enum: string[];
  };
}

// File validation
export interface FileValidationRules {
  allowedMimeTypes: string[];
  maxSize: number; // in bytes
  minSize?: number;
  allowedExtensions: string[];
  requireImage?: boolean;
  dimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface FileValidationResult extends DataValidationResult {
  file?: {
    originalName: string;
    mimeType: string;
    size: number;
    extension: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

// Business logic validation
export interface BusinessRuleResult {
  isValid: boolean;
  errors: BusinessRuleError[];
  warnings?: BusinessRuleWarning[];
}

export interface BusinessRuleError {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, any>;
}

export interface BusinessRuleWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// Custom validators for the parking system
export interface ParkingBusinessRules {
  spotAvailability: (spotId: string) => Promise<BusinessRuleResult>;
  vehicleDuplication: (licensePlate: string) => Promise<BusinessRuleResult>;
  rateCalculation: (checkIn: Date, checkOut: Date, rateType: string) => BusinessRuleResult;
  spotCompatibility: (vehicleType: string, spotType: string) => BusinessRuleResult;
  floorCapacity: (floor: number) => Promise<BusinessRuleResult>;
  paymentValidation: (amount: number, calculatedAmount: number) => BusinessRuleResult;
}

// API validation middleware types
export interface DataValidationMiddlewareConfig {
  body?: DataValidationSchema;
  query?: DataValidationSchema;
  params?: DataValidationSchema;
  options?: DataValidationOptions;
  onError?: (errors: DataValidationError[]) => void;
}

export interface ValidationMiddlewareFactory {
  body: (schema: DataValidationSchema, options?: DataValidationOptions) => Function;
  query: (schema: DataValidationSchema, options?: DataValidationOptions) => Function;
  params: (schema: DataValidationSchema, options?: DataValidationOptions) => Function;
  files: (rules: FileValidationRules, options?: DataValidationOptions) => Function;
  businessRules: (rules: BusinessRuleValidator[]) => Function;
}

export type BusinessRuleValidator = (data: any, context?: any) => Promise<BusinessRuleResult>;

// Validation registry for reusable schemas
export interface ValidationRegistry {
  register: (name: string, schema: DataValidationSchema) => void;
  get: (name: string) => DataValidationSchema | undefined;
  exists: (name: string) => boolean;
  list: () => string[];
}

// Schema composition types
export interface SchemaComposition {
  extend: (base: DataValidationSchema, extension: DataValidationSchema) => DataValidationSchema;
  merge: (schemas: DataValidationSchema[]) => DataValidationSchema;
  pick: (schema: DataValidationSchema, fields: string[]) => DataValidationSchema;
  omit: (schema: DataValidationSchema, fields: string[]) => DataValidationSchema;
}

// Async validation types
export interface AsyncValidationContext extends ValidationContext {
  abortSignal?: AbortSignal;
  timeout?: number;
}

export type AsyncValidatorFunction = (
  value: any, 
  context?: AsyncValidationContext
) => Promise<DataValidationResult>;

// Error aggregation
export interface ValidationErrorSummary {
  totalErrors: number;
  errorsByField: Record<string, DataValidationError[]>;
  errorsBySeverity: {
    critical: DataValidationError[];
    warning: DataValidationError[];
    info: DataValidationError[];
  };
  firstError?: DataValidationError;
}

// Default export for namespace-style imports
const ValidationTypes = {
  // Type placeholders for namespace organization
} as const;

export default ValidationTypes;
