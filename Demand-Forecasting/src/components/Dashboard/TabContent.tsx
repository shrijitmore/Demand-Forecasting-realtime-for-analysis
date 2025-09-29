import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import ListAnalysis from "@/pages/ListAnalysis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";

interface TabContentProps {
  activeTab: string;
  tabId: string;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const TabContent: React.FC<TabContentProps> = ({
  activeTab = "historical-sales",
  tabId,
  isLoading = false,
  error = null,
  onRefresh = () => {},
}) => {
  // Mock data for demonstration purposes
  const periods = ["Monthly", "Quarterly", "Yearly"];
  const products = ["Product A", "Product B", "Product C"];
  const frequencies = ["Daily", "Weekly", "Monthly"];
  const suppliers = ["Supplier A", "Supplier B", "Supplier C"];
  const operators = ["Operator A", "Operator B", "Operator C"];

  if (isLoading) {
    return (
      <div className="w-full p-4 space-y-4 bg-background">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full mb-6" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center bg-background">
        <div className="text-destructive text-xl mb-4">Error loading data</div>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-background">
      <Tabs value={activeTab} className="w-full">
        {/* Historical Sales Tab Content */}
        <TabsContent value="historical-sales" className="w-full space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Historical Sales</h2>
            <div className="flex items-center space-x-2">
              <Select defaultValue="Monthly">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-xl font-medium mb-4">
                Sales Visualization
              </div>
              <div className="h-80 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                Chart Area: Sales by Region
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">
                  Monthly Sales Trend
                </div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Line Chart: Monthly Sales Trend
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">
                  Sales Distribution
                </div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Pie Chart: Sales by Category
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-medium">AI-Generated Insights</div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-muted/10">
                <p className="text-muted-foreground">
                  Sales have increased by 15% compared to the previous period,
                  with the highest growth in the Western region (23%). The
                  Electronics category shows the strongest performance with a
                  31% increase year-over-year.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Demand Tab Content */}
        <TabsContent value="forecast-demand" className="w-full space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Forecast Demand</h2>
            <div className="flex items-center space-x-2">
              <Select defaultValue="Product A">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue="Weekly">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-xl font-medium mb-4">
                Forecasted vs Actual Demand
              </div>
              <div className="h-80 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                Line Chart: Forecasted vs Actual Demand
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">
                  Reorder Point & Safety Stock
                </div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Line Chart: Forecasted Reorder Point & Safety Stock
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">EOQ and Demand</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Line Chart: EOQ and Demand
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-medium">
                  Forecasted Demand Table
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-muted/10 h-60 flex items-center justify-center">
                Table: Forecasted Demand Data
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory & Procurement Tab Content */}
        <TabsContent value="inventory-procurement" className="w-full space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Inventory & Procurement</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-xl font-medium mb-4">Reorder Chart</div>
              <div className="h-80 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                Chart: SKU vs Reorder Point
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">Lead Time by SKU</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Chart: Lead Time by SKU
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">Inventory Alerts</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Table: Inventory Alerts
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-medium">Production Schedule</div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-muted/10 h-60 flex items-center justify-center">
                Table: Production Schedule
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling & Operators Tab Content */}
        <TabsContent value="scheduling-operators" className="w-full space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Scheduling & Operators</h2>
            <div className="flex items-center space-x-2">
              <Select defaultValue="Operator A">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-xl font-medium mb-4">Operator Workload</div>
              <div className="h-80 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                Bar Chart: Operator Workload
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">Station Load</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Bar Chart: Station Load
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">Attendance Log</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Table: Attendance Log
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-medium">
                  AI Insights by Operator
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-muted/10">
                <div className="text-muted-foreground">
                  <MarkdownRenderer 
                    content="**Operator A** has maintained a **98% attendance rate** and completed **127 units** this month, which is **15% above average**. Their efficiency score is in the **top 10%** of all operators.

* Key achievements:
  * Consistent performance
  * High quality output
  * Excellent teamwork" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Performance Tab Content */}
        <TabsContent value="supplier-performance" className="w-full space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Supplier Performance</h2>
            <div className="flex items-center space-x-2">
              <Select defaultValue="Supplier A">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-xl font-medium mb-4">
                Delivery Performance
              </div>
              <div className="h-80 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                Pie Chart: On-Time vs Late Delivery
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">Supplier Metrics</div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Metrics: Lead Time, OTD %, Fulfillment %, Quality Score
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="text-xl font-medium mb-4">
                  Alternate Suppliers
                </div>
                <div className="h-60 w-full bg-muted/20 flex items-center justify-center border rounded-md">
                  Table: Alternate Suppliers
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-medium">AI Insight for SKU</div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              <div className="border rounded-md p-4 bg-muted/10">
                <div className="text-muted-foreground">
                  <MarkdownRenderer 
                    content="**Supplier A** has shown consistent improvement in delivery times, reducing average lead time by **2.3 days** over the past quarter.

## Performance Metrics:
* **Quality scores** improved by **7%**
* **Defect rate** reduced from **1.2%** to **0.8%**
* **On-time delivery** rate: **95.2%**

### Recommendations:
* Continue monitoring quality metrics
* Consider expanding partnership" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Analysis Tab Content */}
        <TabsContent value="list-analysis" className="w-full">
          <ListAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TabContent;
