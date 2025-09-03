export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  WEAK_PASSWORD: 'Password must be at least 8 characters long',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  GENERIC_ERROR: 'An error occurred. Please try again.'
} as const

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'authToken',
  USER: 'user',
  REFRESH_TOKEN: 'refreshToken'
} as const
