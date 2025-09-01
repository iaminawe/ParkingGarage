// Garage Configuration Components
export { GarageConfiguration } from './GarageConfiguration'
export { default as GeneralSettings } from './GeneralSettings'
export { default as PricingSettings } from './PricingSettings'
export { default as LayoutSettings } from './LayoutSettings'
export { default as IntegrationSettings } from './IntegrationSettings'
export { default as OperationalSettings } from './OperationalSettings'

// Export types for convenience
export type {
  GarageConfiguration as GarageConfigType,
  GeneralConfig,
  PricingConfig,
  LayoutConfig,
  IntegrationConfig,
  OperationalConfig,
  ConfigurationBackup
} from '@/types/api'