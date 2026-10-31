import 'dotenv/config';

const secret =
  process.env.JWT_SECRET || 'dev_jwt_secret_key_1234567890_sridattam';
const refreshSecret =
  process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_1234567890_sridattam';

if (secret === refreshSecret) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must not be identical.');
}

export const JWT_CONFIG = {
  secret,
  signOptions: { expiresIn: '1h' },
} as const;

export const JWT_REFRESH_CONFIG = {
  secret: refreshSecret,
  signOptions: { expiresIn: '7d' },
} as const;
