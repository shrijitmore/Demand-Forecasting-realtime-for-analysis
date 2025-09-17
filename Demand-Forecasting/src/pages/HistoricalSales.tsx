import React, { useState, useEffect } from "react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, IndianRupee, ShoppingCart, Truck, AlertTriangle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, apiCall, SalesKPIs } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
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
  const [yearlyInsights, setYearlyInsights] = useState<any[]>([]);
  const [monthlyInsights, setMonthlyInsights] = useState<any[]>([]);
  const [quarterlyInsights, setQuarterlyInsights] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'yearly' | 'monthly' | 'quarterly'>('yearly');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchSalesData = async () => {
    setLoading(true);

    try {
      const [kpis, city, category, monthly, shipping, region, products] = await Promise.all([
        apiCall(() => api.getSalesKPIs()),
        apiCall(() => api.getSalesMetrics('city-sales')),
        apiCall(() => api.getSalesMetrics('category-distribution')),
        apiCall(() => api.getSalesMetrics('monthly-sales')),
        apiCall(() => api.getSalesMetrics('shipping-mode')),
        apiCall(() => api.getSalesMetrics('region-sales')),
        apiCall(() => api.getSalesMetrics('top-products'))
      ]);

      // Debug: Log the data being returned
      console.log('Sales data received:', {
        kpis,
        city,
        category,
        monthly,
        shipping,
        region,
        products
      });

      // Set data with null checks
      setSalesKPIs(kpis);
      setCitySales(city && city.cities && city.sales ? city : null);
      setCategoryDistribution(category && category.categories && category.sales ? category : null);
      setMonthlySales(monthly && monthly.months && monthly.sales ? monthly : null);
      setShippingMode(shipping && shipping.modes && shipping.counts ? shipping : null);
      setRegionSales(region && region.regions && region.sales ? region : null);
      setTopProducts(products && products.products && products.sales ? products : null);

      try {
        const [yearlyData, monthlyData, quarterlyData] = await Promise.all([
          api.getHistoricalInsights('yearly'),
          api.getHistoricalInsights('monthly'),
          api.getHistoricalInsights('quarterly')
        ]);

        // Normalize monthly data keys by removing BOM character if present
        const normalizedMonthlyData = monthlyData.map(item => {
          const monthKey = Object.keys(item).find(key => key.toLowerCase().includes('month')) || 'Month';
          return {
            Month: item[monthKey],
            GPT_Bullet_Insight: item.GPT_Bullet_Insight
          };
        });

        // Normalize quarterly data keys by removing BOM character if present
        const normalizedQuarterlyData = quarterlyData.map(item => {
          const quarterKey = Object.keys(item).find(key => key.toLowerCase().includes('quarter')) || 'Quarter';
          return {
            Quarter: item[quarterKey],
            GPT_Quarterly_Insight: item.GPT_Quarterly_Insight
          };
        });

        setYearlyInsights(yearlyData || []);
        setMonthlyInsights(normalizedMonthlyData || []);
        setQuarterlyInsights(normalizedQuarterlyData || []);
      } catch (insightsError) {
        console.error('Error fetching insights data:', insightsError);
        setYearlyInsights([]);
        setMonthlyInsights([]);
        setQuarterlyInsights([]);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    await fetchSalesData();
  };

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
  }, []);

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
        {/* SKU AI Supplier Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-purple-600" />
              SKU AI Supplier Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Period Selection</span>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'monthly' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Select Year</span>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPeriod === 'monthly' && selectedYear && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Select Month</span>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {selectedPeriod === 'yearly' && yearlyInsights.map((insight, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <MarkdownRenderer markdown={insight.GPT_Bullet_Insight || 'No insights available'} />
                  </div>
                ))}

                {selectedPeriod === 'monthly' && selectedYear && selectedMonth && (
                  monthlyInsights
                    .filter(insight => insight.Month === `${selectedMonth} ${selectedYear}`)
                    .map((insight, index) => (
                      <div key={index} className="p-4 bg-muted rounded-lg">
                        <MarkdownRenderer markdown={insight.GPT_Bullet_Insight || 'No insights available'} />
                      </div>
                    ))
                )}

                {selectedPeriod === 'quarterly' && quarterlyInsights.map((insight, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <MarkdownRenderer markdown={insight.GPT_Quarterly_Insight || 'No insights available'} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Monthly Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlySales && monthlySales.months && monthlySales.sales ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySales.months.map((month: string, index: number) => ({
                    month,
                    sales: monthlySales.sales[index]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Historical AI Insights */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Historical AI Insights</CardTitle>
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedPeriod}
                    onValueChange={(value) => {
                      setSelectedPeriod(value as 'yearly' | 'monthly' | 'quarterly');
                      setSelectedYear('');
                      setSelectedMonth('');
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
                        {yearlyInsights.map((insight, index) => (
                          <SelectItem key={`year-${index}-${insight.Year}`} value={insight.Year}>
                            {insight.Year}
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
                        {monthlyInsights.map((insight, index) => (
                          <SelectItem key={`month-${index}-${insight.Month}`} value={insight.Month}>
                            {insight.Month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 && (
                    <Select
                      value={selectedMonth}
                      onValueChange={(value) => {
                        setSelectedMonth(value);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        {quarterlyInsights.map((insight, index) => (
                          <SelectItem key={`quarter-${index}-${insight.Quarter.replace(/^\uFEFF/, '')}`} value={insight.Quarter.replace(/^\uFEFF/, '')}>
                            {insight.Quarter}
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
                <div className="space-y-4">
                  {selectedYear ? (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-3">Year: {selectedYear}</h3>
                      <div className="text-muted-foreground">
                        <MarkdownRenderer
                          content={yearlyInsights.find((i) => i.Year === selectedYear)?.GPT_Yearly_Insight || 'No insights available'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      Please select a year to view insights
                    </div>
                  )}
                </div>
              ) : selectedPeriod === 'monthly' && monthlyInsights.length > 0 ? (
                <div className="space-y-4">
                  {selectedMonth ? (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-3">Month: {selectedMonth}</h3>
                      <div className="text-muted-foreground">
                        <MarkdownRenderer
                          content={monthlyInsights.find((i) => i.Month === selectedMonth)?.GPT_Bullet_Insight || 'No insights available'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      Please select a month to view insights
                    </div>
                  )}
                </div>
              ) : selectedPeriod === 'quarterly' && quarterlyInsights.length > 0 ? (
                <div className="space-y-4">
                  {selectedMonth ? (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-3">Quarter: {selectedMonth}</h3>
                      <div className="text-muted-foreground">
                        <MarkdownRenderer
                          content={quarterlyInsights.find((i) => i.Quarter === selectedMonth)?.GPT_Quarterly_Insight || 'No insights available'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      Please select a quarter to view insights
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-muted-foreground">No insights available</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
};

export default HistoricalSales;
