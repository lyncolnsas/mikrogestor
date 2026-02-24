import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: "postgresql://postgres:mikrogestor_secure_2026@db:5432/mikrogestor_prod?schema=management&search_path=management,tenant_template,radius"
        }
    }
})

async function main() {
    console.log("--- ADVANCED Database Diagnostic ---")

    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, slug: true }
    })
    console.log(`Found ${tenants.length} Tenants.`)

    for (const tenant of tenants) {
        const schema = `tenant_${tenant.slug.replace(/-/g, '_')}`
        console.log(`\nTesting Tenant: ${tenant.slug} (Schema: ${schema})`)

        // Let's manually set search_path to simulate the extension
        try {
            await prisma.$executeRawUnsafe(`SET search_path = "${schema}", "management", "radius", "public"`)

            // 1. Count using Prisma
            const count = await prisma.customer.count({
                where: { status: 'ACTIVE' }
            })
            console.log(`Prisma count(ACTIVE) for ${tenant.slug}: ${count}`)

            // 2. findMany using Prisma
            const all = await prisma.customer.findMany({
                include: { plan: true },
                take: 10
            })
            console.log(`Prisma findMany all for ${tenant.slug}: ${all.length}`)
            if (all.length > 0) {
                console.log(`First customer data:`, { id: all[0].id, name: all[0].name, plan: all[0].plan?.name })
            } else {
                // If it's 0 but count was 7, maybe there's a bug in findMany?
                console.log("WAIT! Count > 0 but findMany is empty! Checking Statuses...")
                const statuses: any = await prisma.$queryRawUnsafe(`SELECT status, count(*) FROM "${schema}".customers GROUP BY status`)
                console.log("Actual statuses in DB:", statuses)
            }

        } catch (e: any) {
            console.log(` Error for ${tenant.slug}: ${e.message}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
