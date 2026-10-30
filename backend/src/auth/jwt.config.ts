import 'dotenv/config';

const secret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET environment variable is missing.');
}

if (!refreshSecret) {
  throw new Error('JWT_REFRESH_SECRET environment variable is missing.');
}

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
