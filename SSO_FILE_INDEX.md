# SSO - Índice Completo de Arquivos

## 📁 Estrutura do Projeto

```
sunbeam-chat/
├── wordpress/                          # Arquivos para o Hub WordPress
├── api/                                # Backend Node.js
├── src/                                # Frontend React
└── [documentação SSO]                  # Raiz do projeto
```

## 📚 Documentação (Raiz)

| Arquivo | Propósito | Para Quem |
|---------|-----------|-----------|
| **SSO_START_HERE.md** | 🎯 **COMECE AQUI** - Guia de navegação | Todos |
| **README_SSO.md** | README principal do SSO | Todos |
| **SSO_COMPARISON.md** | Comparação das duas arquiteturas | Desenvolvedores, Arquitetos |
| **SSO_EXECUTIVE_SUMMARY.md** | Resumo para gestão e stakeholders | Executivos, PO |
| **SSO_FILE_INDEX.md** | Este arquivo - índice de todos os arquivos | Todos |
| **SSO_ARCHITECTURE.txt** | Diagramas ASCII dos fluxos | Desenvolvedores, Arquitetos |

### Arquitetura 1 (Descriptografia Direta)

| Arquivo | Propósito |
|---------|-----------|
| **SSO_SETUP.md** | Documentação completa da Arq. 1 |
| **SSO_IMPLEMENTATION_SUMMARY.md** | Resumo técnico da Arq. 1 |
| **SSO_README.md** | README da implementação original |
| **DEPLOYMENT_CHECKLIST.md** | Checklist de deploy (ambas arq.) |

### Arquitetura 2 (Token Exchange)

| Arquivo | Propósito |
|---------|-----------|
| **SSO_TOKEN_EXCHANGE.md** | Documentação completa da Arq. 2 |
| **SSO_TOKEN_EXCHANGE_QUICKSTART.md** | Setup rápido da Arq. 2 |

## 🖥️ WordPress (Hub)

### Plugin SSO Exchange

| Arquivo | Descrição | Linguagem |
|---------|-----------|-----------|
| `wordpress/isw-sso-exchange-endpoint.php` | Plugin WordPress com endpoint de exchange | PHP |
| `wordpress/INSTALL.md` | Guia de instalação do plugin | Markdown |

### Scripts de Geração de Chaves

| Arquivo | Descrição | Plataforma |
|---------|-----------|------------|
| `wordpress/generate-rsa-keys.sh` | Gera par de chaves RSA | Linux/Mac (Bash) |
| `wordpress/generate-rsa-keys.ps1` | Gera par de chaves RSA | Windows (PowerShell) |
| `wordpress/.gitignore` | Proteção de chaves privadas | Git |

### Chaves Criptográficas (Não commitadas)

| Arquivo | Descrição | Segurança |
|---------|-----------|-----------|
| `wordpress/isw-sso-private.pem` | Chave privada RSA | ⚠️ NUNCA compartilhar |
| `wordpress/isw-sso-public.pem` | Chave pública RSA | ✅ Pode compartilhar |

## 🔧 Backend Node.js (IA)

### Arquitetura 1

| Arquivo | Descrição | Linhas |
|---------|-----------|--------|
| `api/validate-token.js` | Servidor de validação (descriptografia direta) | 324 |
| `api/test-api.js` | Script de testes | 100 |
| `api/README.md` | Documentação da API | - |
| `api/QUICK_START.md` | Guia rápido | - |
| `api/.env.example` | Template de variáveis | - |

### Arquitetura 2

| Arquivo | Descrição | Linhas |
|---------|-----------|--------|
| `api/sso-server.js` | Servidor SSO completo (token exchange) | 450 |
| `api/sso.env.example` | Template de variáveis (Arq. 2) | - |

### Chaves e Configuração

| Arquivo | Descrição | Segurança |
|---------|-----------|-----------|
| `api/keys/isw-sso-public.pem` | Chave pública do Hub (validar JWT) | ✅ Pública |
| `api/.env` | Variáveis de ambiente (Arq. 1) | ⚠️ Não commitar |
| `api/.env.sso` | Variáveis de ambiente (Arq. 2) | ⚠️ Não commitar |
| `api/.gitignore` | Proteção de secrets e chaves | Git |
| `api/package.json` | Configuração npm | - |

## ⚛️ Frontend React (IA)

### Arquitetura 1

| Arquivo | Descrição | Linhas |
|---------|-----------|--------|
| `src/components/auth/TokenAutoLogin.tsx` | Auto-login via token (descriptografia) | 135 |

### Arquitetura 2

| Arquivo | Descrição | Linhas |
|---------|-----------|--------|
| `src/hooks/useAuth.ts` | Hook de autenticação via /api/me | 85 |
| `src/components/auth/SSORedirect.tsx` | Redirect para backend SSO | 40 |
| `src/components/auth/ProtectedRouteSSO.tsx` | Proteção de rotas | 45 |
| `src/pages/LoginSSO.tsx` | Página de login SSO | 80 |

### Configuração

| Arquivo | Descrição |
|---------|-----------|
| `.env.example` | Template de variáveis de ambiente |
| `.env` | Variáveis de ambiente (não commitar) |

## 📊 Resumo por Tipo

### Documentação
- **Total**: 11 arquivos
- **Principais**: SSO_START_HERE.md, SSO_TOKEN_EXCHANGE.md, SSO_COMPARISON.md

### Código
- **WordPress**: 1 plugin PHP (250 linhas)
- **Backend Node**: 2 servidores (324 + 450 linhas)
- **Frontend React**: 5 componentes/hooks (~385 linhas)
- **Scripts**: 2 geradores de chaves (Bash + PowerShell)
- **Testes**: 1 script de teste

### Configuração
- **Variáveis de ambiente**: 3 templates
- **GitIgnore**: 2 arquivos (api + wordpress)
- **Package.json**: 1 arquivo

## 🎯 Guia de Uso Rápido

### Para Começar
1. **SSO_START_HERE.md** ← Ponto de entrada
2. Escolher arquitetura
3. Seguir quick start correspondente

### Para Entender
1. **SSO_COMPARISON.md** ← Ver diferenças
2. **SSO_ARCHITECTURE.txt** ← Ver fluxos visuais
3. Documentação específica da arquitetura escolhida

### Para Implementar

**Arquitetura 1:**
1. `api/QUICK_START.md`
2. `SSO_SETUP.md`

**Arquitetura 2:**
1. `SSO_TOKEN_EXCHANGE_QUICKSTART.md`
2. `wordpress/INSTALL.md`
3. `SSO_TOKEN_EXCHANGE.md`

### Para Deploy
1. **DEPLOYMENT_CHECKLIST.md** ← Checklist completo
2. Documentação específica da arquitetura
3. WordPress: `wordpress/INSTALL.md`

## 📏 Estatísticas

### Linhas de Código
- **PHP**: ~250 linhas
- **JavaScript/Node**: ~774 linhas
- **TypeScript/React**: ~385 linhas
- **Scripts**: ~150 linhas
- **Total código**: **~1,560 linhas**

### Documentação
- **Arquivos MD**: 15 documentos
- **Linhas total**: ~2,500 linhas
- **Diagramas**: 1 arquivo ASCII art

### Configuração
- **Templates .env**: 3 arquivos
- **GitIgnore**: 2 arquivos
- **Package.json**: 1 arquivo

## 🔍 Busca Rápida

### Por Funcionalidade

| O que você quer fazer? | Arquivo |
|------------------------|---------|
| Começar do zero | `SSO_START_HERE.md` |
| Comparar soluções | `SSO_COMPARISON.md` |
| Setup rápido (Arq. 1) | `api/QUICK_START.md` |
| Setup rápido (Arq. 2) | `SSO_TOKEN_EXCHANGE_QUICKSTART.md` |
| Entender fluxos | `SSO_ARCHITECTURE.txt` |
| Instalar no WordPress | `wordpress/INSTALL.md` |
| Gerar chaves RSA | `wordpress/generate-rsa-keys.*` |
| Configurar backend | `api/sso.env.example` |
| Criar componente React | `src/hooks/useAuth.ts` |
| Deploy em produção | `DEPLOYMENT_CHECKLIST.md` |
| Apresentar para gestão | `SSO_EXECUTIVE_SUMMARY.md` |

### Por Perfil

**Desenvolvedor Frontend:**
- `src/hooks/useAuth.ts`
- `src/components/auth/SSORedirect.tsx`
- `SSO_TOKEN_EXCHANGE.md` (seção Frontend)

**Desenvolvedor Backend:**
- `api/sso-server.js`
- `api/sso.env.example`
- `SSO_TOKEN_EXCHANGE.md` (seção Backend)

**DevOps:**
- `wordpress/INSTALL.md`
- `DEPLOYMENT_CHECKLIST.md`
- `SSO_TOKEN_EXCHANGE.md` (seção Deploy)

**Arquiteto:**
- `SSO_COMPARISON.md`
- `SSO_ARCHITECTURE.txt`
- `SSO_TOKEN_EXCHANGE.md` (completo)

**Gestor/PO:**
- `SSO_EXECUTIVE_SUMMARY.md`
- `README_SSO.md`

## ✅ Checklist de Arquivos Necessários

### Para Setup Mínimo (Arq. 2)

**WordPress:**
- [ ] `wordpress/isw-sso-exchange-endpoint.php`
- [ ] `wordpress/isw-sso-private.pem` (gerado)
- [ ] `wordpress/INSTALL.md` (referência)

**Backend:**
- [ ] `api/sso-server.js`
- [ ] `api/keys/isw-sso-public.pem` (copiado do WordPress)
- [ ] `api/.env.sso` (criado de sso.env.example)

**Frontend:**
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/components/auth/SSORedirect.tsx`
- [ ] `.env` (com VITE_SSO_API_URL)

**Documentação:**
- [ ] `SSO_TOKEN_EXCHANGE_QUICKSTART.md`
- [ ] `SSO_TOKEN_EXCHANGE.md`

---

**Total de arquivos no projeto SSO**: **30+ arquivos**

**Última atualização**: 2025-10-23
**Versão**: 2.0.0
