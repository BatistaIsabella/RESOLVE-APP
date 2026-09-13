/**
 * Cenário 1 — Cidadão solicita uma nova demanda urbana
 *
 * "Como Cidadão, preencho o formulário de solicitação urbana informando
 * os dados obrigatórios (descrição detalhada, categoria válida, região
 * correspondente e nível de prioridade adequado) e confirmo o envio
 * da nova demanda para o sistema."
 *
 * Fluxo automatizado:
 *   1 - Cria um cidadão de teste via API.
 *   2 - Faz login pela interface.
 *   3 - Acessa o formulário de nova demanda.
 *   4 - Preenche os campos obrigatórios.
 *   5 - Envia a nova demanda.
 *   6 - Confirma que o cadastro foi realizado.
 *   7 - Confirma que a demanda aparece na listagem do cidadão.
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

test.describe('Cenário 1 — Cidadão cria uma nova demanda', () => {
  test('cidadão preenche o formulário e envia uma nova demanda', async ({
    page,
    request,
  }) => {

    const usuario = await criarUsuario(request, 'cidadao')

    const endereco = `Rua E2E ${Date.now()}, 123 - Recife/PE`
    const descricao = `Solicitação urbana criada automaticamente pelo teste E2E em ${Date.now()}.`

    await page.goto('/login')

    await page.getByPlaceholder('seu@email.com').fill(usuario.email)
    await page.getByPlaceholder('••••••••').fill(usuario.senha)
    await page.getByRole('button', { name: 'ENTRAR' }).click()

    await expect(page).toHaveURL(/\/telaUsuario$/)

    // acessar form de nova demanda
    await page
      .getByRole('button', { name: 'Criar Nova Solicitação' })
      .click()

    await expect(page).toHaveURL(/\/demandas\/nova$/)
    await expect(
      page.getByRole('heading', { name: 'Nova Denúncia' })
    ).toBeVisible()

    // preenchimento do form
    await page
      .locator('select')
      .nth(0)
      .selectOption({ label: 'Manutenção de vias' })

    await page
      .locator('select')
      .nth(1)
      .selectOption({ label: 'Buraco no asfalto' })

    await page
      .locator('select')
      .nth(2)
      .selectOption({ label: 'Região Metropolitana do Recife' })

    await page
      .getByPlaceholder('Endereço Completo *')
      .fill(endereco)

    await page
      .getByPlaceholder('Descrição detalhada *')
      .fill(descricao)

    await expect(page.locator('select').nth(0)).toHaveValue(
      'Manutenção de vias'
    )

    await expect(page.locator('select').nth(1)).toHaveValue(
      'Buraco no asfalto'
    )

    await expect(page.locator('select').nth(2)).toHaveValue(
      'Região Metropolitana do Recife'
    )

    await expect(
      page.getByPlaceholder('Endereço Completo *')
    ).toHaveValue(endereco)

    await expect(
      page.getByPlaceholder('Descrição detalhada *')
    ).toHaveValue(descricao)

    // envio demanda
    await page
      .getByRole('button', { name: 'Salvar Denúncia' })
      .click()

    await expect(page).toHaveURL(/\/telaUsuario$/)

    // Aguarda o redirecionamento e o carregamento da página
    await expect(page).toHaveURL(/\/telaUsuario$/)

    // Como o novo card aparece no topo da lista, pegamos o primeiro elemento
    const demanda = page.locator('div.border.border-gray-200.rounded-lg.p-4').first()

    // Garante que o elemento do topo está visível na tela
    await demanda.scrollIntoViewIfNeeded()

    await expect(demanda).toBeVisible({ timeout: 15000 })

    await expect(
      demanda.getByText('Buraco no asfalto', { exact: true })
    ).toBeVisible()

    await expect(
      demanda.getByText('Manutenção de vias', { exact: true })
    ).toBeVisible()
  })
})