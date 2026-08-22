/**
 * Shared JWT configuration.
 * Single source of truth for JWT secret and options,
 * used by both JwtModule.register() and JwtStrategy.
 */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'sridattam-dev-jwt-secret-key-2024',
  signOptions: { expiresIn: '1d' },
} as const;
