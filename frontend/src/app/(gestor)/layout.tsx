import { AuthGuard } from "@/components/Auth/AuthGuard";

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="gestor" loginPath="/logingestor">
      {children}
    </AuthGuard>
  );
}
