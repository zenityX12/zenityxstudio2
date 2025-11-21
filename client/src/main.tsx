import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on non-JSON responses (server errors)
        if (error instanceof Error && error.message.includes('non-JSON response')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes - ข้อมูลจะถือว่า fresh อยู่ 5 นาที
      gcTime: 1000 * 60 * 10, // 10 minutes - เก็บแคชไว้ 10 นาที
      refetchOnWindowFocus: false, // ไม่ refetch เมื่อกลับมาที่หน้าต่าง
      refetchOnMount: false, // ไม่ refetch เมื่อ component mount ใหม่ (ถ้ามีแคชอยู่แล้ว)
      refetchOnReconnect: false, // ไม่ refetch เมื่อเชื่อมต่ออินเทอร์เน็ตใหม่
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          // If not JSON, throw a more descriptive error
          const text = await response.text();
          console.error("[TRPC] Non-JSON response:", text.substring(0, 200));
          throw new Error(`Server returned non-JSON response (${response.status}). This usually indicates a server error.`);
        }
        
        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
