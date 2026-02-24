import { PrismaClient, CustomerStatus, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

const RANDOM_NAMES = [
    "João Silva", "Maria Oliveira", "Padaria Central", "Mercado Bom Preço",
    "Carlos Santos", "Ana Pereira", "Tech Soluções", "Escola Futuro",
    "Condomínio Flores", "Pedro Souza", "Fernanda Lima", "Restaurante Sabor",
    "Academia Fit", "Lucas Alves", "Juliana Costa", "Clinica Saúde"
];

const PLANS = [
    { name: "FIBRA 100MB", price: 99.90, upload: 50, download: 100 },
    { name: "FIBRA 300MB", price: 149.90, upload: 150, download: 300 },
    { name: "FIBRA 500MB", price: 199.90, upload: 250, download: 500 },
    { name: "LINK DEDICADO 1GB", price: 1200.00, upload: 1000, download: 1000 }
];

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
    try {
        console.log("🌱 Starting Dashboard Seeding...");

        // 1. Find a Tenant
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.error("❌ No tenants found in database. Create a tenant first.");
            process.exit(1);
        }
        console.log(`🏢 Using Tenant: ${tenant.name} (${tenant.slug})`);

        const schemaName = `tenant_${tenant.slug.replace(/-/g, '_')}`;
        const searchPath = `"${schemaName}", "management", "radius", "public"`;

        await prisma.$transaction(async (tx) => {
            // Set Schema
            await tx.$executeRawUnsafe(`SET search_path = ${searchPath}`);
            console.log(`🔧 Schema set to: ${schemaName}`);

            // 2. Clear previous test data (Optional, be careful)
            // await tx.invoiceItem.deleteMany();
            // await tx.invoice.deleteMany();
            // await tx.customer.deleteMany();
            // await tx.plan.deleteMany();
            // console.log("🧹 Cleared old data");

            // 3. Create Plans
            const createdPlans = [];
            for (const p of PLANS) {
                const existing = await tx.plan.findFirst({ where: { name: p.name } });
                if (existing) {
                    createdPlans.push(existing);
                } else {
                    const newPlan = await tx.plan.create({
                        data: {
                            name: p.name,
                            price: p.price,
                            upload: p.upload,
                            download: p.download,
                            description: "Plano criado via seed"
                        }
                    });
                    createdPlans.push(newPlan);
                }
            }

            // 4. Create Customers
            const customers = [];
            for (const name of RANDOM_NAMES) {
                // Check if exists
                const existing = await tx.customer.findFirst({ where: { name } });
                if (existing) {
                    customers.push(existing);
                    continue;
                }

                const plan = randomItem(createdPlans);
                const customer = await tx.customer.create({
                    data: {
                        name,
                        cpfCnpj: Math.random().toString().slice(2, 13), // Fake CPF
                        status: CustomerStatus.ACTIVE,
                        planId: plan.id,
                        address: { city: "São Paulo", street: "Rua Teste", number: "123" }
                    }
                });
                customers.push(customer);
            }
            console.log(`👥 Processed ${customers.length} customers.`);

            // 5. Create Invoices (History for Chart & Debtors)
            let invoiceCount = 0;
            const now = new Date();
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);

            for (const customer of customers) {
                const plan = createdPlans.find(p => p.id === customer.planId) || createdPlans[0];
                const price = Number(plan.price);

                // Past Paid Invoices (Revenue Chart)
                for (let i = 0; i < 6; i++) {
                    const dueDate = new Date(now);
                    dueDate.setMonth(now.getMonth() - i);
                    dueDate.setDate(10); // Standard due date

                    const isPaid = Math.random() > 0.1; // 90% paid rate

                    if (isPaid) {
                        await tx.invoice.create({
                            data: {
                                customerId: customer.id,
                                status: InvoiceStatus.PAID,
                                total: price,
                                dueDate: dueDate,
                                paidAt: new Date(dueDate.getTime() + (Math.random() * 86400000 * 5)), // Paid within 5 days
                                items: {
                                    create: {
                                        description: `Mensalidade ${plan.name}`,
                                        amount: price
                                    }
                                }
                            }
                        });
                        invoiceCount++;
                    } else {
                        // Make it Overdue (Insolvency)
                        if (i > 0) { // Don't make current month overdue yet maybe?
                            await tx.invoice.create({
                                data: {
                                    customerId: customer.id,
                                    status: InvoiceStatus.OVERDUE,
                                    total: price,
                                    dueDate: dueDate,
                                    items: {
                                        create: {
                                            description: `Mensalidade ${plan.name}`,
                                            amount: price
                                        }
                                    }
                                }
                            });
                            invoiceCount++;
                        }
                    }
                }

                // Current Month Pending (Predicted)
                const nextDue = new Date(now);
                nextDue.setDate(15); // Future due date this month
                await tx.invoice.create({
                    data: {
                        customerId: customer.id,
                        status: InvoiceStatus.OPEN,
                        total: price,
                        dueDate: nextDue,
                        items: {
                            create: {
                                description: `Mensalidade ${plan.name}`,
                                amount: price
                            }
                        }
                    }
                });
                invoiceCount++;
            }

            console.log(`💰 Created ${invoiceCount} invoices.`);
        }, {
            timeout: 20000 // Increase timeout for seed
        });

        console.log("✅ Seed completed successfully!");

    } catch (e) {
        console.error("❌ Seed failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
