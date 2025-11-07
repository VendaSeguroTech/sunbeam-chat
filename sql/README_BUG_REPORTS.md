# Sistema de Reports de Bugs/Problemas

## Visão Geral

Este sistema permite que os usuários reportem problemas e bugs diretamente pela interface do chat, e os administradores podem visualizar e gerenciar esses reports no painel administrativo.

## Como Executar o SQL

### 1. Acessar o Supabase SQL Editor

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 2. Executar o Script

1. Abra o arquivo `create_bug_reports_table.sql`
2. Copie todo o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 3. Verificar Criação

Para verificar se a tabela foi criada corretamente:

```sql
SELECT * FROM bug_reports;
```

Você deve ver uma tabela vazia sem erros.

## Estrutura da Tabela

A tabela `bug_reports` possui os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único do report |
| user_id | UUID | ID do usuário que reportou |
| user_name | TEXT | Nome do usuário |
| user_email | TEXT | Email do usuário |
| description | TEXT | Descrição detalhada do problema |
| status | TEXT | Status do report (pending, in_progress, resolved, closed) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

## Funcionalidades

### Para Usuários

1. Acesse as **Configurações** (ícone de engrenagem no sidebar)
2. Clique no botão **"Relatar Problema"**
3. Descreva o problema em detalhes
4. Clique em **"Enviar Report"**

### Para Administradores

1. Acesse o **Painel Admin** (ícone de escudo no sidebar)
2. Role até a seção **"Reports de Problemas"**
3. Visualize estatísticas:
   - Pendentes
   - Em Andamento
   - Resolvidos
4. Gerencie reports:
   - Clique em uma linha para ver detalhes completos
   - Use o dropdown de status para alterar o estado
   - Filtre e pesquise reports

## Status dos Reports

- **Pendente** 🕐: Report novo, aguardando análise
- **Em Andamento** ▶️: Report está sendo investigado/resolvido
- **Resolvido** ✅: Problema foi resolvido
- **Fechado** ❌: Report foi fechado (duplicado, inválido, etc.)

## Políticas de Segurança (RLS)

O sistema possui políticas de segurança configuradas:

- ✅ Usuários podem criar seus próprios reports
- ✅ Usuários podem ver apenas seus próprios reports
- ✅ Admins podem ver todos os reports
- ✅ Admins podem atualizar o status de qualquer report

## Arquivos Criados

### Componentes Frontend

1. `src/components/user/ReportBugDialog.tsx` - Dialog para reportar problemas
2. `src/components/admin/BugReportsPanel.tsx` - Painel admin para gerenciar reports
3. `src/components/user/UserSettingsForm.tsx` - Atualizado com botão de report

### Páginas

1. `src/pages/Admin.tsx` - Atualizado com BugReportsPanel

### SQL

1. `sql/create_bug_reports_table.sql` - Script de criação da tabela

## Troubleshooting

### Erro: "relation bug_reports does not exist"

**Solução**: Execute o script SQL no Supabase SQL Editor.

### Erro: "permission denied for table bug_reports"

**Solução**: Verifique se as políticas RLS foram criadas corretamente. Execute novamente o script SQL.

### Botão "Relatar Problema" não aparece

**Solução**: Verifique se o componente `ReportBugDialog` foi importado corretamente em `UserSettingsForm.tsx`.

### Reports não aparecem no admin

**Solução**: Verifique se:
1. Você está logado como admin (`role = 'admin'` na tabela `profiles`)
2. A tabela foi criada corretamente
3. As políticas RLS estão ativas

## Próximas Melhorias

- [ ] Notificações em tempo real para admins quando há novo report
- [ ] Sistema de comentários nos reports
- [ ] Categorização de tipos de problemas
- [ ] Anexar screenshots aos reports
- [ ] Exportar reports para CSV
- [ ] Dashboard com gráficos de reports por período
