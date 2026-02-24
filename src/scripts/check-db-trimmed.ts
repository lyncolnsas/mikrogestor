import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:mikrogestor_secure_2026@db:5432/mikrogestor_prod?schema=management&search_path=management,tenant_template,radius"
        }
    }
})

async function main() {
    console.log("Diag Start")
    const tenants = await prisma.tenant.findMany({ select: { slug: true } })
    for (const tenant of tenants) {
        const schema = `tenant_${tenant.slug.replace(/-/g, '_')}`
        await prisma.$executeRawUnsafe(`SET search_path = "${schema}", "management", "radius", "public"`)

        const cCount = await prisma.customer.count({ where: { status: 'ACTIVE' } })
        const fCount = (await prisma.customer.findMany({ include: { plan: true } })).length

        console.log(`Tenant: ${tenant.slug} | ActiveCount: ${cCount} | FindManyCount: ${fCount}`)
    }
    console.log("Diag End")
}

main().finally(() => prisma.$disconnect())
