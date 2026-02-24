# 🔧 Fix: Erro de Build Docker - pino-pretty

## ❌ Erro Original

```
Error: unable to determine transport target for "pino-pretty"
> Build error occurred
Error: Failed to collect page data for /network
```

## 🔍 Causa Raiz

O `pino-pretty` é uma ferramenta de desenvolvimento para formatar logs de forma bonita, mas **não é compatível com builds de produção** no Docker. O Next.js tentava carregar o `pino-pretty` durante o build, mas ele não estava disponível/configurado corretamente para produção.

## ✅ Soluções Aplicadas

### 1. Logger Condicional (`src/lib/auth-utils.server.ts`)

```typescript
// Antes (sempre usava pino-pretty)
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

// Depois (condicional)
const logger = pino(
    process.env.NODE_ENV === 'production'
        ? { level: process.env.LOG_LEVEL || 'info' }  // JSON simples
        : {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
                target: 'pino-pretty',  // Apenas em dev
                options: { colorize: true }
            }
        }
);
```

### 2. Adicionado pino-pretty como devDependency (`package.json`)

```json
"devDependencies": {
    "pino-pretty": "^14.0.0",
    ...
}
```

### 3. NODE_ENV no Dockerfile

```dockerfile
ENV NODE_ENV production
```

## 🎯 Resultado

- ✅ **Desenvolvimento:** Logs coloridos e formatados com `pino-pretty`
- ✅ **Produção:** Logs em JSON (mais eficiente, melhor para parsing)
- ✅ **Build Docker:** Funciona sem erros

## 🚀 Como Testar

```bash
# Limpar build anterior (opcional)
docker compose -f docker-compose.prod.yml down
docker system prune -f

# Construir novamente
start-system.bat
```

## 📝 Notas Técnicas

### Por que pino-pretty não funciona em produção?

1. **Dependência de desenvolvimento:** É uma ferramenta para tornar logs legíveis durante desenvolvimento
2. **Performance:** Adiciona overhead desnecessário em produção
3. **Bundling:** Não é compatível com o sistema de bundling do Next.js standalone

### Alternativas para logs em produção

- **JSON logs:** Melhor para agregadores (CloudWatch, Datadog, etc.)
- **Structured logging:** Facilita queries e análises
- **Log management tools:** Podem formatar JSON automaticamente

## 🔗 Arquivos Modificados

- `src/lib/auth-utils.server.ts` - Logger condicional
- `package.json` - Adicionado pino-pretty em devDependencies
- `Dockerfile` - Definido NODE_ENV=production no build
