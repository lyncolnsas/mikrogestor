# Mikrogestor ERP - Sistema de Gestão para ISPs

O **Mikrogestor** é um Sistema de Gestão Centralizado (ERP) projetado especificamente para Provedores de Internet (ISPs) de pequeno e médio porte.

## 🎯 Propósito e Missão

A dor principal que ele resolve é a desconexão entre o financeiro e o técnico. O Mikrogestor automatiza o ciclo de vida do cliente:

- **Automação de Bloqueio/Desbloqueio:** Corte automático via Radius/MikroTik por inadimplência e liberação imediata após pagamento (PIX/Cartão).
- **Gestão de Assinaturas:** Controle de planos, vencimentos e renovações.
- **Comunicação Ativa:** Notificações automáticas via WhatsApp (faturas, lembretes, manutenção).
- **Provisionamento Técnico:** Configuração remota de ONU/Roteadores.

## 🚀 Tecnologia (O Motor do Sistema)

O projeto utiliza uma arquitetura **SaaS Multi-tenant Modernizada**, garantindo isolamento de dados entre provedores.

### Backend (Inteligência)

- **Framework:** NestJS (Estrutura modular e escalável).
- **Integração de Rede:** FreeRADIUS + MikroTik API (comandos TCP/IP, rotas, filas de prioridade).
- **Processamento:** Filas (Queues) para processamento em segundo plano (mensagens em massa, bloqueios).

### Frontend (Interface)

- **Framework:** Next.js 14 (App Router).
- **UX:** Renderização Híbrida para segurança e performance.

## ✨ Usabilidade e UX

- **Mobile-First:** Desenvolvido para o técnico de campo gerenciar ativações e sinal óptico pelo celular.
- **Optimistic UI:** Feedback instantâneo em ações críticas como desbloqueios.
- **Dark Mode:** Otimizado para ambientes de NOC (24h).
- **Wizards:** Fluxos guiados para tarefas complexas de cadastro.

## 🔄 Cenário de Uso Real (Jornada do Dado)

1. **Gatilho:** CronJob identifica fatura vencida há 5 dias.
2. **Financeiro:** Marca fatura como "Vencida".
3. **Comunicação:** WhatsApp envia lembrete e código Pix.
4. **Técnico:** Network altera o grupo no FreeRADIUS para "Bloqueado".
5. **Resolução:** Após pagamento via Pix (Gateway MercadoPago), o sistema libera a internet em menos de 30 segundos.

## 📚 Documentação

- **[Guia de Configuração](docs/CONFIGURATION.md)** - Configuração completa de variáveis de ambiente, serviços e integrações
- **[Quick Start](QUICK-START.md)** - Inicialização rápida do sistema
- **[System README](SYSTEM-README.md)** - Documentação técnica detalhada
- **[Troubleshooting](TROUBLESHOOTING.md)** - Resolução de problemas comuns
