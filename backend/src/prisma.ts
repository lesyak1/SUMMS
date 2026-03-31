import { PrismaClient } from '@prisma/client';

let url = process.env.DATABASE_URL || '';

// Supabase's Session mode (port 5432) limits connections strictly causing MaxClientsInSessionMode crashes,
// especially during hot-reloads (tsx watch) which leave ghost connections.
// Transaction mode (port 6543) with pgbouncer=true resolves this completely.
if (url.includes('.pooler.supabase.com:5432')) {
    url = url.replace(':5432', ':6543');
    url += url.includes('?') ? '&pgbouncer=true&connection_limit=5' : '?pgbouncer=true&connection_limit=5';
} else if (url && !url.includes('connection_limit')) {
    url += url.includes('?') ? '&connection_limit=5' : '?connection_limit=5';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url,
    },
  },
});

export default prisma;
