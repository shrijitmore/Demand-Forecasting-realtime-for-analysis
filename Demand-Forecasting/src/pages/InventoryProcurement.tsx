import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Package, AlertTriangle, Clock, Truck, TrendingUp } from "lucide-react";
import { api, apiCall, InventoryKPIs } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const InventoryProcurement = () => {
  const [inventoryKPIs, setInventoryKPIs] = useState<InventoryKPIs | null>(null);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reorderChart, setReorderChart] = useState<any[]>([]);
  const [leadTimes, setLeadTimes] = useState<any[]>([]);
  const [procurementInsights, setProcurementInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    
    try {
      const [stock, alert, reorder, lead, supplier, productionOrders, procurement] = await Promise.allSettled([
        apiCall(() => api.getInventoryData('stock_levels')),
        apiCall(() => api.getInventoryData('alerts')),
        apiCall(() => api.getReorderChart()),
        apiCall(() => api.getLeadTimes()),
        apiCall(() => api.getSupplierAlerts()),
        apiCall(() => api.getInventoryData('production_orders')),
        apiCall(() => api.getProcurementInsights())
      ]);

      const stockRows = stock.status === 'fulfilled' ? (stock.value || []) : [];
      const alertRows = alert.status === 'fulfilled' ? (alert.value || []) : [];
      setStockLevels(stockRows);
      setAlerts(alertRows);

      // Compute KPIs locally from stock and alerts
      const uniqueSKU = new Set<string>();
      let totalSOH = 0;
      let totalTransit = 0;
      let leadSum = 0;
      let leadCount = 0;
      stockRows.forEach((row: any) => {
        const sku = row.SKU_No || row.SKU_ID || row.sku || row.SKU;
        if (sku) uniqueSKU.add(String(sku));
        totalSOH += parseFloat(row.Stock_On_Hand || row.Available || 0) || 0;
        totalTransit += parseFloat(row.In_Transit || 0) || 0;
        const lead = parseFloat(row.Lead_Time_Days || 0);
        if (!isNaN(lead)) {
          leadSum += lead;
          leadCount += 1;
        }
      });
      // Below reorder count: prefer alerts dataset if present
      let belowReorder = 0;
      if (alertRows.length > 0) {
        alertRows.forEach((row: any) => {
          // Use Available_Stock and Required_Qty if provided by backend alerts API
          const availStock = row.Available_Stock;
          const requiredQty = row.Required_Qty;
          if (availStock != null && requiredQty != null) {
            if (Number(availStock) < Number(requiredQty)) belowReorder += 1;
          } else {
            const avail = parseFloat(row.Available || 0) || 0;
            const rp = parseFloat(row.Reorder_Point || 0) || 0;
            if (rp && avail < rp) belowReorder += 1;
          }
        });
      } else {
        stockRows.forEach((row: any) => {
          const avail = parseFloat(row.Available || row.Stock_On_Hand || 0) || 0;
          const rp = parseFloat(row.Reorder_Point || 0) || 0;
          if (rp && avail < rp) belowReorder += 1;
        });
      }
      let scheduledQty = 0;
      if (productionOrders.status === 'fulfilled' && Array.isArray(productionOrders.value)) {
        scheduledQty = productionOrders.value.reduce((sum: number, row: any) => {
          const qty = parseFloat(row.Scheduled_Qty || row.Quantity || row.Qty || 0);
          return sum + (isNaN(qty) ? 0 : qty);
        }, 0);
      }

      const computedKPIs: InventoryKPIs = {
        total_skus: uniqueSKU.size,
        total_stock_on_hand: Math.round(totalSOH),
        in_transit: Math.round(totalTransit),
        below_reorder_point: belowReorder,
        avg_lead_time: leadCount ? +(leadSum / leadCount).toFixed(1) : 0,
        scheduled_qty: Math.round(scheduledQty),
      };
      setInventoryKPIs(computedKPIs);
      
      // Handle reorder chart data with fallback
      let reorderData = reorder.status === 'fulfilled' ? (reorder.value || []) : [];
      if (reorderData.length === 0 && alert.status === 'fulfilled' && alert.value) {
        // Fallback: generate reorder chart from alerts data
        reorderData = alert.value.map((item: any, index: number) => ({
          SKU_No: item.SKU_No || item['SKU_No'] || `SKU${index + 1}`,
          Available: parseInt(item.Available_Stock ?? item.Available ?? 0),
          Reorder_Point: parseInt(item.Reorder_Point ?? item.Required_Qty ?? 0),
        }));
      }
      // Filter out items with undefined SKU_No
      reorderData = reorderData.filter(item => item.SKU_No && item.SKU_No !== 'undefined');
      setReorderChart(reorderData);
      
      // Handle lead times data with fallback
      let leadData = lead.status === 'fulfilled' ? (lead.value || []) : [];
      if (leadData.length === 0 && stock.status === 'fulfilled' && stock.value) {
        // Fallback: generate lead times from stock levels data
        leadData = stock.value.map((item: any, index: number) => ({
          SKU_No: item.SKU_No || item['SKU_No'] || `SKU${index + 1}`,
          Lead_Time_Days: parseFloat(item.Lead_Time_Days || 0)
        }));
      }
      // Filter out items with undefined SKU_No
      leadData = leadData.filter(item => item.SKU_No && item.SKU_No !== 'undefined');
      setLeadTimes(leadData);
      
      setProcurementInsights(procurement.status === 'fulfilled' ? (procurement.value || []) : []);
      
      // Debug logging
      console.log('Inventory Data Loaded:', {
        kpis: computedKPIs,
        stockLevels: stockRows.length,
        alerts: alertRows.length,
        reorderChart: reorderData.length,
        leadTimes: leadData.length,
        supplierAlerts: supplier.status === 'fulfilled' ? supplier.value?.length : 0,
        procurementInsights: procurement.status === 'fulfilled' ? procurement.value?.length : 0,
      });
      
      // Log sample data for debugging
      if (reorderData.length > 0) {
        console.log('Sample reorder data:', reorderData[0]);
      }
      if (leadData.length > 0) {
        console.log('Sample lead time data:', leadData[0]);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
    
    setLoading(false);
  };

  const handleRefresh = async () => {
    await fetchInventoryData();
  };

  const handleExport = async () => {
    // Create CSV content for inventory data
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total SKUs,${inventoryKPIs?.total_skus || 0}\n`
      + `Total Stock On Hand,${inventoryKPIs?.total_stock_on_hand || 0}\n`
      + `In Transit,${inventoryKPIs?.in_transit || 0}\n`
      + `Below Reorder Point,${inventoryKPIs?.below_reorder_point || 0}\n`
      + `Average Lead Time,${inventoryKPIs?.avg_lead_time || 0}\n`
      + `Scheduled Quantity,${inventoryKPIs?.scheduled_qty || 0}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory-procurement-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="w-full p-4 bg-background space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Inventory & Procurement</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.total_skus?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock On Hand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.total_stock_on_hand?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.in_transit?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Below Reorder</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.below_reorder_point?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.avg_lead_time?.toFixed(1) || "0"} days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Qty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryKPIs?.scheduled_qty?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reorder Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reorder Point vs Available Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-x-auto">
              {reorderChart.length > 0 ? (
                <ResponsiveContainer width={reorderChart.length * 50} height="100%">
                  <BarChart data={reorderChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="SKU_No" tick={{ fontSize: 10 }} tickCount={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Available" fill="#8884d8" barSize={20} />
                    <Bar dataKey="Reorder_Point" fill="#82ca9d" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No reorder data available (${reorderChart.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Times */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Times by SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-x-auto">
              {leadTimes.length > 0 ? (
                <ResponsiveContainer width={leadTimes.length * 50} height="100%">
                  <BarChart data={leadTimes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="SKU_No" tick={{ fontSize: 10 }} tickCount={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Lead_Time_Days" fill="#ffc658" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No lead time data available (${leadTimes.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procurement Insights */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Procurement Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {procurementInsights.length > 0 ? (
                <div className="space-y-2">
                  {procurementInsights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm font-medium">{insight.SKU_ID} - {insight.SKU_Name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {insight.Procurement_Insight || insight.insight || insight.recommendation || 'No insight available'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : "No procurement insights available"}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Levels Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Levels (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">SKU</th>
                    <th className="text-left p-2">Stock On Hand</th>
                    <th className="text-left p-2">In Transit</th>
                    <th className="text-left p-2">Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/20">
                      <td className="p-2">{item.SKU_No}</td>
                      <td className="p-2">{parseInt(item.Stock_On_Hand || 0).toLocaleString()}</td>
                      <td className="p-2">{parseInt(item.In_Transit || 0).toLocaleString()}</td>
                      <td className="p-2">{parseFloat(item.Lead_Time_Days || 0).toFixed(1)} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">SKU</th>
                    <th className="text-left p-2">Available Stock</th>
                    <th className="text-left p-2">Required Qty</th>
                    <th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Product ID</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/20">
                      <td className="p-2">{item.SKU_No}</td>
                      <td className="p-2">{parseInt(item.Available_Stock ?? item.Available ?? 0).toLocaleString()}</td>
                      <td className="p-2">{parseInt(item.Required_Qty ?? item.Reorder_Point ?? 0).toLocaleString()}</td>
                      <td className="p-2">{item.Action || '-'}</td>
                      <td className="p-2">{item.Date ? new Date(item.Date).toLocaleDateString() : '-'}</td>
                      <td className="p-2">{item.Product_ID || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryProcurement;
