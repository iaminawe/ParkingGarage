export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'operator' | 'customer'
  avatar?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData extends LoginCredentials {
  name: string
  confirmPassword: string
  firstName?: string
  lastName?: string
}

export interface ValidationErrors {
  [key: string]: string
}

export interface FormValidation<T> {
  isValid: boolean
  errors: ValidationErrors
  data: T
}