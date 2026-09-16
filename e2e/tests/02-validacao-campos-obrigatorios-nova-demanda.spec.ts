/**
 * Cenário 2 — Cidadão tenta submeter o formulário de demanda em branco
 *
 * "Como Cidadão, tento submeter o formulário de demanda com os campos
 * obrigatórios em branco, verificando se o sistema exibe as mensagens de
 * validação e bloqueia o envio."
 *
 * Fluxo automatizado:
 *   1. Cria um cidadão de teste via API e faz login real pela interface.
 *   2. Acessa o formulário de nova demanda (/demandas/nova).
 *   3. Clica em "Salvar Denúncia" sem preencher nenhum campo.
 *   4. Confirma que o envio foi bloqueado (a página continua em
 *      /demandas/nova, nenhuma navegação pra /telaUsuario acontece) e que o
 *      primeiro campo obrigatório (Categoria) é sinalizado como inválido
 *      pelo navegador, com uma mensagem de validação não vazia.
 *   5. Preenche só Categoria, Problema e Região (deixando Endereço e
 *      Descrição em branco) e tenta enviar de novo — confirma que o envio
 *      continua bloqueado e que agora é o campo Endereço que aparece como
 *      inválido.
 *
 * Nota de implementação: todos os campos do formulário
 * (frontend/src/components/demands/FormDemanda.tsx) usam o atributo HTML
 * `required`, então a validação quem faz é o próprio navegador (Constraint
 * Validation API) — o evento `submit` nem chega a disparar o handler React
 * enquanto houver campo obrigatório vazio. Por isso o teste confere
 * `validity`/`validationMessage` dos campos em vez de procurar por um
 * alerta na tela.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria (via API) um usuário cidadão único para esta execução do teste. */
async function criarUsuario(request: APIRequestContext): Promise<UsuarioTeste> {
  // e-mail precisa caber em VarChar(35) no banco (ver auth-service/prisma/schema.prisma).
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadão E2E Teste',
    email: `e2ec2${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel: 'cidadao' },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuário de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

test.describe('Cenário 2 — validação de campos obrigatórios no formulário de nova demanda', () => {
  test('bloqueia o envio e sinaliza os campos obrigatórios vazios', async ({ page, request }) => {
    // ---------- Arrange ----------
    const cidadao = await criarUsuario(request);

    // ---------- Act 1: login real pela interface ----------
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario/);

    await page.goto('/demandas/nova');
    await expect(page.getByRole('heading', { name: 'Nova Denúncia' })).toBeVisible();

    const categoriaSelect = page.locator('select').nth(0);
    const regiaoSelect = page.locator('select').nth(2);
    const enderecoInput = page.getByPlaceholder('Endereço Completo *');
    const descricaoInput = page.getByPlaceholder('Descrição detalhada *');
    const botaoSalvar = page.getByRole('button', { name: 'Salvar Denúncia' });

    // ---------- Act 2: tenta enviar o formulário totalmente em branco ----------
    await botaoSalvar.click();

    // ---------- Assert 1: envio bloqueado, sem navegação, campo Categoria inválido ----------
    await expect(page).toHaveURL(/\/demandas\/nova$/);

    const categoriaFaltando = await categoriaSelect.evaluate((el: any) => el.validity.valueMissing);
    expect(categoriaFaltando).toBe(true);
    const mensagemCategoria = await categoriaSelect.evaluate((el: any) => el.validationMessage);
    expect(mensagemCategoria.length).toBeGreaterThan(0);

    // ---------- Act 3: preenche só parte dos campos obrigatórios ----------
    await categoriaSelect.selectOption({ label: 'Manutenção de vias' });
    await page.locator('select').nth(1).selectOption({ label: 'Buraco no asfalto' });
    await regiaoSelect.selectOption({ label: 'Região Metropolitana do Recife' });
    // Endereço e Descrição ficam em branco de propósito.

    await botaoSalvar.click();

    // ---------- Assert 2: continua bloqueado, agora aponta o campo Endereço ----------
    await expect(page).toHaveURL(/\/demandas\/nova$/);

    const enderecoFaltando = await enderecoInput.evaluate((el: any) => el.validity.valueMissing);
    expect(enderecoFaltando).toBe(true);
    const mensagemEndereco = await enderecoInput.evaluate((el: any) => el.validationMessage);
    expect(mensagemEndereco.length).toBeGreaterThan(0);

    // Descrição também segue vazia e obrigatória.
    const descricaoFaltando = await descricaoInput.evaluate((el: any) => el.validity.valueMissing);
    expect(descricaoFaltando).toBe(true);
  });
});
