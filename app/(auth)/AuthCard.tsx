import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  tagline,
  children,
}: {
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-sm">
            <Heart className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MyHealthVault</h1>
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </div>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
