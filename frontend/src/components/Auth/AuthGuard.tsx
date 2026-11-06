"use client";

import { ReactNode, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Papel, useAuthStore } from "@/stores/useAuthStore";

interface AuthGuardProps {
  /** Perfil exigido para a área. */
  role: Papel;
  /** Para onde mandar quem não tem sessão. */
  loginPath: string;
  children: ReactNode;
}

const HOME_POR_PAPEL: Record<Papel, string> = {
  cidadao: "/telaUsuario",
  gestor: "/gestor/dashboard",
};

// Proteção central das rotas privadas: sem sessão volta para o login da área;
// sessão de outro perfil vai para a tela inicial do próprio perfil.
export function AuthGuard({ role, loginPath, children }: AuthGuardProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.role);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  // false no servidor e na hidratação, true só no navegador: evita divergência com o HTML do servidor.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const autorizado = !!token && userRole === role;

  useEffect(() => {
    if (!mounted || !hasHydrated || autorizado) return;
    router.replace(token && userRole ? HOME_POR_PAPEL[userRole] : loginPath);
  }, [mounted, hasHydrated, autorizado, token, userRole, loginPath, router]);

  if (!mounted || !hasHydrated || !autorizado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return <>{children}</>;
}
