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

  // Function to format dates based on frequency
  const formatDateForDisplay = (date: string, frequency: string) => {
    if (!date) return date;
    
    try {
      const dateObj = new Date(date);
      
      switch (frequency) {
        case "monthly":
          // Format as Jan '24, Feb '24, etc. to avoid repeating months across years
          const month = dateObj.toLocaleString('default', { month: 'short' });
          const year = dateObj.getFullYear().toString().slice(-2);
          return `${month} '${year}`;
        case "daily":
          // Format as d1, d2, d3, etc.
          const day = dateObj.getDate();
          return `d${day}`;
        case "weekly":
          // Format as W1, W2, W3, etc.
          const week = Math.ceil((dateObj.getDate() + new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay()) / 7);
          return `W${week}`;
        default:
          return date;
      }
    } catch (error) {
      return date;
    }
  };

  // Prepare data with formatted dates for chart
  const chartData = React.useMemo(() => {
    // For monthly frequency, aggregate data by month to show only one point per month
    if (selectedFrequency === 'monthly') {
      const monthlyMap = new Map();
      
      forecastData.forEach(item => {
        const dateObj = new Date(item.Date);
        const monthYearKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
        
        if (!monthlyMap.has(monthYearKey)) {
          // Create new aggregated entry for this month
          monthlyMap.set(monthYearKey, {
            ...item,
            FormattedDate: formatDateForDisplay(item.Date, selectedFrequency),
            // Sum all demand values for this month
            Forecasted_Demand: 0,
            // Count of entries for this month
            count: 0
          });
        }
        
        // Add to the sum and increment count
        const monthEntry = monthlyMap.get(monthYearKey);
        monthEntry.Forecasted_Demand += item.Forecasted_Demand;
        monthEntry.count += 1;
      });
      
      // Convert map to array and sort by date
      return Array.from(monthlyMap.values()).sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    // For weekly frequency, aggregate data by week to show only one point per week
    if (selectedFrequency === 'weekly') {
      const weeklyMap = new Map();
      
      forecastData.forEach(item => {
        const dateObj = new Date(item.Date);
        // Get week number and year for this date
        const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
        const pastDaysOfYear = (dateObj.getTime() - startOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        const weekYearKey = `${dateObj.getFullYear()}-W${weekNumber}`;
        
        if (!weeklyMap.has(weekYearKey)) {
          // Create new aggregated entry for this week
          weeklyMap.set(weekYearKey, {
            ...item,
            FormattedDate: formatDateForDisplay(item.Date, selectedFrequency),
            // Sum all demand values for this week
            Forecasted_Demand: 0,
            // Count of entries for this week
            count: 0
          });
        }
        
        // Add to the sum and increment count
        const weekEntry = weeklyMap.get(weekYearKey);
        weekEntry.Forecasted_Demand += item.Forecasted_Demand;
        weekEntry.count += 1;
      });
      
      // Convert map to array and sort by date
      return Array.from(weeklyMap.values()).sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    // For daily frequency, sample every 3rd day to reduce chart points
    if (selectedFrequency === 'daily') {
      return forecastData
        .filter((_, index) => index % 3 === 0) // Take every 3rd day
        .map(item => ({
          ...item,
          FormattedDate: formatDateForDisplay(item.Date, selectedFrequency)
        }));
    }
    
    // For any other frequency, just format the dates
    return forecastData.map(item => ({
      ...item,
      FormattedDate: formatDateForDisplay(item.Date, selectedFrequency)
    }));
  }, [forecastData, selectedFrequency]);

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
            <div className="text-xs text-muted-foreground">Chart points: {chartData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Forecasted Demand - {selectedProductName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`h-80 ${selectedFrequency === 'daily' ? 'overflow-x-auto' : 'w-full'}`}>
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading forecast data...</div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width={selectedFrequency === 'daily' ? '500%' : '100%'} height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="FormattedDate" 
                    label={{ 
                      value: selectedFrequency === 'monthly' ? 'Months' : 
                              selectedFrequency === 'weekly' ? 'Weeks' : 'Days', 
                      position: 'insideBottom', 
                      offset: -5 
                    }} 
                  />
                  <YAxis 
                    label={{ 
                      value: 'Unit', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [Math.round(value).toLocaleString(), 'Demand']}
                    labelFormatter={(label) => {
                      if (selectedFrequency === 'daily') {
                        // Find the original date for this daily point
                        const dataPoint = chartData.find(d => d.FormattedDate === label);
                        if (dataPoint) {
                          const dateObj = new Date(dataPoint.Date);
                          return dateObj.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        }
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Forecasted_Demand" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ 
                      r: selectedFrequency === 'daily' ? 6 : 4, 
                      fill: '#8884d8',
                      strokeWidth: 2,
                      stroke: '#fff'
                    }}
                    activeDot={{ 
                      r: selectedFrequency === 'daily' ? 8 : 6, 
                      fill: '#8884d8',
                      strokeWidth: 2,
                      stroke: '#fff'
                    }}
                  />
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
