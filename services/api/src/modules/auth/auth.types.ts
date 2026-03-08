export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Tokens {
  access: string;
  refresh: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}
