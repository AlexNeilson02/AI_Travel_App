import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Only import DevTools in development
const ReactQueryDevtools = process.env.NODE_ENV === 'development'
  ? React.lazy(() => import("@tanstack/react-query-devtools").then(mod => ({ default: mod.ReactQueryDevtools })))
  : null;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {ReactQueryDevtools && (
        <React.Suspense>
          <ReactQueryDevtools />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);