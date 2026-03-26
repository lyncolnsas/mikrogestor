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
                chartMap.set(monthName, { name: monthName, previsto: 0, realizado: 0 });
            }

            invoices.forEach((inv: any) => {
                const monthName = months[inv.createdAt.getMonth()];
                if (chartMap.has(monthName)) {
                    const entry = chartMap.get(monthName);
                    entry.previsto += Number(inv.total);
                    if (inv.status === "PAID") {
                        entry.realizado += Number(inv.total);
                    }
                }
            });

            const methodStats = await db.invoice.groupBy({
                by: ['billingType'],
                _count: true,
                where: {
                    status: { notIn: ["DRAFT", "CANCELLED"] }
                }
            });

            const totalCount = methodStats.reduce((sum: number, stat: any) => sum + stat._count, 0);
            const mix = {
                pix: Math.round(((methodStats.find((s: any) => s.billingType === "PIX")?._count || 0) / (totalCount || 1)) * 100),
                boleto: Math.round(((methodStats.find((s: any) => s.billingType === "BOLETO")?._count || 0) / (totalCount || 1)) * 100),
                card: Math.round(((methodStats.find((s: any) => s.billingType === "CREDIT_CARD")?._count || 0) / (totalCount || 1)) * 100)
            };

            return {
                totalRevenue: Number(totals._sum.total || 0),
                paidRevenue: Number(paid._sum.total || 0),
                overdueRevenue: Number(overdue._sum.total || 0),
                chart: Array.from(chartMap.values()),
                mix
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

            return debtors.map((d: any) => {
                const totalOverdue = d.invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0);
                const oldestInvoice = d.invoices.sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime())[0];
                const daysOverdue = Math.floor((new Date().getTime() - oldestInvoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    name: d.name,
                    cpfCnpj: d.cpfCnpj,
                    plan: d.plan?.name || "Sem Plano",
                    amount: totalOverdue,
                    days: daysOverdue > 0 ? daysOverdue : 0
                };
            }).sort((a: any, b: any) => b.amount - a.amount);
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
            return invoices.map((inv: any) => ({
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

            // 1. Obter o Tenant para saber qual o Gateway Ativo
            const tenant = await db.tenant.findUnique({ where: { id: (db as any).tenantId } }) as any;
            const gatewayType = (tenant?.paymentGateway || "ASAAS") as any;

            // 2. Factory de Gateway
            const { PaymentGatewayFactory } = await import("../gateways/payment-gateway.factory");
            
            // Mapear credenciais dinamicamente baseado no provider configurado no financeiro do tenant
            const creds = config.gatewayCredentials as any;
            const gatewayCreds = gatewayType === "MERCADO_PAGO" 
                ? { accessToken: creds.mercadoPago?.accessToken }
                : { apiKey: creds.asaas?.apiKey, webhookToken: creds.asaas?.webhookToken };

            const gateway = PaymentGatewayFactory.getGateway(gatewayType, gatewayCreds);

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
/**
 * Action to get a single invoice with full details (customer, items) for printing/PDF
 */
export const getInvoiceForPrintAction = protectedAction(
    ["ISP_ADMIN", "SUBSCRIBER"],
    async (invoiceId: string) => {
        return await withTenantDb(async (db: any) => {
            const invoice = await db.invoice.findUnique({
                where: { id: invoiceId },
                include: {
                    customer: true,
                    items: true
                }
            });

            if (!invoice) return null;

            const config = await db.financialConfig.findFirst({
                where: { tenantId: invoice.tenantId }
            });

            // Mock implementation for boleto specific fields if not present
            // In a production app, these would be generated by a library like 'boleto.js'
            const boletoData = {
                banco: config?.bankName || "BB",
                beneficiario: {
                    nome: config?.beneficiaryName || "PROVEDOR DE INTERNET LTDA",
                    documento: config?.beneficiaryDocument || "00.000.000/0001-00",
                    agencia: config?.bankAgency || "1234",
                    conta: config?.bankAccount || "12345",
                    dvConta: config?.bankAccountDV || "0"
                },
                linhaDigitavel: "00190.00009 02741.512228 60007.412176 9 86510000001000",
                barcodeValue: "00199865100000010000000002741512226000741217",
                nossoNumero: invoice.id.slice(0, 8),
                vencimento: invoice.dueDate,
                emissao: invoice.createdAt,
                valor: Number(invoice.total),
                sacado: {
                    nome: invoice.customer?.fullName || "Cliente Final",
                    documento: invoice.customer?.document || "000.000.000-00",
                    endereco: invoice.customer?.address || "Rua Principal, 100"
                }
            };

            return {
                invoice,
                boletoData
            };
        });
    }
);

/**
 * Gets all invoices for a specific customer
 */
export const getCustomerInvoicesAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string) => {
        try {
            const result = await withTenantDb(async (db) => {
                const invoices = await db.invoice.findMany({
                    where: { customerId },
                    orderBy: { dueDate: "desc" }
                });

                // Serialization for client
                return invoices.map((inv: any) => ({
                    ...inv,
                    total: Number(inv.total),
                    createdAt: inv.createdAt.toISOString(),
                    updatedAt: inv.updatedAt.toISOString(),
                    dueDate: inv.dueDate.toISOString(),
                    paidAt: inv.paidAt?.toISOString() || null
                }));
            });

            return result;
        } catch (error: any) {
            console.error("[getCustomerInvoicesAction] Error:", error);
            throw error;
        }
    }
);
