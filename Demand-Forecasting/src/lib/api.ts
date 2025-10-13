const API_BASE_URL = "http://192.168.10.157:5000";

// Types for API responses
export interface ForecastData {
  PRODUCT_CARD_ID: string;
  PRODUCT_NAME: string;
  Date: string;
  Forecasted_Demand: number;
}

export interface SalesKPIs {
  total_orders: number;
  total_sales: number;
  avg_discount: number;
  late_deliveries: number;
}

export interface InventoryKPIs {
  total_skus: number;
  total_stock_on_hand: number;
  in_transit: number;
  below_reorder_point: number;
  avg_lead_time: number;
  scheduled_qty: number;
}

export interface ProductionKPIs {
  total_operators: number;
  absent_today: number;
  total_units_scheduled: number;
  unique_products: number;
}

export interface SupplierData {
  supplier: string;
  lead_time_days: number;
  fulfillment_rate_percent: number;
  otd_percent: number;
  late_deliveries: number;
  total_orders: number;
}

// API utility functions
export const api = {
  // ─── FORECAST APIs ────────────────────────────────────────
  
  // Get forecast data by frequency (daily, weekly, monthly)
  getForecasts: async (frequency: string = 'daily') => {
    const response = await fetch(`${API_BASE_URL}/api/forecast/${frequency}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get forecast data by product
  getForecastByProduct: async (productId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/forecast/product/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Legacy compatibility functions for existing UI
  getForecastsWeekly: async (productCardId?: string, productName?: string) => {
    return api.getForecasts('weekly');
  },

  getForecastsMonthly: async (productCardId?: string, productName?: string) => {
    return api.getForecasts('monthly');
  },

  getForecastsQuarterly: async (productCardId?: string, productName?: string) => {
    return api.getForecasts('daily'); // Use daily as fallback since quarterly may not exist
  },

  // Get unique products for dropdowns (mock implementation for now)
  getProducts: async () => {
    // Since Python backend doesn't have this endpoint, we'll return mock data
    // In a real scenario, you'd want to add this endpoint to the Python backend
    return [
      { PRODUCT_CARD_ID: 'BP001', PRODUCT_NAME: 'Blue Pump' },
      { PRODUCT_CARD_ID: 'GP001', PRODUCT_NAME: 'Green Pump' },
      { PRODUCT_CARD_ID: 'OP001', PRODUCT_NAME: 'Orange Pump' }
    ];
  },

  // Get forecast AI insights by period
  getForecastInsights: async (period: 'monthly' | 'quarterly' | 'yearly') => {
    const response = await fetch(`${API_BASE_URL}/api/forecast/insights/${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get AI insights (legacy compatibility)
  getInsights: async (month?: string, productCardId?: string, productName?: string) => {
    return api.getForecastInsights('monthly');
  },

  // ─── SALES APIs ───────────────────────────────────────────

  // Get sales KPIs
  getSalesKPIs: async (): Promise<SalesKPIs> => {
    const response = await fetch(`${API_BASE_URL}/api/sales/kpis`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get sales metrics by type
  getSalesMetrics: async (metric: string) => {
    const response = await fetch(`${API_BASE_URL}/api/sales/${metric}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // ─── INVENTORY APIs ───────────────────────────────────────

  // Get inventory KPIs
  getInventoryKPIs: async (): Promise<InventoryKPIs> => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/kpis`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get inventory data by dataset
  getInventoryData: async (dataset: string) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/${dataset}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get reorder chart data
  getReorderChart: async () => {
    try {
      // Primary endpoint as per backend: /api/inventory/reorder
      const response = await fetch(`${API_BASE_URL}/api/inventory/reorder`);
      if (!response.ok) {
        console.warn('Reorder endpoint not available, using alerts data');
        const alertsResponse = await fetch(`${API_BASE_URL}/api/inventory/alerts`);
        const alertsData = await alertsResponse.json();
        return alertsData.map((item: any) => ({
          SKU_No: item.SKU_No,
          Available: parseInt(item.Available || 0),
          Reorder_Point: parseInt(item.Reorder_Point || 0)
        }));
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching reorder chart:', error);
      return [];
    }
  },

  // Get lead times
  getLeadTimes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/lead_times`);
      if (!response.ok) {
        console.warn('Lead times endpoint not available, using stock levels data');
        const stockResponse = await fetch(`${API_BASE_URL}/api/inventory/stock_levels`);
        const stockData = await stockResponse.json();
        return stockData.map((item: any) => ({
          SKU_No: item.SKU_No,
          Lead_Time_Days: parseFloat(item.Lead_Time_Days || 0)
        }));
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching lead times:', error);
      return [];
    }
  },

  // Get supplier alerts
  getSupplierAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/suppliers`);
      if (!response.ok) {
        console.warn('Supplier alerts endpoint not available, using alerts data');
        const alertsResponse = await fetch(`${API_BASE_URL}/api/inventory/alerts`);
        const alertsData = await alertsResponse.json();
        const filtered = alertsData.filter((item: any) => 
          parseInt(item.Available || 0) < parseInt(item.Reorder_Point || 0)
        );
        const supplierCounts: any = {};
        filtered.forEach((item: any) => {
          const supplier = item.Supplier;
          supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
        });
        return Object.entries(supplierCounts).map(([supplier, count]) => ({
          Supplier: supplier,
          Alert_Count: count
        }));
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching supplier alerts:', error);
      return [];
    }
  },

  // ─── PROCUREMENT APIs ─────────────────────────────────────

  // Get all procurement insights
  getProcurementInsights: async () => {
    const response = await fetch(`${API_BASE_URL}/api/procurement/insights`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get procurement insight by SKU
  getProcurementInsightBySKU: async (skuId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/procurement/insight/${skuId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // ─── SCHEDULING & OPERATOR APIs ───────────────────────────

  // Get operators
  getOperators: async () => {
    const response = await fetch(`${API_BASE_URL}/api/operators`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get operator insights
  getOperatorInsights: async () => {
    const response = await fetch(`${API_BASE_URL}/api/operators/insights`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get attendance for a specific month
  getAttendance: async (month: string = 'january') => {
    const response = await fetch(`${API_BASE_URL}/api/operators/attendance/${month}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get leave requests for a specific month
  getLeaves: async (month: string = 'january') => {
    const response = await fetch(`${API_BASE_URL}/api/operators/leaves/${month}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Mock functions for legacy compatibility (these would need to be implemented in Python backend)
  getProductionKPIs: async (): Promise<ProductionKPIs> => {
    // Mock data - in real scenario add this endpoint to Python backend
    return {
      total_operators: 50,
      absent_today: 5,
      total_units_scheduled: 1000,
      unique_products: 3
    };
  },

  getSchedule: async () => {
    // This would be implemented using the WebSocket data or a dedicated endpoint
    return [];
  },

  getScheduleChart: async () => {
    // Mock data for station chart
    return [];
  },

  getOperatorWorkload: async () => {
    return [];
  },

  getAttendanceTable: async () => {
    return api.getAttendance('january');
  },

  getInsightsByOperator: async (operatorId: string) => {
    const insights = await api.getOperatorInsights();
    return insights.filter((insight: any) => insight.operator_id === operatorId);
  },

  getOperatorsDropdown: async () => {
    const operators = await api.getOperators();
    return operators.map((op: any) => op.operator_id);
  },

  // ─── SUPPLIER PERFORMANCE APIs ───────────────────────────

  // Get all suppliers
  getSuppliers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/suppliers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get supplier by SKU
  getSupplierBySKU: async (skuNo: string) => {
    const response = await fetch(`${API_BASE_URL}/api/suppliers/${skuNo}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);  
    }
    return response.json();
  },

  // Get supplier AI insights by SKU
  getSupplierAIInsights: async (skuNo: string) => {
    const response = await fetch(`${API_BASE_URL}/api/suppliers/insights/${skuNo}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get alternate suppliers by SKU
  getAlternateSuppliersBySKU: async (skuNo: string) => {
    const response = await fetch(`${API_BASE_URL}/api/suppliers/alternate/${skuNo}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Helper: find supplier row by Supplier_Name (case-insensitive)
  getSupplierData: async (_endpoint: string, supplier: string) => {
    const response = await fetch(`${API_BASE_URL}/api/suppliers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const suppliers = await response.json();
    return suppliers.find((s: any) => (s.Supplier_Name || s.supplier_name || '').toLowerCase() === supplier.toLowerCase());
  },

  getSupplierKPIs: async (supplier: string): Promise<SupplierData> => {
    const row = await api.getSupplierData('kpis', supplier);
    if (!row) {
      return {
        supplier,
        lead_time_days: 0,
        fulfillment_rate_percent: 0,
        otd_percent: 0,
        late_deliveries: 0,
        total_orders: 0,
      };
    }
    const num = (v: any) => {
      const n = parseFloat(v ?? '');
      return isNaN(n) ? 0 : n;
    };
    return {
      supplier: row.Supplier_Name || row.supplier_name || supplier,
      lead_time_days: num(row.Lead_Time_Days || row.lead_time_days),
      fulfillment_rate_percent: num(row.Fulfillment_Rate || row.fulfillment_rate_percent),
      otd_percent: num(row.OTD_Percentage || row.OTD || row.otd_percent),
      late_deliveries: Math.round(num(row.Late_Deliveries || row.late_deliveries)),
      total_orders: Math.round(num(row.Total_Orders || row.total_orders)),
    };
  },

  getSupplierMetrics: async (supplier: string) => {
    const row = await api.getSupplierData('metrics', supplier);
    const num = (v: any) => {
      const n = parseFloat(v ?? '');
      return isNaN(n) ? 0 : n;
    };
    return {
      'OTD %': num(row?.OTD_Percentage || row?.OTD || row?.otd_percent),
      'Quality Score': num(row?.Quality_Score || row?.quality_score),
      'Fulfillment %': num(row?.Fulfillment_Rate || row?.fulfillment_rate_percent),
    };
  },

  getSupplierDeliveryStats: async (supplier: string) => {
    const row = await api.getSupplierData('delivery-stats', supplier);
    const num = (v: any) => {
      const n = parseFloat(v ?? '');
      return isNaN(n) ? 0 : n;
    };
    const totalOrders = Math.round(num(row?.Total_Orders || row?.total_orders));
    let late = Math.round(num(row?.Late_Deliveries || row?.late_deliveries));
    if (!late && totalOrders && (row?.OTD_Percentage || row?.OTD || row?.otd_percent)) {
      const otd = num(row?.OTD_Percentage || row?.OTD || row?.otd_percent) / 100;
      late = Math.max(0, Math.round(totalOrders * (1 - otd)));
    }
    const on_time = Math.max(0, totalOrders - late);
    return { on_time, late };
  },

  getSuppliersList: async () => {
    const suppliers = await api.getSuppliers();
    return suppliers.map((s: any) => s.Supplier_Name).filter(Boolean);
  },

  // Get unique list of SKU_No from suppliers
  getSupplierSKUsList: async () => {
    const suppliers = await api.getSuppliers();
    const set = new Set<string>();
    suppliers.forEach((s: any) => {
      const sku = s.SKU_No || s.SKU_ID || s.SKU || s.sku_id;
      if (sku) set.add(String(sku));
    });
    return Array.from(set);
  },

  getAlternateSuppliers: async () => {
    const suppliers = await api.getSuppliers();
    // This would need proper implementation based on Python backend structure
    return suppliers;
  },

  getSupplierInsight: async (supplier: string) => {
    try {
      const suppliers = await api.getSuppliers();
      const supplierData = suppliers.find((s: any) => s.Supplier_Name?.toLowerCase() === supplier.toLowerCase());
      if (supplierData && supplierData.SKU_No) {
        return await api.getSupplierAIInsights(supplierData.SKU_No);
      }
      return null;
    } catch (error) {
      console.error('Error fetching supplier insight:', error);
      return null;
    }
  },

  // ─── HISTORICAL INSIGHTS APIs ─────────────────────────────

  // Get insights by period
  getHistoricalInsights: async (period: 'monthly' | 'quarterly' | 'yearly') => {
    const response = await fetch(`${API_BASE_URL}/api/forecast/insights/${period}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // ─── HEALTH CHECK ─────────────────────────────────────────

  // Health check
  healthCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

// Error handling wrapper
export const apiCall = async <T>(
  apiFunction: () => Promise<T>,
): Promise<T | null> => {
  try {
    return await apiFunction();
  } catch (error) {
    console.error("API call failed:", error);
    return null;
  }
};

// Debug function to test API endpoints
export const debugAPI = async () => {
  const endpoints = [
    '/api/forecasts',
    '/api/sales/kpis',
    '/api/inventory/kpis',
    '/api/kpis',
    '/api/suppliers/list',
    '/'
  ];

  console.log('Testing API endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      console.log(`${endpoint}: ${response.ok ? '✅ OK' : '❌ Failed'} (${response.status})`);
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Error details: ${errorText}`);
      }
    } catch (error) {
      console.log(`${endpoint}: ❌ Error - ${error}`);
    }
  }
};

// Test API connection on load
export const testAPIConnection = async () => {
  console.log('Testing API connection...');
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful:', data);
      return true;
    } else {
      console.log('❌ API connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API connection error:', error);
    return false;
  }
};
