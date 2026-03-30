import { PrismaClient, ServiceType } from '@prisma/client';

import prisma from '../../prisma.js';
interface CreateAccessLogInput {
    userId: string;
    serviceType: ServiceType;
}

class AccessLogCreator {
    async create(input: CreateAccessLogInput) {
        return prisma.accessLog.create({
            data: {
                userId: input.userId,
                serviceType: input.serviceType,
                timeStamp: new Date()
            }
        });
    }
}

export const accessLogCreator = new AccessLogCreator();