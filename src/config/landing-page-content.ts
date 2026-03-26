
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
                linkText: "Ver detalhes",
                href: "/guia#rede"
            },
            {
                icon: BarChart3,
                title: "NOC Inteligente",
                description: "Diagnósticos real-time com polling de 10s. Veja latência, tráfego e sinal óptico sem sair do ERP.",
                color: "emerald" as const,
                linkText: "Ver detalhes",
                href: "/guia#rede"
            },
            {
                icon: Activity,
                title: "Faturamento 360°",
                description: "Boletos e PIX com baixa automática via Radius. Bloqueio por falta de pagamento em vlan ou pppoe.",
                color: "indigo" as const,
                linkText: "Ver detalhes",
                href: "/guia#financeiro"
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
            { label: "Manual do Sistema", href: "/guia" },
            { label: "Termos", href: "#" },
            { label: "Privacidade", href: "#" },
            { label: "Suporte", href: "#" }
        ],
        copyright: "© 2026 Mikrogestor SaaS. Feito para ISPs de alta performance."
    },
    manual: {
        badge: "GUIA COMPLETO",
        headline: "Como Operar seu <br /> <span class=\"text-indigo-600\">Império em 4 Passos.</span>",
        steps: [
            {
                number: "01",
                title: "Ativação da Conta",
                description: "Escolha seu plano ideal e receba seu subdomínio exclusivo (ex: meuprovedor.mikrogestor.com.br).",
                detail: "Acesso imediato ao painel administrativo SaaS."
            },
            {
                number: "02",
                title: "Tunelamento & Radius",
                description: "Execute o script de 1 clique no seu MikroTik para estabelecer o túnel VPN e a comunicação Radius.",
                detail: "Mesmo sem IP público na sua rede externa."
            },
            {
                number: "03",
                title: "Poder de Comunicação",
                description: "Configure seu SMTP (Gmail app password) para faturas automáticas e notificações de rede.",
                detail: "Envios 100% integrados com sua marca."
            },
            {
                number: "04",
                title: "Bot de Atendimento",
                description: "Leia o QR Code do WhatsApp para ativar o assistente virtual que resolve chamados via IA.",
                detail: "Suporte 24/7 sem intervenção humana."
            },
            {
                number: "05",
                title: "Galeria & Persistência",
                description: "Suba fotos de torres e POPs. Armazenamento resiliente via volumes Docker dedicados.",
                detail: "Histórico visual vitalício da sua rede."
            },
            {
                number: "06",
                title: "Segurança Avançada",
                description: "Sanitização de uploads via Sharp para evitar ataques por imagens-código (stenography).",
                detail: "Proteção total contra injeções e malwares."
            }
        ]
    }
};
