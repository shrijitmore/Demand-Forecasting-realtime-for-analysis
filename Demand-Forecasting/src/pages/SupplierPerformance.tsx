import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Truck, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiCall, SupplierData } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";

const SupplierPerformance = () => {
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [supplierKPIs, setSupplierKPIs] = useState<SupplierData | null>(null);
  const [supplierMetrics, setSupplierMetrics] = useState<any>(null);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [alternateSuppliers, setAlternateSuppliers] = useState<any[]>([]);
  const [supplierInsights, setSupplierInsights] = useState<any[]>([]);
  const [availableSkus, setAvailableSkus] = useState<string[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchSuppliers = async () => {
    const data = await apiCall(() => api.getSuppliersList());
    if (data) {
      setSuppliers(data);
      if (data.length > 0 && !selectedSupplier) {
        setSelectedSupplier(data[0]);
      }
    }
  };

  const fetchAvailableSkus = async () => {
    try {
      console.log('Fetching available SKUs...');
      const response = await fetch('http://localhost:3000/api/supplier-insights/skus');
      console.log('SKU response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('SKU error response:', errorData);
        setAvailableSkus([]);
        return;
      }
      
      const skus = await response.json();
      console.log('Available SKUs:', skus);
      setAvailableSkus(skus);
      if (skus.length > 0 && !selectedSku) {
        setSelectedSku(skus[0]);
      }
    } catch (error) {
      console.error('Error fetching available SKUs:', error);
      setAvailableSkus([]);
    }
  };

  const fetchInsightForSku = async (sku: string) => {
    if (!sku) return;
    
    try {
      console.log('Fetching insight for SKU:', sku);
      const response = await fetch(`http://localhost:3000/api/suppliers/insight/${sku}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setSupplierInsights([]);
        return;
      }
      
      const insight = await response.json();
      console.log('Insight received:', insight);
      setSupplierInsights([insight]);
    } catch (error) {
      console.error('Error fetching insight for SKU:', error);
      setSupplierInsights([]);
    }
  };

  const fetchSupplierData = async () => {
    if (!selectedSupplier) return;
    
    setLoading(true);
    
    try {
      const [kpis, metrics, stats] = await Promise.allSettled([
        apiCall(() => api.getSupplierKPIs(selectedSupplier)),
        apiCall(() => api.getSupplierMetrics(selectedSupplier)),
        apiCall(() => api.getSupplierDeliveryStats(selectedSupplier))
      ]);

      setSupplierKPIs(kpis.status === 'fulfilled' ? kpis.value : null);
      setSupplierMetrics(metrics.status === 'fulfilled' ? metrics.value : null);
      setDeliveryStats(stats.status === 'fulfilled' ? stats.value : null);
    } catch (error) {
      console.error('Error fetching supplier data:', error);
    }
    
    // Fetch alternate suppliers from backend CSV endpoint
    try {
      const response = await fetch('http://localhost:3000/api/alternate-suppliers');
      if (!response.ok) throw new Error('Failed to fetch alternate suppliers');
      const alternateData = await response.json();
      // Map backend CSV fields to camelCase for frontend use
      const mapped = alternateData.map((item: any) => ({
        supplier_name: item.Supplier_Name,
        sku_id: item.SKU_ID,
        otd_percentage: parseFloat(item.OTD_Percentage || 0),
        quality_score: parseFloat(item.Quality_Score || 0),
        email: item.Email,
        location: item.Location,
        avg_lead_time_days: parseFloat(item.Avg_Lead_Time_Days || 0),
        fulfillment_rate: parseFloat(item.Fulfillment_Rate || 0)
      }));
      setAlternateSuppliers(mapped);
    } catch (error) {
      console.error('Error fetching alternate suppliers:', error);
      setAlternateSuppliers([]);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    await fetchSupplierData();
  };

  const handleSkuChange = async (sku: string) => {
    setSelectedSku(sku);
    await fetchInsightForSku(sku);
  };

  const handleExport = async () => {
    if (!supplierKPIs) return;
    
    // Create CSV content for supplier data
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Supplier,${supplierKPIs.supplier}\n`
      + `Lead Time (Days),${supplierKPIs.lead_time_days}\n`
      + `Fulfillment Rate (%),${supplierKPIs.fulfillment_rate_percent}\n`
      + `OTD (%),${supplierKPIs.otd_percent}\n`
      + `Late Deliveries,${supplierKPIs.late_deliveries}\n`
      + `Total Orders,${supplierKPIs.total_orders}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `supplier-performance-${selectedSupplier}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSuppliers();
    fetchAvailableSkus();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierData();
    }
  }, [selectedSupplier]);

  useEffect(() => {
    if (selectedSku) {
      fetchInsightForSku(selectedSku);
    }
  }, [selectedSku]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="w-full p-4 bg-background space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Supplier Performance</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[200px]">
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
          <Select value={selectedSku} onValueChange={handleSkuChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select SKU" />
            </SelectTrigger>
            <SelectContent>
              {availableSkus.map((sku) => (
                <SelectItem key={sku} value={sku}>
                  {sku}
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierKPIs?.lead_time_days?.toFixed(1) || "0"} days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierKPIs?.fulfillment_rate_percent?.toFixed(1) || "0"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierKPIs?.otd_percent?.toFixed(1) || "0"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Deliveries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierKPIs?.late_deliveries?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierKPIs?.total_orders?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierMetrics?.["Quality Score"]?.toFixed(1) || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {supplierMetrics ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { metric: 'OTD %', value: supplierMetrics["OTD %"] },
                    { metric: 'Quality Score', value: supplierMetrics["Quality Score"] },
                    { metric: 'Fulfillment %', value: supplierMetrics["Fulfillment %"] }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
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

        {/* Delivery Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {deliveryStats ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'On Time', value: deliveryStats.on_time },
                        { name: 'Late', value: deliveryStats.late }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FF8042" />
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

        {/* Alternate Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Alternate Suppliers ({alternateSuppliers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {alternateSuppliers.length > 0 ? (
                <div className="space-y-2">
                  {alternateSuppliers.slice(0, 8).map((supplier, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg border border-border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                                                     <p className="text-sm font-medium text-foreground">
                             {supplier.supplier_name}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                             SKU: {supplier.sku_id}
                           </p>
                           <div className="grid grid-cols-2 gap-2 mt-2">
                             <div>
                               <p className="text-xs text-muted-foreground">OTD</p>
                               <p className="text-xs font-medium">
                                 {supplier.otd_percentage}%
                               </p>
                             </div>
                             <div>
                               <p className="text-xs text-muted-foreground">Quality</p>
                               <p className="text-xs font-medium">
                                 {supplier.quality_score}
                               </p>
                             </div>
                             <div>
                               <p className="text-xs text-muted-foreground">Lead Time</p>
                               <p className="text-xs font-medium">
                                 {supplier.avg_lead_time_days} days
                               </p>
                             </div>
                             <div>
                               <p className="text-xs text-muted-foreground">Fulfillment</p>
                               <p className="text-xs font-medium">
                                 {supplier.fulfillment_rate}%
                               </p>
                             </div>
                           </div>
                           <p className="text-xs text-muted-foreground mt-2">
                             📍 {supplier.location} | 📧 {supplier.email}
                           </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {alternateSuppliers.length > 8 && (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      +{alternateSuppliers.length - 8} more suppliers
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">No alternate suppliers available</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>AI Supplier Insights - {selectedSku}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {supplierInsights.length > 0 ? (
                <div className="space-y-2">
                  {supplierInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm font-medium text-foreground">SKU: {insight.sku_id}</p>
                      {insight.supplier_name && (
                        <p className="text-xs text-muted-foreground">Supplier: {insight.supplier_name}</p>
                      )}
                      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        <MarkdownRenderer 
                          content={insight.insight || 'No insight available'} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {selectedSku ? `No AI insights available for ${selectedSku}` : 'Select a SKU to view insights'}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {supplierKPIs && [
                  { metric: 'Lead Time', value: `${supplierKPIs.lead_time_days} days`, status: supplierKPIs.lead_time_days <= 7 ? 'Good' : 'Needs Attention' },
                  { metric: 'Fulfillment Rate', value: `${supplierKPIs.fulfillment_rate_percent}%`, status: supplierKPIs.fulfillment_rate_percent >= 95 ? 'Good' : 'Needs Attention' },
                  { metric: 'On-Time Delivery', value: `${supplierKPIs.otd_percent}%`, status: supplierKPIs.otd_percent >= 90 ? 'Good' : 'Needs Attention' },
                  { metric: 'Late Deliveries', value: supplierKPIs.late_deliveries.toString(), status: supplierKPIs.late_deliveries <= 5 ? 'Good' : 'Needs Attention' },
                  { metric: 'Total Orders', value: supplierKPIs.total_orders.toString(), status: 'Info' }
                ].map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/20">
                    <td className="p-2">{row.metric}</td>
                    <td className="p-2">{row.value}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.status === 'Good' ? 'bg-green-100 text-green-800' : 
                        row.status === 'Needs Attention' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
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

export default SupplierPerformance;
