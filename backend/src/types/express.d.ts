import type { Request } from 'express';
import { UserProfile } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}
