"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import { withTenantDb } from "@/lib/auth-utils.server";

/**
 * Creates a new invoice for a customer based on their plan
 */
export const createInvoiceAction = protectedAction(
    ["ISP_ADMIN"],
    async (data: { customerId: string, amount: number, description: string }) => {
        const { customerId, amount, description } = data;

        return await withTenantDb(async (db) => {
            const invoice = await db.invoice.create({
                data: {
                    customerId,
                    total: amount,
                    status: "OPEN",
                    dueDate: new Date(), // Set proper due date logic here
                    items: {
                        create: {
                            description,
                            amount,
                            quantity: 1
                        }
                    }
                }
            });

            revalidatePath("/financial/invoices");
            return invoice;
        });
    }
);

/**
 * Confirms a payment and triggers the network unblock logic
 */
export const payInvoiceAction = protectedAction(
    ["ISP_ADMIN"],
    async (invoiceId: string, session) => {
        const { PaymentService } = await import("../services/payment.service");

        return await withTenantDb(async (db) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await PaymentService.confirmPayment(session.tenantId as string, invoiceId, db as any);
        });
    }
);
/**
 * Aggregates revenue data for the BI dashboard
 */
export const getRevenueAction = protectedAction(
    ["ISP_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            // 1. Calculate main metrics
            const totals = await db.invoice.aggregate({
                _sum: {
                    total: true
                },
                where: {
                    status: { notIn: ["DRAFT", "CANCELLED"] }
                }
            });

            const paid = await db.invoice.aggregate({
                _sum: {
                    total: true
                },
                where: {
                    status: "PAID"
                }
            });

            const overdue = await db.invoice.aggregate({
                _sum: {
                    total: true
                },
                where: {
                    status: "OVERDUE"
                }
            });

            // 2. Generate chart data (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            const invoices = await db.invoice.findMany({
                where: {
                    createdAt: { gte: sixMonthsAgo },
                    status: { notIn: ["DRAFT", "CANCELLED"] }
                },
                select: {
                    total: true,
                    status: true,
                    createdAt: true
                }
            });

            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const chartMap = new Map();

            // Initialize last 6 months
            for (let i = 0; i < 6; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - (5 - i));
                const monthName = months[date.getMonth()];
                chartMap.set(monthName, { name: monthName, total: 0, paid: 0 });
            }

            invoices.forEach(inv => {
                const monthName = months[inv.createdAt.getMonth()];
                if (chartMap.has(monthName)) {
                    const entry = chartMap.get(monthName);
                    entry.total += Number(inv.total);
                    if (inv.status === "PAID") {
                        entry.paid += Number(inv.total);
                    }
                }
            });

            return {
                totalRevenue: Number(totals._sum.total || 0),
                paidRevenue: Number(paid._sum.total || 0),
                overdueRevenue: Number(overdue._sum.total || 0),
                chart: Array.from(chartMap.values())
            };
        });
    }
);

/**
 * Fetches the top debtors (highest overdue balance)
 */
export const getTopDebtorsAction = protectedAction(
    ["ISP_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            const debtors = await db.customer.findMany({
                where: {
                    invoices: {
                        some: { status: "OVERDUE" }
                    }
                },
                select: {
                    name: true,
                    cpfCnpj: true,
                    plan: {
                        select: { name: true }
                    },
                    invoices: {
                        where: { status: "OVERDUE" },
                        select: { total: true, dueDate: true }
                    }
                },
                take: 10
            });

            return debtors.map(d => {
                const totalOverdue = d.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
                const oldestInvoice = d.invoices.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
                const daysOverdue = Math.floor((new Date().getTime() - oldestInvoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    name: d.name,
                    cpfCnpj: d.cpfCnpj,
                    plan: d.plan?.name || "Sem Plano",
                    amount: totalOverdue,
                    days: daysOverdue > 0 ? daysOverdue : 0
                };
            }).sort((a, b) => b.amount - a.amount);
        });
    }
);

/**
 * Fetches listing of invoices
 */
export const getInvoicesAction = protectedAction(
    ["ISP_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            const invoices = await db.invoice.findMany({
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            cpfCnpj: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Serialization for client
            return invoices.map(inv => ({
                ...inv,
                total: Number(inv.total),
                createdAt: inv.createdAt.toISOString(),
                updatedAt: inv.updatedAt.toISOString(),
                dueDate: inv.dueDate.toISOString(),
                paidAt: inv.paidAt?.toISOString() || null
            }));
        });
    }
);

/**
 * Generates or retrieves Pix Code for an invoice
 */
export const getInvoicePixAction = protectedAction(
    ["ISP_ADMIN"],
    async (invoiceId: string) => {
        return await withTenantDb(async (db) => {
            const invoice = await db.invoice.findUnique({
                where: { id: invoiceId },
                include: { customer: true }
            });

            if (!invoice) throw new Error("Invoice not found");

            // Fetch Config
            const config = await db.financialConfig.findFirst();
            if (!config || !config.gatewayCredentials) {
                throw new Error("Gateway not configured");
            }

            // Factory
            const { PaymentGatewayFactory } = await import("../gateways/payment-gateway.factory");
            const gateway = PaymentGatewayFactory.create({
                ...JSON.parse(JSON.stringify(config.gatewayCredentials)), // Ensure plain object
                provider: (config.gatewayCredentials as { provider: string }).provider
            });

            // Create Pix
            // In a real app, check if paymentId exists and status is PENDING to reuse.
            // For now, always create fresh or return mock.
            const pix = await gateway.createPix(
                Number(invoice.total),
                `Fatura #${invoice.id.slice(0, 8)}`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                invoice.customer as any
            );

            return {
                copiaCola: pix.qr_code,
                qrCodeBase64: pix.encoded_image || pix.qr_code_base64
            };
        });
    }
);
