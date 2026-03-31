import prisma from '../../prisma.js';
interface CreatePaymentInput {
    bookingId: string;
    amount: number;
}

class PaymentCreator {
    async create(input: CreatePaymentInput) {
        return prisma.payment.create({
            data: {
                bookingId: input.bookingId,
                amount: input.amount,
                status: 'PAID',
                timestamp: new Date()
            }
        });
    }
}

export const paymentCreator = new PaymentCreator();