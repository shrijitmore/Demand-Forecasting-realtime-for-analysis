import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, Download } from "lucide-react";
import TabContent from "./Dashboard/TabContent";
import APITest from "./APITest";
import { useTheme } from "../lib/theme-provider";

const Home = () => {
  const [activeTab, setActiveTab] = useState("historical-sales");
  const { theme, setTheme } = useTheme() || {
    theme: "light",
    setTheme: () => {},
  };
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
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
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      {/* API Test Component */}
      <div className="mb-6">
        <APITest />
      </div>

      <Card className="border shadow-sm">
        <Tabs
          defaultValue="historical-sales"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b px-4 py-2">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
              <TabsTrigger value="historical-sales">
                Historical Sales
              </TabsTrigger>
              <TabsTrigger value="forecast-demand">Forecast Demand</TabsTrigger>
              <TabsTrigger value="inventory-procurement">
                Inventory & Procurement
              </TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
              <TabsTrigger value="supplier-performance">
                Supplier Performance
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="historical-sales" className="p-4">
            <TabContent activeTab="historical-sales" />
          </TabsContent>

          <TabsContent value="forecast-demand" className="p-4">
            <TabContent activeTab="forecast-demand" />
          </TabsContent>

          <TabsContent value="inventory-procurement" className="p-4">
            <TabContent activeTab="inventory-procurement" />
          </TabsContent>

          <TabsContent value="scheduling" className="p-4">
            <TabContent activeTab="scheduling" />
          </TabsContent>

          <TabsContent value="supplier-performance" className="p-4">
            <TabContent activeTab="supplier-performance" />
          </TabsContent>
        </Tabs>
      </Card>

      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© 2023 Unified SCM Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
