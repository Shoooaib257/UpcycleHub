// Import only what we need to reduce bundle size
import { QueryClient } from "@tanstack/react-query";

// Create an optimized query client with minimal default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
