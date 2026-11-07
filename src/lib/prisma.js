import { PrismaClient } from '@prisma/client'

// Reuse a single PrismaClient across hot-reloads / serverless invocations.
const globalForPrisma = globalThis
export const prisma = globalForPrisma.__prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma
