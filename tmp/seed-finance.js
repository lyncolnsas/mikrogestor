const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedFinance(tenantSlug) {
  console.log(`\n--- SEEDING FINANCE FOR ${tenantSlug} ---`);
  
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return console.error("Tenant not found!");

  const schemaName = `tenant_${tenantSlug}`;
  console.log(`Target Schema: ${schemaName}`);

  // Use raw queries to set search_path
  await prisma.$executeRawUnsafe(`SET search_path = "${schemaName}", "management", "public"`);

  // Check Customers
  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
      console.log("Creating sample customers...");
      await prisma.customer.createMany({
          data: [
              { name: "João Silva", cpfCnpj: "123.456.789-01", status: "ACTIVE" },
              { name: "Maria Oliveira", cpfCnpj: "987.654.321-02", status: "ACTIVE" },
              { name: "Empresa ABC", cpfCnpj: "12.345.678/0001-99", status: "ACTIVE" },
          ]
      });
  }

  const customers = await prisma.customer.findMany();
  
  console.log("Cleaning old invoices...");
  await prisma.invoice.deleteMany();

  console.log("Creating 20 fresh invoices...");
  const statuses = ["PAID", "OPEN", "OVERDUE"];
  const types = ["PIX", "BOLETO", "CREDIT_CARD"];
  
  for (let i = 0; i < 20; i++) {
      const customer = customers[i % customers.length];
      const date = new Date();
      date.setMonth(date.getMonth() - Math.floor(Math.random() * 6)); // Last 6 months
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      await prisma.invoice.create({
          data: {
              customerId: customer.id,
              total: 100 + Math.random() * 800,
              status: status,
              billingType: types[Math.floor(Math.random() * types.length)],
              dueDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
              paidAt: status === "PAID" ? date : null,
              createdAt: date
          }
      });
  }
  
  console.log("Success! Dashboard should be alive now.");
}

seedFinance("lyncoln")
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
