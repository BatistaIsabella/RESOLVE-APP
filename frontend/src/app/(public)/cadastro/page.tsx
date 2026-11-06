"use client";

import { useState } from "react";
import { Button } from "@/components/UI/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { ApiError } from "@/lib/api";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<"cidadao" | "gestor">("cidadao");
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.isLoading);
  const [erro, setErro] = useState("");

  const inputStyle =
    "w-full px-3 py-2 border border-purple-300 rounded-lg text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 " +
    "hover:border-purple-400 placeholder:text-gray-400 bg-purple-50";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem!");
      return;
    }

    if (tipoUsuario === "gestor" && !codigoAcesso) {
      setErro("Código de acesso é obrigatório para gestores!");
      return;
    }

    if (!aceitouTermos) {
      setErro("É preciso aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    try {
      await register({
        nome,
        email: email.trim().toLowerCase(),
        senha,
        papel: tipoUsuario,
        ...(tipoUsuario === "gestor" ? { codigoAcesso } : {}),
      });
      alert("Conta criada com sucesso! Faça login para continuar.");
      router.push(tipoUsuario === "gestor" ? "/logingestor" : "/login");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar conta");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/recife.jpg')" }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #3D2683cc 0%, #8528FFaa 50%, #FF6636cc 100%)",
        }}
      />

      <nav className="absolute top-0 left-0 right-0 flex justify-between items-center py-4 px-8 z-30">
        <div className="text-2xl font-bold text-white opacity-60">RESOLVE</div>
        <Link href="/">
          <Button variant="outline" size="md" className="text-white border-white">
            ← Voltar
          </Button>
        </Link>
      </nav>

      <div className="relative z-10 w-full max-w-sm mx-4 mt-20">
        <div className="bg-white rounded-2xl shadow-xl px-8 py-8">
          <h1 className="text-2xl font-bold text-center text-purple-600 mb-6">
            Criar conta
          </h1>

          {erro && (
            <p className="text-sm text-red-500 text-center mb-4">{erro}</p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nome completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Confirmar senha</label>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="flex gap-6 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={tipoUsuario === "cidadao"}
                  onChange={() => setTipoUsuario("cidadao")}
                  className="accent-purple-600"
                />
                Cidadão
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={tipoUsuario === "gestor"}
                  onChange={() => setTipoUsuario("gestor")}
                  className="accent-purple-600"
                />
                Gestor
              </label>
            </div>

            {tipoUsuario === "gestor" && (
              <input
                type="text"
                placeholder="Código de acesso"
                value={codigoAcesso}
                onChange={(e) => setCodigoAcesso(e.target.value)}
                className={inputStyle}
              />
            )}

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                required
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                className="accent-purple-600 mt-0.5"
              />
              Li e aceito os Termos de Uso e a Política de Privacidade do RESOLVE.
            </label>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
