import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function PageShell({ children, className, title }: PageShellProps) {
  return (
    <div className="flex flex-col min-h-dvh">
      {title && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 h-14 flex items-center">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </header>
      )}
      <main className={cn("flex-1 pb-20 pt-2", className)}>{children}</main>
      <BottomNav />
    </div>
  );
}
