/**
 * Shared JWT configuration.
 * Single source of truth for JWT secret and options,
 * used by both JwtModule.register() and JwtStrategy.
 */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026',
  signOptions: { expiresIn: '1h' },
} as const;

export const JWT_REFRESH_CONFIG = {
  secret: process.env.JWT_REFRESH_SECRET || 'sridattam-dev-jwt-refresh-secret-key-2026',
  signOptions: { expiresIn: '7d' },
} as const;
