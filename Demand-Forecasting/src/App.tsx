import { Suspense, useEffect } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme-provider";
import Layout from "./components/Layout";
import HistoricalSales from "./pages/HistoricalSales";
import ForecastDemand from "./pages/ForecastDemand";
import InventoryProcurement from "./pages/InventoryProcurement";
import Scheduling from "./pages/Scheduling";
import SupplierPerformance from "./pages/SupplierPerformance";
import RiskAnalysis from "./pages/RiskAnalysis";
import Home from "./components/home";
import routes from "tempo-routes";
import { testAPIConnection } from "@/lib/api";

function App() {
  useEffect(() => {
    // Test API connection on app load
    testAPIConnection();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="scm-dashboard-theme">
      <Suspense fallback={<p>Loading...</p>}>
        <>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/historical-sales" replace />}
            />
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<Layout />}>
              <Route path="historical-sales" element={<HistoricalSales />} />
              <Route path="forecast-demand" element={<ForecastDemand />} />
              <Route
                path="inventory-procurement"
                element={<InventoryProcurement />}
              />
              <Route path="scheduling" element={<Scheduling />} />
              <Route
                path="supplier-performance"
                element={<SupplierPerformance />}
              />
              <Route path="risk-analysis" element={<RiskAnalysis />} />
            </Route>
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;