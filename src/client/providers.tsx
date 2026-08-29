"use client";
import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { del, get, set } from "idb-keyval";
import { trpc } from "./trpc";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

// Bumped whenever a persisted-cache-breaking change ships (query shape, schema, etc.)
// so stale offline data isn't hydrated into a client that no longer understands it.
const PERSIST_CACHE_BUSTER = "district-cache-v1";

function createIdbStorage() {
  return {
    getItem: async (key: string) => (await get(key)) ?? null,
    setItem: (key: string, value: string) => set(key, value),
    removeItem: (key: string) => del(key),
  };
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window !== "undefined" ? createIdbStorage() : undefined,
      key: "district-query-cache",
    })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          buster: PERSIST_CACHE_BUSTER,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
