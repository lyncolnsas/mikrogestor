"use server";

import { prisma } from "@/lib/prisma";

export async function getSystemStatusAction() {
    const start = performance.now();
    let radiusStatus = false;
    let latency = 0;

    try {
        // 1. Check Radius Status (Database Connectivity)
        // We check if we can count records in RadCheck, which implies the DB (and thus Radius data) is accessible.
        await prisma.radCheck.count({ take: 1 });
        radiusStatus = true;

        // 2. Calculate Latency (Round Trip Time to DB)
        const end = performance.now();
        latency = Math.round(end - start);

    } catch (error) {
        console.error("Error checking system status:", error);
        radiusStatus = false;
        latency = -1; // Indicator of error
    }

    // 3. Instance Identification
    // In Vercel, specific env vars exist. In Docker, we might default to 'Local'.
    const instanceName = process.env.VERCEL_REGION
        ? `Vercel (${process.env.VERCEL_REGION})`
        : (process.env.HOSTNAME || "Infra Própria");

    return {
        data: {
            radiusStatus: radiusStatus ? "Ativo" : "Inativo",
            latency: latency >= 0 ? `${latency}ms` : "Erro",
            instanceName: instanceName,
        }
    };
}
