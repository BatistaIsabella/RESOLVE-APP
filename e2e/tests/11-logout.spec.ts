/**
 * Cenário 11 — Encerramento de sessão (Logout)
 *
 * "Como usuário autenticado, clico na opção de encerrar sessão (Logout),
 * verificando o redirecionamento para a tela inicial e a limpeza dos
 * dados de sessão no navegador."
 *
 * Fluxo automatizado:
 *   1 - Cria um cidadão de teste via API.
 *   2 - Faz login pela interface.
 *   3 - Clica na opção "Sair".
 *   4 - Confirma o redirecionamento para a tela de login.
 *   5 - Confirma que os dados de sessão foram limpos, tentando acessar
 *       uma rota protegida diretamente e validando que o usuário é
 *       redirecionado de volta ao login (sem acesso indevido).
 **/

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string
  email: string
  senha: string
  papel: 'cidadao' | 'gestor'
}

async function criarUsuario(
  request: APIRequestContext,
  papel: 'cidadao' | 'gestor' = 'cidadao'
): Promise<UsuarioTeste> {
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const usuario: UsuarioTeste = {
    nome: `Usuário E2E ${sufixo}`,
    email: `e2e.${sufixo}@teste.com`,
    senha: SENHA_PADRAO,
    papel,
  }

  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      papel: usuario.papel,
    },
  })

  expect(
    response.ok(),
    `Falha ao criar usuário: ${await response.text()}`
  ).toBeTruthy()

  return usuario
}

test.describe('Cenário 11 — Encerramento de sessão (Logout)', () => {
  test('usuário autenticado encerra a sessão e é redirecionado com os dados de sessão limpos', async ({
    page,
    request,
  }) => {

    const usuario = await criarUsuario(request, 'cidadao')

    // ---------- Act 1: login pela interface ----------
    await page.goto('/login')

    await page.getByPlaceholder('seu@email.com').fill(usuario.email)
    await page.getByPlaceholder('••••••••').fill(usuario.senha)
    await page.getByRole('button', { name: 'ENTRAR' }).click()

    await expect(page).toHaveURL(/\/telaUsuario$/)

    // Confirma que o nome do usuário aparece no header,
    // evidenciando que a sessão está de fato ativa antes do logout
    await expect(page.getByText(usuario.nome)).toBeVisible()

    // ---------- Act 2: clica em "Sair" ----------
    await page.getByRole('button', { name: 'Sair' }).click()

    // ---------- Assert 1: redirecionamento para a tela de login ----------
    await expect(page).toHaveURL(/\/login$/)

    // ---------- Assert 2: dados de sessão foram limpos ----------
    // Tenta acessar diretamente uma rota protegida após o logout.
    // Se a sessão realmente foi limpa, o guard de autenticação deve
    // barrar o acesso e redirecionar de volta para o login.
    await page.goto('/telaUsuario')
    await expect(page).toHaveURL(/\/login$/)

    // Verificação direta do estado persistido pelo Zustand (chave
    // "smart-city-storage-v2"), garantindo que token, papel, e-mail e
    // nome do usuário foram efetivamente limpos após o logout.
    const estadoPersistido = await page.evaluate(() => {
      const bruto = localStorage.getItem('smart-city-storage-v2')
      return bruto ? JSON.parse(bruto) : null
    })

    expect(estadoPersistido?.state?.token).toBeNull()
    expect(estadoPersistido?.state?.role).toBeNull()
    expect(estadoPersistido?.state?.userEmail).toBeNull()
    expect(estadoPersistido?.state?.userName).toBeNull()
  })
})
