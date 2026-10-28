import { prisma } from '../lib/prisma';

type Papel = 'cidadao' | 'gestor';

// Cópia dos dados do titular guardados neste serviço (direito de acesso e portabilidade).
// As fotos não entram no arquivo, só a contagem, para ele não ficar com dezenas de MB.
export async function exportarDadosDoTitular(usuarioId: number, papel: Papel) {
  if (papel === 'gestor') {
    const gestor = await prisma.gestor.findUnique({
      where: { usuario_id: usuarioId },
      include: { historicos: { orderBy: { data_alteracao: 'desc' } } },
    });

    return {
      papel,
      atualizacoes: (gestor?.historicos ?? []).map((h) => ({
        denuncia_id: h.denuncia_id,
        status: h.status,
        prioridade: h.prioridade,
        data: h.data_alteracao,
      })),
    };
  }

  const cidadao = await prisma.cidadao.findUnique({
    where: { usuario_id: usuarioId },
    include: {
      denuncias: {
        orderBy: { data_registro: 'desc' },
        include: {
          historicos: { orderBy: { data_alteracao: 'desc' } },
          _count: { select: { imagens: true } },
        },
      },
    },
  });

  return {
    papel,
    denuncias: (cidadao?.denuncias ?? []).map((d) => ({
      id: d.id_denuncia,
      titulo: d.titulo,
      descricao: d.descricao,
      categoria: d.categoria,
      regiao: d.regiao,
      endereco: d.endereco,
      status: d.status,
      prioridade: d.prioridade,
      data_registro: d.data_registro,
      data_conclusao: d.data_conclusao,
      email_solicitante: d.email_solicitante,
      quantidade_fotos: d._count.imagens,
      historico: d.historicos.map((h) => ({ status: h.status, prioridade: h.prioridade, data: h.data_alteracao })),
    })),
  };
}

// Eliminação dos dados pessoais do titular. As ocorrências continuam existindo pelo prazo de
// retenção (o órgão público ainda responde por elas), mas ficam sem vínculo com a pessoa:
// o e-mail é apagado, as fotos são removidas e o vínculo com a conta é desfeito.
export async function anonimizarTitular(usuarioId: number, papel: Papel) {
  if (papel === 'gestor') {
    const gestor = await prisma.gestor.findUnique({ where: { usuario_id: usuarioId } });
    if (gestor) {
      await prisma.gestor.update({ where: { id_gestor: gestor.id_gestor }, data: { usuario_id: -gestor.id_gestor } });
    }
    return { denuncias: 0, fotos: 0 };
  }

  const cidadao = await prisma.cidadao.findUnique({ where: { usuario_id: usuarioId } });
  if (!cidadao) return { denuncias: 0, fotos: 0 };

  return prisma.$transaction(async (tx) => {
    const fotos = await tx.imagem.deleteMany({ where: { denuncia: { cidadao_id: cidadao.id_cidadao } } });
    const denuncias = await tx.denuncia.updateMany({
      where: { cidadao_id: cidadao.id_cidadao },
      data: { email_solicitante_cifrado: null },
    });
    // ids de usuário negativos nunca colidem com contas reais e mantêm a coluna única.
    await tx.cidadao.update({ where: { id_cidadao: cidadao.id_cidadao }, data: { usuario_id: -cidadao.id_cidadao } });

    return { denuncias: denuncias.count, fotos: fotos.count };
  });
}
