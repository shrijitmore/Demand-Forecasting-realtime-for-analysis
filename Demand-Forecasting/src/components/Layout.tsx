import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, Download, Bug } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { api, apiCall, debugAPI } from "@/lib/api";

const Layout = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    // Refresh all data endpoints
    await Promise.all([
      apiCall(() => api.refreshData("historical-sales")),
      apiCall(() => api.refreshData("forecast-demand")),
      apiCall(() => api.refreshData("inventory")),
      apiCall(() => api.refreshData("scheduling")),
      apiCall(() => api.refreshData("supplier-performance")),
    ]);
    setIsRefreshing(false);
    // Reload the current page to fetch fresh data
    window.location.reload();
  };

  const handleGlobalExport = async () => {
    const currentPath = location.pathname;
    let endpoint = "dashboard";

    if (currentPath.includes("historical-sales")) endpoint = "historical-sales";
    else if (currentPath.includes("forecast-demand"))
      endpoint = "forecast-demand";
    else if (currentPath.includes("inventory-procurement"))
      endpoint = "inventory";
    else if (currentPath.includes("scheduling")) endpoint = "scheduling";
    else if (currentPath.includes("supplier-performance"))
      endpoint = "supplier-performance";
    else if (currentPath.includes("risk-analysis"))
      endpoint = "risk-analysis";

    const blob = await apiCall(() => api.exportData(endpoint));
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${endpoint}-export.csv`;
      a.click();
    }
  };

  const handleDebugAPI = async () => {
    await debugAPI();
  };

  const tabs = [
    {
      id: "historical-sales",
      label: "Historical Sales",
      path: "/historical-sales",
    },
    {
      id: "forecast-demand",
      label: "Forecast Demand",
      path: "/forecast-demand",
    },
    {
      id: "inventory-procurement",
      label: "Inventory & Procurement",
      path: "/inventory-procurement",
    },
    { 
      id: "scheduling", 
      label: "Scheduling", 
      path: "/scheduling" 
    },
    {
      id: "supplier-performance",
      label: "Supplier Performance",
      path: "/supplier-performance",
    },
    {
      id: "risk-analysis",
      label: "Risk Analysis",
      path: "/risk-analysis",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Debug Button - Only show in development */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDebugAPI}
            className="bg-yellow-100 hover:bg-yellow-200"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug API
          </Button>
        </div>
      )}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Unified SCM Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive supply chain management analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh data"
            onClick={handleGlobalRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-1"
            onClick={handleGlobalExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <Card className="border shadow-sm">
        <div className="border-b px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  location.pathname === tab.path
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4">
          <Outlet />
        </div>
      </Card>

      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© 2023 Unified SCM Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;