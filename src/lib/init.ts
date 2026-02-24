import { VpnAutoRegisterService } from '@/lib/vpn/auto-register';

/**
 * Inicialização do Sistema
 * Este arquivo é executado automaticamente quando o servidor Next.js inicia
 */

// Flag para garantir que só executa uma vez
let initialized = false;

export async function initializeSystem() {
    if (initialized) {
        return;
    }

    

    try {
        // Registrar servidor VPN
        await VpnAutoRegisterService.register();

        initialized = true;
        
    } catch (error) {
        console.error('[System Init] ❌ Initialization failed:', error);
        // Não lançar erro para não bloquear o startup
    }
}

// Auto-executar no import (server-side only)
if (typeof window === 'undefined') {
    initializeSystem().catch(console.error);
}
