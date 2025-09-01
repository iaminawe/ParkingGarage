import type { LoginCredentials, SignupData, ValidationErrors, FormValidation } from '@/types/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

export const validateEmail = (email: string): string | undefined => {
  if (!email) {
    return 'Email is required'
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address'
  }
  return undefined
}

export const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return 'Password is required'
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/(?=.*\d)/.test(password)) {
    return 'Password must contain at least one number'
  }
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    return 'Password must contain at least one special character'
  }
  return undefined
}

export const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) {
    return 'Please confirm your password'
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }
  return undefined
}

export const validateName = (name: string, fieldName: string): string | undefined => {
  if (!name) {
    return `${fieldName} is required`
  }
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters long`
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
  }
  return undefined
}

export const validateLoginForm = (credentials: LoginCredentials): FormValidation<LoginCredentials> => {
  const errors: ValidationErrors = {}
  
  const emailError = validateEmail(credentials.email)
  if (emailError) errors.email = emailError
  
  const passwordError = validatePassword(credentials.password)
  if (passwordError) errors.password = passwordError
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: credentials
  }
}

export const validateSignupForm = (data: SignupData): FormValidation<SignupData> => {
  const errors: ValidationErrors = {}
  
  const emailError = validateEmail(data.email)
  if (emailError) errors.email = emailError
  
  const passwordError = validatePassword(data.password)
  if (passwordError) errors.password = passwordError
  
  const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword)
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError
  
  const firstNameError = validateName(data.firstName || '', 'First name')
  if (firstNameError) errors.firstName = firstNameError
  
  const lastNameError = validateName(data.lastName || '', 'Last name')
  if (lastNameError) errors.lastName = lastNameError
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data
  }
}

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (!password) return 'weak'
  
  let score = 0
  
  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'strong':
      return 'bg-green-500'
    default:
      return 'bg-gray-300'
  }
}
