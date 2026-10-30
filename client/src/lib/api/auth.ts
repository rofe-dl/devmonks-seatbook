import { request } from './http';

/** Roles from the server's Prisma `Role` enum. */
export type UserRole = 'ORGANIZER' | 'ATTENDEE';

/** The user object returned by /auth/login and /auth/register. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Body for POST /auth/login. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Body for POST /auth/register. */
export interface RegisterInput extends LoginInput {
  name: string;
  role?: UserRole;
}

/**
 * POST /auth/login
 *
 * 401 with `{ message }` when the credentials are invalid.
 */
export function login(input: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

/**
 * POST /auth/register
 *
 * 409 with `{ error }` when the email is already registered.
 */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', { method: 'POST', body: input });
}
