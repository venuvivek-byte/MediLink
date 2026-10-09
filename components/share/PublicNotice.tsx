import { ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PublicNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldX className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{children}</p>
        </CardContent>
      </Card>
    </div>
  );
}
