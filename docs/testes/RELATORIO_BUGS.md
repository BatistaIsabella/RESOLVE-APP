# Relatório de Bugs — Smart City

Bugs identificados via análise de integração entre frontend e backend após implementação dos serviços reais.

---

## Bug 01 — Cadastro sempre retornava erro 400

**Arquivo:** `frontend/src/Services/authService.ts`
**Severidade:** Alta
**Taxa de reprodução:** 100%
**Regressão:** Não

### Descrição
O formulário de cadastro enviava o campo `tipo` no corpo da requisição, mas o backend (`auth-service`) foi padronizado para receber `papel`. A incompatibilidade de nomes causava falha na validação do servidor, que retornava 400 para qualquer tentativa de cadastro.

### Causa
```ts
// antes (incorreto)
body: JSON.stringify({ nome, email, senha, tipo })

// depois (correto)
body: JSON.stringify({ nome, email, senha, papel: tipo })
```

---

## Bug 02 — Papel do usuário não era salvo após login

**Arquivos:** `frontend/src/Services/authService.ts` · `frontend/src/stores/useDemandStore.ts`
**Severidade:** Alta
**Taxa de reprodução:** 100%
**Regressão:** Não

### Descrição
A interface `AuthResponse` declarava o campo como `role`, mas o backend retorna `papel`. Após o login, `result.role` era `undefined`, fazendo com que o store salvasse `role: null`. Qualquer funcionalidade que dependia do papel do usuário (redirecionamento, filtro de rotas, permissões) deixava de funcionar.

### Causa
```ts
// interface antes (incorreta)
role: 'cidadao' | 'gestor'

// interface depois (correta)
papel: 'cidadao' | 'gestor'

// store antes (incorreto)
role: result.role   // undefined
if (result.role !== expectedRole)

// store depois (correto)
role: result.papel
if (result.papel !== expectedRole)
```

---

## Bug 03 — Todas as rotas do demand-service retornavam 404

**Arquivo:** `frontend/src/lib/api.ts`
**Severidade:** Alta
**Taxa de reprodução:** 100%
**Regressão:** Não

### Descrição
O `demand-service` registra todas as suas rotas com o prefixo `/demandas` (via `app.use('/demandas', demandRoutes)`). A URL base do frontend (`DEMAND_API_URL`) apontava apenas para `http://localhost:3002`, sem o prefixo. Todas as chamadas de listagem, criação e atualização de demandas chegavam em rotas inexistentes.

### Causa
```ts
// antes (incorreto)
DEMAND_API_URL = 'http://localhost:3002'
// chamadas chegavam em: /demands/feed → 404

// depois (correto)
DEMAND_API_URL = 'http://localhost:3002/demandas'
// chamadas chegam em: /demandas/demands/feed → 200
```

### Rotas afetadas
| Operação | URL errada | URL correta |
|---|---|---|
| Listar demandas (cidadão) | `/demands/feed` | `/demandas/demands/feed` |
| Listar demandas (gestor) | `/gestor/demands` | `/demandas/gestor/demands` |
| Criar demanda | `/demands` | `/demandas/demands` |
| Detalhe da demanda | `/demands/:id` | `/demandas/demands/:id` |
| Atualizar status | `/demands/:id/status` | `/demandas/demands/:id/status` |

---

## Bug 04 — Usuário logado é expulso para o login ao recarregar a página (F5 ou URL direta)

**Arquivos:** `frontend/src/app/(gestor)/gestor/page.tsx` · `frontend/src/app/(gestor)/gestor/dashboard/page.tsx` · `frontend/src/app/(gestor)/gestor/demandas/[id]/page.tsx` · `frontend/src/app/(public)/demandas/nova/page.tsx` · `frontend/src/app/(public)/demandas/[id]/page.tsx`
**Severidade:** Alta
**Taxa de reprodução:** 100% (12/12 execuções)
**Regressão:** Não
**Encontrado por:** suíte E2E, ao escrever o Cenário 10 (acesso não autorizado ao painel)

### Descrição
Qualquer carga direta de URL — digitar o endereço, apertar F5, abrir um link
salvo — derruba o usuário autenticado de volta para a tela de login, mesmo com
sessão válida no `localStorage`. Um **gestor legítimo** que aperta F5 dentro do
Painel de Gestão vê o painel renderizar por um instante e em seguida é jogado
em `/logingestor`. O mesmo acontece com o cidadão em `/demandas/nova`.

Efeito colateral na suíte de testes: o Cenário 10 (bloqueio de acesso não
autorizado) **passa mesmo se a checagem de papel não existir**, porque a
redireção acontece por este bug, e não pela regra de autorização. É por isso
que `tests/10-acesso-nao-autorizado-painel-gestor.spec.ts` inclui um teste
marcado com `test.fail()` fixando o comportamento correto (gestor continua no
painel após o F5) — quando este bug for corrigido, o Playwright vai acusar
"unexpected pass" e o `test.fail()` deve ser removido.

### Causa
O `useEffect` que faz o guard lê `token` antes de o `persist` do Zustand
terminar de reidratar o estado vindo do `localStorage`. Na primeira renderização
`token` ainda é `null`, o `router.push` dispara e a sessão real chega tarde
demais. As páginas até usam `_hasHydrated` para segurar a **renderização**, mas
não para segurar o **redirecionamento**.

```tsx
// antes (incorreto) — redireciona antes de saber se há sessão
useEffect(() => {
  setMounted(true);
  if (!token || role !== 'gestor') {
    router.push('/logingestor');
    return;
  }
  fetchDemands();
}, [fetchDemands, token, role, router]);

// depois (correto) — só decide depois que o estado foi reidratado
useEffect(() => {
  setMounted(true);
  if (!mounted || !_hasHydrated) return;   // ainda não dá pra saber
  if (!token || role !== 'gestor') {
    router.push('/logingestor');
    return;
  }
  fetchDemands();
}, [mounted, _hasHydrated, fetchDemands, token, role, router]);
```

> O padrão correto **já existe no projeto**, em
> `frontend/src/app/(public)/telaUsuario/page.tsx` (`if (isMounted && _hasHydrated)`).
> A correção é replicar esse mesmo cuidado nas páginas listadas acima.

### Outro teste já afetado
`tests/02-validacao-campos-obrigatorios-nova-demanda.spec.ts` **falha hoje por
causa deste bug**: ele faz login e depois `page.goto('/demandas/nova')`; a carga
direta dispara o guard antes da reidratação e a página cai em `/login`, então o
assert `toHaveURL(/\/demandas\/nova$/)` nunca bate. O Cenário 1 passa porque
chega no formulário clicando no botão (navegação client-side, sem recarregar a
página) — o que confirma que o problema é a carga direta, não o formulário.

### Como reproduzir
1. Faça login como gestor em `/logingestor` (cai em `/gestor/dashboard`).
2. Aperte F5.
3. Observado: o painel aparece por um instante e a página vai para `/logingestor`.
   Esperado: continuar no painel, com a sessão preservada.

---

## Resumo

| ID | Descrição | Severidade | Reprodução | Regressão | Status |
|---|---|---|---|---|---|
| BUG-01 | Cadastro retornava 400 (`tipo` vs `papel`) | Alta | 100% | Não | Corrigido |
| BUG-02 | Papel do usuário sempre `null` após login (`role` vs `papel`) | Alta | 100% | Não | Corrigido |
| BUG-03 | Rotas do demand-service retornavam 404 (prefixo `/demandas` faltando) | Alta | 100% | Não | Corrigido |
| BUG-04 | Usuário logado é expulso pro login ao dar F5 / abrir URL direta (guard roda antes da reidratação) | Alta | 100% | Não | **Aberto** |
