import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, IndianRupee, ShoppingCart, Truck, AlertTriangle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, apiCall, SalesKPIs } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";

const HistoricalSales = () => {
  const [salesKPIs, setSalesKPIs] = useState<SalesKPIs | null>(null);
  const [citySales, setCitySales] = useState<any>(null);
  const [categoryDistribution, setCategoryDistribution] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState<{ months: string[], sales: number[] } | null>(null);
  const [shippingMode, setShippingMode] = useState<any>(null);
  const [regionSales, setRegionSales] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [yearlyInsights, setYearlyInsights] = useState<any[]>([]);
  const [monthlyInsights, setMonthlyInsights] = useState<any[]>([]);
  const [quarterlyInsights, setQuarterlyInsights] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'yearly' | 'monthly' | 'quarterly'>('yearly');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  
  // New state for sales trend
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [salesTrendData, setSalesTrendData] = useState<any[]>([]);
  const [salesTrendLoading, setSalesTrendLoading] = useState(false);
  
  // Individual loading states for each chart
  const [loadingStates, setLoadingStates] = useState({
    kpis: false,
    city: false,
    category: false,
    monthly: false,
    shipping: false,
    region: false,
    products: false,
    insights: false
  });

  // Fetch sales trend data from external API
  const fetchSalesTrendData = useCallback(async (period: string) => {
    setSalesTrendLoading(true);
    try {
      const response = await fetch(`http://192.168.10.157:5000/api/${period}`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const data = await response.json();
      
      // Transform data for chart
      const groupedData: { [key: string]: { [product: string]: number } } = {};
      
      data.forEach((item: any) => {
        if (!groupedData[item.Date]) {
          groupedData[item.Date] = {};
        }
        groupedData[item.Date][item.Product] = item.Order_Quantity;
      });
      
      const chartData = Object.keys(groupedData).map(date => ({
        date,
        ...groupedData[date]
      }));
      
      setSalesTrendData(chartData);
    } catch (error) {
      console.error('Error fetching sales trend data:', error);
      setSalesTrendData([]);
    } finally {
      setSalesTrendLoading(false);
    }
  }, []);

  const fetchSalesData = useCallback(async () => {
    if (dataLoaded) return; // Prevent refetching if data is already loaded
    
    setLoading(true);

    try {
      // Fetch all data with timeout and independent error handling
      const timeout = 3000; // 3 second timeout for each API call
      
      // KPIs
      setLoadingStates(prev => ({ ...prev, kpis: true }));
      const kpisPromise = Promise.race([
        apiCall(() => api.getSalesKPIs()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setSalesKPIs(data as SalesKPIs);
        setLoadingStates(prev => ({ ...prev, kpis: false }));
      }).catch(() => {
        setSalesKPIs(null);
        setLoadingStates(prev => ({ ...prev, kpis: false }));
      });

      // City Sales
      setLoadingStates(prev => ({ ...prev, city: true }));
      const cityPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('city-sales')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setCitySales(data && data.cities && data.sales ? data : null);
        setLoadingStates(prev => ({ ...prev, city: false }));
      }).catch(() => {
        setCitySales(null);
        setLoadingStates(prev => ({ ...prev, city: false }));
      });

      // Category Distribution
      setLoadingStates(prev => ({ ...prev, category: true }));
      const categoryPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('category-distribution')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setCategoryDistribution(data && data.categories && data.sales ? data : null);
        setLoadingStates(prev => ({ ...prev, category: false }));
      }).catch(() => {
        setCategoryDistribution(null);
        setLoadingStates(prev => ({ ...prev, category: false }));
      });

      // Monthly Sales
      setLoadingStates(prev => ({ ...prev, monthly: true }));
      const monthlyPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('monthly-sales')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setMonthlySales(data && data.months && data.sales ? data : null);
        setLoadingStates(prev => ({ ...prev, monthly: false }));
      }).catch(() => {
        setMonthlySales(null);
        setLoadingStates(prev => ({ ...prev, monthly: false }));
      });

      // Shipping Mode
      setLoadingStates(prev => ({ ...prev, shipping: true }));
      const shippingPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('shipping-mode')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setShippingMode(data && data.modes && data.counts ? data : null);
        setLoadingStates(prev => ({ ...prev, shipping: false }));
      }).catch(() => {
        setShippingMode(null);
        setLoadingStates(prev => ({ ...prev, shipping: false }));
      });

      // Region Sales
      setLoadingStates(prev => ({ ...prev, region: true }));
      const regionPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('region-sales')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setRegionSales(data && data.regions && data.sales ? data : null);
        setLoadingStates(prev => ({ ...prev, region: false }));
      }).catch(() => {
        setRegionSales(null);
        setLoadingStates(prev => ({ ...prev, region: false }));
      });

      // Top Products
      setLoadingStates(prev => ({ ...prev, products: true }));
      const productsPromise = Promise.race([
        apiCall(() => api.getSalesMetrics('top-products')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).then(data => {
        setTopProducts(data && data.products && data.sales ? data : null);
        setLoadingStates(prev => ({ ...prev, products: false }));
      }).catch(() => {
        setTopProducts(null);
        setLoadingStates(prev => ({ ...prev, products: false }));
      });

      // Wait for all promises to settle
      await Promise.allSettled([
        kpisPromise,
        cityPromise,
        categoryPromise,
        monthlyPromise,
        shippingPromise,
        regionPromise,
        productsPromise
      ]);

      // Fetch insights separately with timeout
      setLoadingStates(prev => ({ ...prev, insights: true }));
      try {
        const yearlyResponse = await Promise.race([
          apiCall(() => api.getHistoricalInsights('yearly')),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        const monthlyResponse = await Promise.race([
          apiCall(() => api.getHistoricalInsights('monthly')),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        const quarterlyResponse = await Promise.race([
          apiCall(() => api.getHistoricalInsights('quarterly')),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        
        const yearlyData = yearlyResponse || [];
        const monthlyData = monthlyResponse || [];
        const quarterlyData = quarterlyResponse || [];

        // Normalize data keys
        const normalizedYearlyData = yearlyData.map(item => {
          const yearKey = Object.keys(item).find(key => key.toLowerCase().includes('year')) || 'Year';
          return {
            Year: item[yearKey],
            Insight: item.Insight
          };
        });

        const normalizedMonthlyData = monthlyData.map(item => {
          const monthKey = Object.keys(item).find(key => key.toLowerCase().includes('month')) || 'Month';
          return {
            Month: item[monthKey],
            Insight: item.Insight
          };
        });

        const normalizedQuarterlyData = quarterlyData.map(item => {
          const quarterKey = Object.keys(item).find(key => key.toLowerCase().includes('quarter')) || 'Quarter';
          return {
            Quarter: item[quarterKey],
            Insight: item.Insight
          };
        });

        setYearlyInsights(normalizedYearlyData);
        setMonthlyInsights(normalizedMonthlyData);
        setQuarterlyInsights(normalizedQuarterlyData);
      } catch (insightsError) {
        console.error('Error fetching insights data:', insightsError);
        setYearlyInsights([]);
        setMonthlyInsights([]);
        setQuarterlyInsights([]);
      }
      setLoadingStates(prev => ({ ...prev, insights: false }));
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }

    setLoading(false);
    setDataLoaded(true);
  }, [dataLoaded]);

  const handleRefresh = useCallback(async () => {
    setDataLoaded(false); // Allow refetch
    await fetchSalesData();
  }, [fetchSalesData]);

  const handleExport = async () => {
    // Create CSV content for all sales data
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Metric,Value\n"
      + `Total Orders,${salesKPIs?.total_orders || 0}\n`
      + `Total Sales,${salesKPIs?.total_sales || 0}\n`
      + `Average Discount,${salesKPIs?.avg_discount || 0}\n`
      + `Late Deliveries,${salesKPIs?.late_deliveries || 0}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historical-sales-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);
  
  useEffect(() => {
    fetchSalesTrendData(salesTrendPeriod);
  }, [salesTrendPeriod, fetchSalesTrendData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="w-full p-4 bg-background space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Historical Sales</h2>
        <div className="flex items-center space-x-2">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesKPIs?.total_orders?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{salesKPIs?.total_sales?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesKPIs?.avg_discount?.toFixed(2) || "0"}%
            </div>
          </CardContent>
        </Card> */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Deliveries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesKPIs?.late_deliveries?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Trend - Full Width */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sales Trend by Product</CardTitle>
              <Select
                value={salesTrendPeriod}
                onValueChange={(value) => setSalesTrendPeriod(value as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {salesTrendLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading {salesTrendPeriod} trend...
                  </div>
                </div>
              ) : salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#666' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#666' }}
                      label={{ value: 'Order Quantity', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#666' } }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Blue Pump" 
                      stroke="#3b82f6" 
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
                      name="Blue Pump"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Green Pump" 
                      stroke="#22c55e" 
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#22c55e' }}
                      activeDot={{ r: 6 }}
                      name="Green Pump"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Orange Pump" 
                      stroke="#f97316" 
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#f97316' }}
                      activeDot={{ r: 6 }}
                      name="Orange Pump"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">No data available for {salesTrendPeriod} view</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Cities by Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Top Cities by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {citySales && citySales.cities && citySales.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={citySales.cities.map((city: string, index: number) => ({
                      city,
                      sales: citySales.sales[index]
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="city"
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#ddd' }}
                      tickLine={{ stroke: '#ddd' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#ddd' }}
                      tickLine={{ stroke: '#ddd' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                      labelFormatter={(label) => `City: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{
                        fill: '#8b5cf6',
                        strokeWidth: 2,
                        stroke: 'white',
                        r: 6
                      }}
                      activeDot={{
                        r: 8,
                        stroke: '#8b5cf6',
                        strokeWidth: 2,
                        fill: 'white'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading city data...
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryDistribution && categoryDistribution.categories && categoryDistribution.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution.categories.map((category: string, index: number) => ({
                        name: category,
                        value: categoryDistribution.sales[index]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.categories.map((entry: string, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {shippingMode && shippingMode.modes && shippingMode.counts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shippingMode.modes.map((mode: string, index: number) => ({
                    mode,
                    count: shippingMode.counts[index]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mode" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Regional Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Regional Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {regionSales && regionSales.regions && regionSales.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={regionSales.regions.map((region: string, index: number) => ({
                      region,
                      sales: regionSales.sales[index]
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="region"
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#ddd' }}
                      tickLine={{ stroke: '#ddd' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#ddd' }}
                      tickLine={{ stroke: '#ddd' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                      labelFormatter={(label) => `Region: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{
                        fill: '#3b82f6',
                        strokeWidth: 2,
                        stroke: 'white',
                        r: 6
                      }}
                      activeDot={{
                        r: 8,
                        stroke: '#3b82f6',
                        strokeWidth: 2,
                        fill: 'white'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading regional data...
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {topProducts && topProducts.products && topProducts.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts.products.map((product: string, index: number) => ({
                      product:
                        product.length > 20
                          ? product.substring(0, 20) + "..."
                          : product,
                      sales: topProducts.sales[index],
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales">
                      {topProducts.products.map((_: string, index: number) => {
                        const colors = ["#3b82f6", "#22c55e", "#f97316"]; // blue, green, orange
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[index % colors.length]} // loop colors
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Historical AI Insights - Moved to Last */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historical AI Insights</CardTitle>
            <div className="flex items-center gap-4">
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  setSelectedPeriod(value as 'yearly' | 'monthly' | 'quarterly');
                  // Reset filters when period changes
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedQuarter('all');
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly Insights</SelectItem>
                  <SelectItem value="monthly">Monthly Insights</SelectItem>
                  <SelectItem value="quarterly">Quarterly Insights</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filter dropdown based on selected period */}
              {selectedPeriod === 'yearly' && yearlyInsights.length > 0 && (
                <Select
                  value={selectedYear}
                  onValueChange={(value) => {
                    setSelectedYear(value);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {[...new Set(yearlyInsights.map(insight => insight.Year))].sort().map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedPeriod === 'monthly' && monthlyInsights.length > 0 && (
                <Select
                  value={selectedMonth}
                  onValueChange={(value) => {
                    setSelectedMonth(value);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {[...new Set(monthlyInsights.map(insight => insight.Month))].sort().map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 && (
                <Select
                  value={selectedQuarter}
                  onValueChange={(value) => {
                    setSelectedQuarter(value);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {[...new Set(quarterlyInsights.map(insight => insight.Quarter))].sort().map((quarter) => (
                      <SelectItem key={quarter} value={quarter}>
                        {quarter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : selectedPeriod === 'yearly' && yearlyInsights.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Yearly Insights</h3>
              {yearlyInsights
                .filter(insight => selectedYear === 'all' || insight.Year === selectedYear)
                .map((insight, index) => (
                <div key={`yearly-${index}`} className="prose max-w-none border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="text-md font-semibold mb-2">{insight.Year}</h4>
                  <div className="text-muted-foreground">
                    <MarkdownRenderer
                      content={insight.Insight || 'No insights available'}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedPeriod === 'monthly' && monthlyInsights.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Insights</h3>
              {monthlyInsights
                .filter(insight => selectedMonth === 'all' || insight.Month === selectedMonth)
                .map((insight, index) => (
                <div key={`monthly-${index}`} className="prose max-w-none border-l-4 border-green-500 pl-4 py-2">
                  <h4 className="text-md font-semibold mb-2">{insight.Month}</h4>
                  <div className="text-muted-foreground">
                    <MarkdownRenderer
                      content={insight.Insight || 'No insights available'}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Quarterly Insights</h3>
              {quarterlyInsights
                .filter(insight => selectedQuarter === 'all' || insight.Quarter === selectedQuarter)
                .map((insight, index) => (
                <div key={`quarterly-${index}`} className="prose max-w-none border-l-4 border-purple-500 pl-4 py-2">
                  <h4 className="text-md font-semibold mb-2">{insight.Quarter}</h4>
                  <div className="text-muted-foreground">
                    <MarkdownRenderer
                      content={insight.Insight || 'No insights available'}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="text-muted-foreground">No insights available</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalSales;
