import { AuthGuard } from "@/components/Auth/AuthGuard";

export default function DemandasLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="cidadao" loginPath="/login">
      {children}
    </AuthGuard>
  );
}
