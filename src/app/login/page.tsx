"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
    } catch {
      setErrorMsg("Network error — check your connection and try again");
      setStatus("error");
      return;
    }

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
            <label htmlFor="passphrase" className="sr-only">
              Passphrase
            </label>
            <Input
              id="passphrase"
              autoFocus
              type={show ? "text" : "password"}
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              aria-invalid={!!errorMsg}
              className="pr-12"
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

          <div aria-live="polite">
            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={status === "loading" || passphrase.length < 1}
            className="w-full"
          >
            {status === "loading" ? "Checking…" : "Enter"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          New passphrase? A fresh account will be created automatically.
        </p>
      </div>
    </main>
  );
}
