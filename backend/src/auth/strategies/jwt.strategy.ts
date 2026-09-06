import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
<<<<<<< HEAD
=======
import { JWT_CONFIG } from '../jwt.config';
>>>>>>> origin/feature/customer-account-staff-admin-portal

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
<<<<<<< HEAD
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
=======
      secretOrKey: JWT_CONFIG.secret,
>>>>>>> origin/feature/customer-account-staff-admin-portal
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}