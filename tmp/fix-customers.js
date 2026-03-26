const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixCustomers(tenantSlug) {
  console.log(`\n--- FIXING CUSTOMERS AND PLANS FOR ${tenantSlug} ---`);
  
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return console.error("Tenant not found!");

  const schemaName = `tenant_${tenantSlug}`;
  await prisma.$executeRawUnsafe(`SET search_path = "${schemaName}", "management", "public"`);

  // 1. Ensure a plan exists
  let plan = await prisma.plan.findFirst();
  if (!plan) {
      console.log("No plans found. Creating 'FIBRA 100MB' plan...");
      plan = await prisma.plan.create({
          data: {
              name: "FIBRA 100MB",
              price: 99.90,
              upload: 50,
              download: 100,
              description: "Plano de teste gerado pelo sistema"
          }
      });
  }

  // 2. Identify the seed customers
  const customers = await prisma.customer.findMany({
      where: {
          OR: [
              { name: "João Silva" },
              { name: "Maria Oliveira" },
              { name: "Empresa ABC" }
          ]
      }
  });

  for (const customer of customers) {
      console.log(`Fixing Customer: ${customer.name}`);
      
      // Clean invoices first (so they can be deleted later)
      await prisma.invoice.deleteMany({
          where: { customerId: customer.id }
      });
      
      // Update with mandatory fields for editing
      await prisma.customer.update({
          where: { id: customer.id },
          data: {
              phone: "11999999999",
              planId: plan.id,
              email: customer.email || `contato_${customer.id.slice(0,4)}@exemplo.com`
          }
      });
  }
  
  console.log("Success! Plan created and customers updated. You can now edit/delete them.");
}

fixCustomers("lyncoln")
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
