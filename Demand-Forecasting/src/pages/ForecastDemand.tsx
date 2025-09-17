import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, TrendingUp, Package, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiCall } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";

interface Product {
  PRODUCT_CARD_ID: string;
  PRODUCT_NAME: string;
}

interface ForecastData {
  period: string;
  total_demand: number;
  average_demand: number;
}

const ForecastDemand = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" }
  ];

  // Fetch products for dropdown
  const fetchProducts = async () => {
    const data = await apiCall(() => api.getProducts());
    if (data) {
      setProducts(data);
      if (data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0].PRODUCT_CARD_ID);
      }
    }
  };

  // Fetch forecast data
  const fetchForecastData = async () => {
    if (!selectedProduct) return;
    
    setLoading(true);
    let data;
    
    switch (selectedFrequency) {
      case "weekly":
        data = await apiCall(() => api.getForecastsWeekly(selectedProduct));
        break;
      case "monthly":
        data = await apiCall(() => api.getForecastsMonthly(selectedProduct));
        break;
      case "quarterly":
        data = await apiCall(() => api.getForecastsQuarterly(selectedProduct));
        break;
      default:
        data = await apiCall(() => api.getForecastsMonthly(selectedProduct));
    }
    
    if (data) {
      setForecastData(data);
    }
    setLoading(false);
  };

  // Fetch insights
  const fetchInsights = async () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.PRODUCT_CARD_ID === selectedProduct);
    const data = await apiCall(() => api.getInsights(selectedMonth, selectedProduct, product?.PRODUCT_NAME));
    if (data) {
      console.log('Insights data received:', data);
      setInsights(data);
    } else {
      console.log('No insights data received');
    }
  };

  // Fetch available months for the selected product
  const fetchAvailableMonths = async () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.PRODUCT_CARD_ID === selectedProduct);
    const data = await apiCall(() => api.getInsights(undefined, selectedProduct, product?.PRODUCT_NAME));
    if (data) {
      const months = [...new Set(data.map((item: any) => item.Month))].sort();
      setAvailableMonths(months);
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0]);
      }
    }
  };

  const handleRefresh = async () => {
    await fetchForecastData();
    await fetchAvailableMonths();
    await fetchInsights();
  };

  const handleExport = async () => {
    // Create CSV content
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Period,Total Demand,Average Demand\n"
      + forecastData.map(row => `${row.period},${row.total_demand},${row.average_demand}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forecast-demand-${selectedProduct}-${selectedFrequency}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchForecastData();
      fetchAvailableMonths();
      fetchInsights();
    }
  }, [selectedProduct, selectedFrequency]);

  useEffect(() => {
    if (selectedMonth && selectedProduct) {
      fetchInsights();
    }
  }, [selectedMonth]);

  const selectedProductName = products.find(p => p.PRODUCT_CARD_ID === selectedProduct)?.PRODUCT_NAME || "";

  return (
    <div className="w-full p-4 bg-background space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Forecast Demand</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.PRODUCT_CARD_ID} value={product.PRODUCT_CARD_ID}>
                  {product.PRODUCT_NAME}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedFrequency}
            onValueChange={setSelectedFrequency}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Frequency" />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((frequency) => (
                <SelectItem key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecastData.reduce((sum, item) => sum + item.total_demand, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Demand</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecastData.length > 0 
                ? (forecastData.reduce((sum, item) => sum + item.average_demand, 0) / forecastData.length).toFixed(2)
                : "0"
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecastData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Forecasted Demand - {selectedProductName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading forecast data...</div>
              </div>
            ) : forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_demand" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="average_demand" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">No forecast data available</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>AI Insights for {selectedMonth} ({insights.length} found)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">
                    {insight.Month} - {insight.PRODUCT_NAME} ({insight.PRODUCT_CARD_ID})
                  </div>
                  <div className="text-sm">
                    <MarkdownRenderer 
                      content={insight.GPT_Bullet_Insight || insight.ai_insight || insight.insight || 'No insight available'} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Debug: Show insights data structure */}
      {insights.length === 0 && selectedMonth && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Debug: No Insights Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Selected Product: {selectedProduct} | Product Name: {selectedProductName} | Month: {selectedMonth}
            </p>
            <p className="text-sm text-muted-foreground">
              Available Months: {availableMonths.join(', ')}
            </p>
            <p className="text-sm text-muted-foreground">
              Check browser console for API response details.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Forecast Data Table</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Total Demand</th>
                  <th className="text-left p-2">Average Demand</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/20">
                    <td className="p-2">{row.period}</td>
                    <td className="p-2">{row.total_demand.toLocaleString()}</td>
                    <td className="p-2">{row.average_demand.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForecastDemand;
