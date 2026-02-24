
import { Activity, BarChart3, Wifi } from "lucide-react";

export const landingContent = {
    hero: {
        badge: "O FUTURO DO ISP ESTÁ AQUI",
        headline: "Gerencie seu Provedor com <br /> <span class=\"text-blue-600\">Alta Performance.</span>",
        subheadline: "Deixe o Excel para trás. Mikrogestor centraliza gestão de assinantes, financeiro automatizado e túneis VPN SaaS em uma única plataforma cloud de alta densidade.",
        ctaCheck: "Começar Agora",
        ctaDemo: "Agendar Demo",
    },
    features: {
        title: "Integrado nativamente com",
        list: [
            {
                icon: Wifi,
                title: "VPN Sem Configuração",
                description: "Túneis SaaS automáticos. Conecte seu MikroTik em segundos sem precisar de IP Público na torre.",
                color: "blue" as const,
                linkText: "Ver detalhes"
            },
            {
                icon: BarChart3,
                title: "NOC Inteligente",
                description: "Diagnósticos real-time com polling de 10s. Veja latência, tráfego e sinal óptico sem sair do ERP.",
                color: "emerald" as const,
                linkText: "Ver detalhes"
            },
            {
                icon: Activity,
                title: "Faturamento 360°",
                description: "Boletos e PIX com baixa automática via Radius. Bloqueio por falta de pagamento em vlan ou pppoe.",
                color: "indigo" as const,
                linkText: "Ver detalhes"
            }
        ]
    },
    pricing: {
        badge: "Planos e Preços",
        headline: "Escale seu Provedor <br /> <span class=\"text-indigo-600\">Sem Limites de Hardware.</span>",
        subheadline: "Escolha o plano ideal para o tamanho da sua operação. Troque de plano a qualquer momento conforme você cresce.",
        popularBadge: "Mais Popular",
        cta: "Começar Agora",
        trial: "7 dias de teste grátis"
    },
    infrastructure: {
        badge: "EXCLUSIVO",
        headline: "O Túnel que seu Provedor precisava.",
        description: "Nossos servidores VPN globais permitem que você gerencie seus concentradores remotamente com segurança militar. Não importa se você está atrás de um NAT ou em uma rede satélite.",
        features: [
            "Script MikroTik de um clique",
            "Segurança WireGuard Encriptada",
            "IP Dedicado para Radius"
        ],
        codeSnippet: {
            title: "# MikroTik AutoConfig Tunnel",
            line1: "/interface wireguard add listen-port=51820 name=saas-tunnel",
            line2: "/interface wireguard peers add allowed-address=0.0.0.0/0 endpoint-address=vpn.mikrogestor.com endpoint-port=51820 interface=saas-tunnel",
            line3: "/ip address add address=172.16.x.x/30 interface=saas-tunnel",
            status: "# Status: CONECTADO EM 10.200.1.1"
        }
    },
    footer: {
        brand: "Mikrogestor SaaS",
        links: [
            { label: "Termos", href: "#" },
            { label: "Privacidade", href: "#" },
            { label: "Suporte", href: "#" }
        ],
        copyright: "© 2026 Mikrogestor SaaS. Feito para ISPs de alta performance."
    }
};
