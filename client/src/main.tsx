import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import MyTrips from "./pages/my-trips";
import TripDetails from "./pages/trip-details";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/home";
import PlanTrip from "./pages/plan-trip";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<PlanTrip />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/trip/:id" element={<TripDetails />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <ReactQueryDevtools />
    </QueryClientProvider>
  </React.StrictMode>
);