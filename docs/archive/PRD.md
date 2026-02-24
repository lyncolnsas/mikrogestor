# Product Requirements Document (PRD) - Mikrogestor.com

> **Versão:** 1.0
> **Status:** Em Desenvolvimento
> **Data:** 01/02/2026

---

## 1. Visão Geral do Produto

O **Mikrogestor.com** é uma plataforma SaaS (Software as a Service) de ERP (Enterprise Resource Planning) projetada especificamente para **Provedores de Internet (ISPs)** de pequeno e médio porte.

O sistema atua como um hub centralizado que conecta a gestão financeira (faturamento, cobrança) com a operação técnica (autenticação, controle de banda, bloqueio), eliminando a necessidade de múltiplos sistemas desconectados.

### 1.1 Proposta de Valor

* **Automação Total:** Do envio da fatura ao desbloqueio da internet após o pagamento.
* **Centralização:** Gestão de clientes, rede, financeiro e suporte em um único lugar.
* **Mobile-First:** Ferramentas otimizadas para técnicos em campo.
* **Multi-tenant:** Arquitetura que permite escalar para milhares de provedores isoladamente.

---

## 2. Personas e Papéis

| Persona | Descrição | Principais Necessidades |
| :--- | :--- | :--- |
| **Super Admin (SaaS)** | Dono da plataforma Mikrogestor. | Gerenciar assinaturas dos ISPs, monitorar saúde global do sistema, faturamento do SaaS. |
| **Admin do Provedor (ISP)** | Dono ou gerente do provedor. | Gerenciar clientes, planos, fluxo de caixa, configurar Radius/MikroTik, personalizar landing page. |
| **Técnico** | Funcionário de campo. | Acessar ordens de serviço, provisionar ONUs, verificar sinal, realizar instalações via celular. |
| **Assinante (Cliente)** | O consumidor final de internet. | Pagar faturas (2ª via), ver consumo, abrir chamados, desbloqueio de confiança. |

---

## 3. Funcionalidades Principais (Escopo)

### 3.1 Módulo Financeiro & Faturamento

* **Gestão de Assinaturas:** Ciclos de vida de cobrança (Mensal, Anual).
* **Gateways de Pagamento:** Integração nativa com **Asaas** e **MercadoPago** (Pix e Cartão).
* **Automação de Inadimplência:**
  * Bloqueio automático após X dias de atraso.
  * Cálculo automático de Juros e Multa.
  * Desbloqueio automático (webhook) em < 30s após pagamento.
* **Notificações de Cobrança:** Envio automático de faturas e lembretes via **WhatsApp** e E-mail.

### 3.2 Módulo de Rede & Integração (Core Técnico)

* **Autenticação AAA:** Servidor FreeRADIUS integrado para autenticação PPPoE/Hotspot.
* **Gestão de NAS:** Cadastro de concentradores (MikroTik/Huawei/OLT).
* **VPN Tunneling (WireGuard):**
  * Conexão segura entre o SaaS (Nuvem) e a rede local do Provedor (CGNAT).
  * Permite envio de comandos (CoA) para desconexão/alteração de planos em tempo real.
* **Controle de Banda:** Definição de Upload/Download via atributos Radius.

### 3.3 Gestão de Clientes (CRM)

* **Cadastro Unificado:** Dados pessoais, endereço, planos contratados.
* **Geolocalização:** Mapeamento de clientes e caixas de atendimento (CTO).
* **Central do Assinante:** Portal web para o cliente final consultar financeiro e dados cadastrais.

### 3.4 Operacional & Field Service

* **Ordens de Serviço (OS):** Instalação, Reparo, Retirada.
* **Agenda de Técnicos:** Distribuição e acompanhamento de tarefas.
* **Provisionamento:** Configuração remota de equipamentos (CPEs).

### 3.5 Marketing & Vendas

* **Landing Page Builder:** Cada ISP possui uma página pública (`isp.mikrogestor.com`) configurável.
* **Planos e Cobertura:** Exibição de planos disponíveis e consulta de viabilidade técnica.

---

## 4. Arquitetura Técnica

### 4.1 Stack Tecnológica

* **Frontend:** Next.js 14+ (App Router), React, TailwindCSS, Shadcn/ui.
* **Backend:** Next.js Server Actions (API).
* **Banco de Dados:** PostgreSQL 16+ (Schema isolado logicamente por `tenant_id`).
* **ORM:** Prisma.
* **Infraestrutura:** Docker, Docker Compose, Linux (Ubuntu).
* **Proxy/Web Server:** Nginx (SSL/TLS).

### 4.2 Integrações Chave

* **FreeRADIUS 3.0:** Gerenciamento de sessões e atributos.
* **WireGuard:** Túneis VPN de alta performance.
* **Baileys:** Biblioteca para integração não-oficial com WhatsApp.
* **APIs de Pagamento:** SDKs do Asaas e MercadoPago.

---

## 5. Modelo de Dados (Resumo)

O sistema utiliza um banco de dados relacional (PostgreSQL) com as seguintes entidades principais:

* **Tenant:** A entidade raiz que isola os dados de cada provedor.
* **Subscription (SaaS):** O plano que o ISP paga para usar o Mikrogestor.
* **User:** Usuários do sistema (Admins e Técnicos do ISP).
* **Customer:** Os clientes finais do provedor.
* **Plan:** Planos de internet vendidos pelo provedor.
* **Invoice:** Faturas geradas para os Customers.
* **ServiceOrder:** Ordens de serviço técnicas.
* **VpnServer / VpnTunnel:** Configurações da infraestrutura de conectividade segura.
* **RadCheck / RadReply / RadAcct:** Tabelas padrão do FreeRADIUS para controle de acesso.

---

## 6. Requisitos Não-Funcionais

* **Performance:** Tempo de resposta da API < 200ms. Desbloqueio via Pix < 1 minuto.
* **Segurança:** Dados sensíveis (senhas Radius) criptografados. Isolamento estrito entre Tenants.
* **Disponibilidade:** SLA de 99.9% (crítico pois controla o acesso à internet dos usuários finais).
* **Compatibilidade:** Interface responsiva funcional em Desktop (Painel Admin) e Mobile (Técnicos).

---

## 7. Roadmap & Futuro

* **Fase 1 (Atual):** Estabilidade do Core (Radius, Billing, VPN), Deploy via Docker.
* **Fase 2:** App Mobile Nativo para Técnicos (React Native/Expo).
* **Fase 3:** Integração profunda com OLTs (FiberHome, Huawei) via SNMP/Telnet.
* **Fase 4:** Inteligência Artificial para predição de churn e suporte automático (Chatbot).
