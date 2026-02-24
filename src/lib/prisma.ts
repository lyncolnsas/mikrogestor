import { PrismaClient } from "@prisma/client"
import { tenancyExtension } from "@/shared/tenancy/prisma-tenancy.extension"

export type ExtendedPrismaClient = ReturnType<typeof tenancyExtension>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient }

const createPrismaClient = () => {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    })
    return tenancyExtension(client)
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
