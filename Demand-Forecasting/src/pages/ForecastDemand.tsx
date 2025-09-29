// Component for forecasting demand
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
  Date: string;
  Forecasted_Demand: number;
  PRODUCT_CARD_ID: string;
  PRODUCT_NAME: string;
  FREQUENCY: string;
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
  const [insightsPeriod, setInsightsPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "daily", label: "Daily" }
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
      case "daily":
        data = await apiCall(() => api.getForecasts('daily'));
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
    // Forecast insights are not product-specific in backend; use selected insightsPeriod
    const data = await apiCall(() => api.getForecastInsights(insightsPeriod));
    if (Array.isArray(data)) {
      // Normalize keys to a common shape
      const normalized = data.map((item: any) => ({
        Month: item.Month || item.month,
        Quarter: item.Quarter || item.quarter,
        Year: item.Year || item.year,
        Product_Name: item.Product_Name || item.PRODUCT_NAME || item.product_name,
        Insight: item.Insight || item.GPT_Bullet_Insight || item.GPT_Quarterly_Insight || item.GPT_Yearly_Insight || item.insight || '',
      }));
      // If monthly period and month is selected, filter to the chosen month
      const filtered = insightsPeriod === 'monthly' && selectedMonth
        ? normalized.filter((i: any) => i.Month === selectedMonth)
        : normalized;
      setInsights(filtered);
    } else {
      setInsights([]);
    }
  };

  // Fetch available months for the selected product
  const fetchAvailableMonths = async () => {
    // Months derive from forecast insights monthly endpoint
    const data = await apiCall(() => api.getForecastInsights('monthly'));
    if (Array.isArray(data)) {
      const months = [...new Set(data.map((item: any) => item.Month).filter(Boolean))] as string[];
      // Sort descending to show recent first
      months.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
      setAvailableMonths(months);
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0]);
      }
    } else {
      setAvailableMonths([]);
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
      + "Date,Product Name,Forecasted Demand\n"
      + forecastData.map(row => `${row.Date},${row.PRODUCT_NAME},${row.Forecasted_Demand}`).join("\n");
    
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

  // Refetch insights when period changes
  useEffect(() => {
    // If not monthly, clear selectedMonth to avoid misleading filtering/labels
    if (insightsPeriod !== 'monthly' && selectedMonth) {
      setSelectedMonth('');
    }
    fetchInsights();
  }, [insightsPeriod]);

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
              {forecastData.reduce((sum, item) => sum + item.Forecasted_Demand, 0).toLocaleString()}
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
                ? (forecastData.reduce((sum, item) => sum + item.Forecasted_Demand, 0) / forecastData.length).toFixed(2)
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
                  <XAxis dataKey="Date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Forecasted_Demand" stroke="#8884d8" strokeWidth={2} />
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
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {insightsPeriod === 'monthly' && selectedMonth
                ? `AI Forecast Insights • ${selectedMonth} • ${insights.length} found`
                : `AI Forecast Insights • ${insightsPeriod.charAt(0).toUpperCase() + insightsPeriod.slice(1)} • ${insights.length} found`}
            </CardTitle>
            <Select value={insightsPeriod} onValueChange={(v) => setInsightsPeriod(v as 'monthly' | 'quarterly' | 'yearly')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="h-64 overflow-y-auto space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2 flex flex-wrap gap-2">
                    {insightsPeriod === 'monthly' && insight.Month && (
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground border">Month: {insight.Month}</span>
                    )}
                    {insightsPeriod === 'quarterly' && insight.Quarter && (
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground border">Quarter: {insight.Quarter}</span>
                    )}
                    {insightsPeriod === 'yearly' && (insight.Year || insight.Month || insight.Quarter) && (
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground border">Year: {insight.Year || (insight.Month ? String(insight.Month).slice(0,4) : '') || ''}</span>
                    )}
                    {insight.Product_Name && (
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground border">Product: {insight.Product_Name}</span>
                    )}
                  </div>
                  <div className="text-sm">
                    <MarkdownRenderer content={insight.Insight || 'No insight available'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No insights available</div>
          )}
        </CardContent>
      </Card>
      
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
          <div className="h-64 overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Product Name</th>
                  <th className="text-left p-2">Forecasted Demand</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/20">
                    <td className="p-2">{row.Date}</td>
                    <td className="p-2">{row.PRODUCT_NAME}</td>
                    <td className="p-2">{row.Forecasted_Demand.toLocaleString()}</td>
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
