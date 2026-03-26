import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- FINANCE DIAGNOSTICS ---");
  
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
  console.log(`Found ${tenants.length} tenants.`);

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (${tenant.slug}) [ID: ${tenant.id}]`);
    
    // Check Invoices (schema management contains mostly shared logic,
    // but the system clones it. Let's see if there are invoices in the main database first)
    // Actually, in this project, invoices are often in the management schema? 
    // Wait, let's check WHERE the invoices are.
    
    const count = await prisma.invoice.count();
    console.log(`Total Invoices in Management Schema: ${count}`);
    
    if (count > 0) {
        const sample = await prisma.invoice.findFirst();
        console.log("Sample Invoice:", JSON.stringify(sample, null, 2));
        
        const stats = await prisma.invoice.groupBy({
            by: ['status'],
            _count: true
        });
        console.log("Invoice Stats:", stats);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
