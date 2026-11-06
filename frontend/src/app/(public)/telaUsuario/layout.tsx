import { AuthGuard } from "@/components/Auth/AuthGuard";

export default function TelaUsuarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="cidadao" loginPath="/login">
      {children}
    </AuthGuard>
  );
}
