import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, IndianRupee, ShoppingCart, Truck, AlertTriangle, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, apiCall, SalesKPIs } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";

const HistoricalSales = () => {
  // KPIs State
  const [salesKPIs, setSalesKPIs] = useState<SalesKPIs | null>(null);
  
  // Chart Data States
  const [citySales, setCitySales] = useState<any>(null);
  const [categoryDistribution, setCategoryDistribution] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState<{ months: string[], sales: number[] } | null>(null);
  const [shippingMode, setShippingMode] = useState<any>(null);
  const [regionSales, setRegionSales] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  
  // Insights State
  const [yearlyInsights, setYearlyInsights] = useState<any[]>([]);
  const [monthlyInsights, setMonthlyInsights] = useState<any[]>([]);
  const [quarterlyInsights, setQuarterlyInsights] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'yearly' | 'monthly' | 'quarterly'>('yearly');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  
  // Sales Trend State
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [salesTrendData, setSalesTrendData] = useState<any[]>([]);
  const [salesTrendLoading, setSalesTrendLoading] = useState(false);
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
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

  // Fetch sales trend data from the historical actual quantity endpoints
  const fetchSalesTrendData = useCallback(async (period: string) => {
    setSalesTrendLoading(true);
    console.log(`📊 Fetching historical ${period} data...`);
    
    try {
      const response = await fetch(`http://192.168.10.159:5000/api/${period}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Received ${data.length} records for ${period}`, data.slice(0, 2));
      
      // Transform data for chart - group by date and product
      const groupedData: { [key: string]: { [product: string]: number } } = {};
      
      data.forEach((item: any) => {
        const date = item.Date || item.date;
        const product = item.Product || item.product;
        const quantity = parseFloat(item.Order_Quantity || item.Quantity || 0);
        
        if (date && product) {
          if (!groupedData[date]) {
            groupedData[date] = {};
          }
          groupedData[date][product] = (groupedData[date][product] || 0) + quantity;
        }
      });
      
      // Sort dates and create chart data
      const chartData = Object.keys(groupedData)
        .sort()
        .map(date => ({
          date,
          ...groupedData[date]
        }));
      
      console.log(`📈 Chart data ready with ${chartData.length} points`);
      setSalesTrendData(chartData);
    } catch (error) {
      console.error('❌ Error fetching sales trend data:', error);
      setSalesTrendData([]);
    } finally {
      setSalesTrendLoading(false);
    }
  }, []);

  // Fetch all sales data
  const fetchSalesData = useCallback(async () => {
    if (dataLoaded) return;
    
    setLoading(true);
    console.log('🔄 Starting to fetch all sales data...');

    // Fetch KPIs
    setLoadingStates(prev => ({ ...prev, kpis: true }));
    try {
      console.log('📡 Fetching KPIs from: http://192.168.10.159:5000/api/sales/kpis');
      const response = await fetch('http://192.168.10.159:5000/api/sales/kpis');
      console.log('📡 KPIs response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const kpisData = await response.json();
      console.log('✅ KPIs data received:', kpisData);
      setSalesKPIs(kpisData);
    } catch (error) {
      console.error('❌ KPIs failed:', error);
      setSalesKPIs(null);
    }
    setLoadingStates(prev => ({ ...prev, kpis: false }));

      // Fetch City Sales
      setLoadingStates(prev => ({ ...prev, city: true }));
      try {
        console.log('📡 Fetching City Sales...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/city-sales');
        console.log('📡 City Sales response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cityData = await response.json();
        console.log('✅ City sales loaded:', cityData);
        setCitySales(cityData && cityData.cities && cityData.sales ? cityData : null);
      } catch (error) {
        console.error('❌ City sales failed:', error);
        setCitySales(null);
      }
      setLoadingStates(prev => ({ ...prev, city: false }));

      // Fetch Category Distribution
      setLoadingStates(prev => ({ ...prev, category: true }));
      try {
        console.log('📡 Fetching Category Distribution...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/category-distribution');
        console.log('📡 Category response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const categoryData = await response.json();
        console.log('✅ Category distribution loaded:', categoryData);
        setCategoryDistribution(categoryData && categoryData.categories && categoryData.sales ? categoryData : null);
      } catch (error) {
        console.error('❌ Category distribution failed:', error);
        setCategoryDistribution(null);
      }
      setLoadingStates(prev => ({ ...prev, category: false }));

      // Fetch Monthly Sales
      setLoadingStates(prev => ({ ...prev, monthly: true }));
      try {
        console.log('📡 Fetching Monthly Sales...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/monthly-sales');
        console.log('📡 Monthly Sales response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const monthlyData = await response.json();
        console.log('✅ Monthly sales loaded:', monthlyData);
        setMonthlySales(monthlyData && monthlyData.months && monthlyData.sales ? monthlyData : null);
      } catch (error) {
        console.error('❌ Monthly sales failed:', error);
        setMonthlySales(null);
      }
      setLoadingStates(prev => ({ ...prev, monthly: false }));

      // Fetch Shipping Mode
      setLoadingStates(prev => ({ ...prev, shipping: true }));
      try {
        console.log('📡 Fetching Shipping Mode...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/shipping-mode');
        console.log('📡 Shipping Mode response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const shippingData = await response.json();
        console.log('✅ Shipping mode loaded:', shippingData);
        setShippingMode(shippingData && shippingData.modes && shippingData.counts ? shippingData : null);
      } catch (error) {
        console.error('❌ Shipping mode failed:', error);
        setShippingMode(null);
      }
      setLoadingStates(prev => ({ ...prev, shipping: false }));

      // Fetch Region Sales
      setLoadingStates(prev => ({ ...prev, region: true }));
      try {
        console.log('📡 Fetching Region Sales...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/region-sales');
        console.log('📡 Region Sales response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const regionData = await response.json();
        console.log('✅ Region sales loaded:', regionData);
        setRegionSales(regionData && regionData.regions && regionData.sales ? regionData : null);
      } catch (error) {
        console.error('❌ Region sales failed:', error);
        setRegionSales(null);
      }
      setLoadingStates(prev => ({ ...prev, region: false }));

      // Fetch Top Products
      setLoadingStates(prev => ({ ...prev, products: true }));
      try {
        console.log('📡 Fetching Top Products...');
        const response = await fetch('http://192.168.10.159:5000/api/sales/top-products');
        console.log('📡 Top Products response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const productsData = await response.json();
        console.log('✅ Top products loaded:', productsData);
        setTopProducts(productsData && productsData.products && productsData.sales ? productsData : null);
      } catch (error) {
        console.error('❌ Top products failed:', error);
        setTopProducts(null);
      }
      setLoadingStates(prev => ({ ...prev, products: false }));

      // Fetch Insights
      setLoadingStates(prev => ({ ...prev, insights: true }));
      try {
        console.log('📡 Fetching Insights...');
        
        const yearlyResponse = await fetch('http://192.168.10.159:5000/api/insights/yearly').catch(() => null);
        const monthlyResponse = await fetch('http://192.168.10.159:5000/api/insights/monthly').catch(() => null);
        const quarterlyResponse = await fetch('http://192.168.10.159:5000/api/insights/quarterly').catch(() => null);
        
        const yearlyData = yearlyResponse && yearlyResponse.ok ? await yearlyResponse.json() : [];
        const monthlyData = monthlyResponse && monthlyResponse.ok ? await monthlyResponse.json() : [];
        const quarterlyData = quarterlyResponse && quarterlyResponse.ok ? await quarterlyResponse.json() : [];

        console.log('✅ Insights loaded - Yearly:', yearlyData.length, 'Monthly:', monthlyData.length, 'Quarterly:', quarterlyData.length);
        
        setYearlyInsights(yearlyData || []);
        setMonthlyInsights(monthlyData || []);
        setQuarterlyInsights(quarterlyData || []);
      } catch (error) {
        console.error('❌ Insights failed:', error);
        setYearlyInsights([]);
        setMonthlyInsights([]);
        setQuarterlyInsights([]);
      }
      setLoadingStates(prev => ({ ...prev, insights: false }));

    } catch (error) {
      console.error('❌ Error in fetchSalesData:', error);
    }

    setLoading(false);
    setDataLoaded(true);
    console.log('✅ All data loading complete');
  }, [dataLoaded]);

  const handleRefresh = useCallback(async () => {
    setDataLoaded(false);
    await fetchSalesData();
  }, [fetchSalesData]);

  const handleExport = () => {
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

  // Load initial data
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);
  
  // Load sales trend when period changes
  useEffect(() => {
    fetchSalesTrendData(salesTrendPeriod);
  }, [salesTrendPeriod, fetchSalesTrendData]);

  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'];

  // Get unique product names from sales trend data
  const productNames = useMemo(() => {
    if (salesTrendData.length === 0) return [];
    return Object.keys(salesTrendData[0]).filter(key => key !== 'date');
  }, [salesTrendData]);

  return (
    <div className="w-full min-h-screen p-4 lg:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Historical Sales Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Comprehensive sales performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🧪 Manual API Test');
              console.log('KPIs:', salesKPIs);
              console.log('City Sales:', citySales);
              console.log('Category:', categoryDistribution);
              console.log('Shipping:', shippingMode);
              console.log('Region:', regionSales);
              console.log('Products:', topProducts);
            }}
            className="shadow-sm text-xs"
          >
            Debug
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport} className="shadow-sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {loadingStates.kpis ? (
                <span className="animate-pulse">...</span>
              ) : (
                salesKPIs?.total_orders?.toLocaleString() || "0"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total order count</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <IndianRupee className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {loadingStates.kpis ? (
                <span className="animate-pulse">...</span>
              ) : (
                `₹${salesKPIs?.total_sales?.toLocaleString() || "0"}`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue generated</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <Truck className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {loadingStates.kpis ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${salesKPIs?.avg_discount?.toFixed(2) || "0"}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average discount rate</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Deliveries</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {loadingStates.kpis ? (
                <span className="animate-pulse">...</span>
              ) : (
                salesKPIs?.late_deliveries?.toLocaleString() || "0"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Delayed shipments</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart - Full Width */}
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Sales Trend by Product</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Historical actual quantity data</p>
            </div>
            <Select
              value={salesTrendPeriod}
              onValueChange={(value) => setSalesTrendPeriod(value as any)}
            >
              <SelectTrigger className="w-[160px] shadow-sm">
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
          <div className="h-[400px] w-full">
            {salesTrendLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading {salesTrendPeriod} trend...</span>
                </div>
              </div>
            ) : salesTrendData.length > 0 ? (
              <div className="h-full w-full overflow-x-auto">
                <div style={{ minWidth: `${Math.max(800, salesTrendData.length * 30)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={salesTrendData.length > 50 ? Math.floor(salesTrendData.length / 30) : 0}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        label={{ value: 'Order Quantity', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#64748b' } }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      {productNames.map((productName, index) => (
                        <Line 
                          key={productName}
                          type="monotone" 
                          dataKey={productName}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2.5}
                          dot={salesTrendData.length <= 50 ? { r: 4, fill: COLORS[index % COLORS.length] } : false}
                          activeDot={{ r: 6 }}
                          name={productName}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">No data available for {salesTrendPeriod} view</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* City Sales */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Top Cities by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loadingStates.city ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : citySales && citySales.cities && citySales.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={citySales.cities.map((city: string, index: number) => ({
                      city,
                      sales: citySales.sales[index]
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="city"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                    />
                    <Bar dataKey="sales" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No city data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loadingStates.category ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : categoryDistribution && categoryDistribution.categories && categoryDistribution.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution.categories.map((category: string, index: number) => ({
                        name: category,
                        value: categoryDistribution.sales[index]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
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
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Regional Sales */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Regional Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loadingStates.region ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : regionSales && regionSales.regions && regionSales.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionSales.regions.map((region: string, index: number) => ({
                      region,
                      sales: regionSales.sales[index]
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="region"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                    />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No regional data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Mode */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Shipping Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loadingStates.shipping ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : shippingMode && shippingMode.modes && shippingMode.counts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shippingMode.modes.map((mode: string, index: number) => ({
                        name: mode,
                        value: shippingMode.counts[index]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {shippingMode.modes.map((entry: string, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No shipping data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Top Products by Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loadingStates.products ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : topProducts && topProducts.products && topProducts.sales ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.products.map((product: string, index: number) => ({
                    product: product.length > 30 ? product.substring(0, 30) + "..." : product,
                    sales: topProducts.sales[index],
                  }))}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                  />
                  <Bar dataKey="sales" radius={[0, 8, 8, 0]}>
                    {topProducts.products.map((_: string, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No product data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historical AI Insights */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Historical AI Insights</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  setSelectedPeriod(value as any);
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedQuarter('all');
                }}
              >
                <SelectTrigger className="w-[180px] shadow-sm">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly Insights</SelectItem>
                  <SelectItem value="monthly">Monthly Insights</SelectItem>
                  <SelectItem value="quarterly">Quarterly Insights</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'yearly' && yearlyInsights.length > 0 && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[150px] shadow-sm">
                    <SelectValue placeholder="Filter Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {[...new Set(yearlyInsights.map((i: any) => i.Year || i.year))].sort().map((year) => (
                      <SelectItem key={String(year)} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedPeriod === 'monthly' && monthlyInsights.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[150px] shadow-sm">
                    <SelectValue placeholder="Filter Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {[...new Set(monthlyInsights.map((i: any) => i.Month || i.month))].sort().map((month) => (
                      <SelectItem key={String(month)} value={String(month)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 && (
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="w-[150px] shadow-sm">
                    <SelectValue placeholder="Filter Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {[...new Set(quarterlyInsights.map((i: any) => i.Quarter || i.quarter))].sort().map((quarter) => (
                      <SelectItem key={String(quarter)} value={String(quarter)}>{quarter}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStates.insights ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPeriod === 'yearly' && yearlyInsights.length > 0 ? (
            <div className="space-y-4">
              {yearlyInsights
                .filter((insight: any) => selectedYear === 'all' || (insight.Year || insight.year) == selectedYear)
                .map((insight: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
                  <h4 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">{insight.Year || insight.year}</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none">
                    <MarkdownRenderer content={insight.Insight || insight.insight || 'No insights available'} />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedPeriod === 'monthly' && monthlyInsights.length > 0 ? (
            <div className="space-y-4">
              {monthlyInsights
                .filter((insight: any) => selectedMonth === 'all' || (insight.Month || insight.month) == selectedMonth)
                .map((insight: any, index: number) => (
                <div key={index} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-r-lg">
                  <h4 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-300">{insight.Month || insight.month}</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none">
                    <MarkdownRenderer content={insight.Insight || insight.insight || 'No insights available'} />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 ? (
            <div className="space-y-4">
              {quarterlyInsights
                .filter((insight: any) => selectedQuarter === 'all' || (insight.Quarter || insight.quarter) == selectedQuarter)
                .map((insight: any, index: number) => (
                <div key={index} className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-r-lg">
                  <h4 className="text-lg font-semibold mb-2 text-purple-700 dark:text-purple-300">{insight.Quarter || insight.quarter}</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none">
                    <MarkdownRenderer content={insight.Insight || insight.insight || 'No insights available'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No insights available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalSales;
