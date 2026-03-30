import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        let decodedUser: any;
        if (secret) {
            decodedUser = jwt.verify(token, secret);
        } else {
            decodedUser = jwt.decode(token);
        }

        if (!decodedUser || !decodedUser.sub) {
            console.error("\n❌ [AUTH ERROR] Token Decode Failed. Payload is invalid or missing 'sub'. Payload:", decodedUser);
            return res.status(403).json({ error: 'Forbidden: Invalid token' });
        }

        const userId = decodedUser.sub;

        const user = await prisma.userProfile.findUnique({
            where: { id: userId },
        });

        if (!user) {
            console.error(`\n❌ [AUTH ERROR] User Profile not found in database for ID: ${userId}`);
            return res.status(401).json({ error: 'Unauthorized: User not found in database' });
        }

        req.user = user;
        next();
    } catch (err: any) {
        console.error("\n❌ [AUTH EXCEPTION] Caught error in middleware:", err);
        return res.status(403).json({ error: 'Forbidden: Token verification failed', details: err.message });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Forbidden: Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
};
