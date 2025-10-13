import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Moon, Sun } from "lucide-react";
import TabContent from "./TabContent";
import { useTheme } from "@/lib/theme-provider";

interface DashboardLayoutProps {
  className?: string;
}

const DashboardLayout = ({ className = "" }: DashboardLayoutProps) => {
  const [activeTab, setActiveTab] = useState("historical-sales");
  const { theme, setTheme } = useTheme
    ? useTheme()
    : { theme: "light", setTheme: () => {} };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${className}`}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Supply Chain Control Tower</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button variant="outline" size="icon" aria-label="Refresh data">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Download data">
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <Card className="bg-card">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 w-full justify-start gap-2 overflow-x-auto flex-wrap">
              <TabsTrigger
                value="historical-sales"
                className="data-[state=active]:bg-muted"
              >
                Historical Sales
              </TabsTrigger>
              <TabsTrigger
                value="forecast-demand"
                className="data-[state=active]:bg-muted"
              >
                Forecast Demand
              </TabsTrigger>
              <TabsTrigger
                value="inventory-procurement"
                className="data-[state=active]:bg-muted"
              >
                Inventory & Procurement
              </TabsTrigger>
              <TabsTrigger
                value="scheduling"
                className="data-[state=active]:bg-muted"
              >
                Scheduling & Operators
              </TabsTrigger>
              <TabsTrigger
                value="supplier-performance"
                className="data-[state=active]:bg-muted"
              >
                Supplier Performance
              </TabsTrigger>
              <TabsTrigger
                value="list-analysis"
                className="data-[state=active]:bg-muted"
              >
                Risk Analysis
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 md:p-6">
            <TabsContent value="historical-sales" className="mt-0">
              <TabContent activeTab={activeTab} tabId="historical-sales" />
            </TabsContent>
            <TabsContent value="forecast-demand" className="mt-0">
              <TabContent activeTab={activeTab} tabId="forecast-demand" />
            </TabsContent>
            <TabsContent value="inventory-procurement" className="mt-0">
              <TabContent activeTab={activeTab} tabId="inventory-procurement" />
            </TabsContent>
            <TabsContent value="scheduling" className="mt-0">
              <TabContent activeTab={activeTab} tabId="scheduling" />
            </TabsContent>
            <TabsContent value="supplier-performance" className="mt-0">
              <TabContent activeTab={activeTab} tabId="supplier-performance" />
            </TabsContent>
            <TabsContent value="list-analysis" className="mt-0">
              <TabContent activeTab={activeTab} tabId="list-analysis" />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};

export default DashboardLayout;
