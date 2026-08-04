"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [passphrase, setPassphrase] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg((data as { error?: string }).error ?? "Something went wrong");
      setStatus("error");
      return;
    }

    queryClient.clear();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">District</h1>
          <p className="text-sm text-muted-foreground">Enter your passphrase to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              autoFocus
              type={show ? "text" : "password"}
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-input bg-card px-4 py-3 pr-12 text-base",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                errorMsg && "border-destructive focus:ring-destructive"
              )}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide passphrase" : "Show passphrase"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || passphrase.length < 1}
            className={cn(
              "w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground",
              "transition-opacity hover:opacity-90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {status === "loading" ? "Checking…" : "Enter"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          New passphrase? A fresh account will be created automatically.
        </p>
      </div>
    </main>
  );
}
