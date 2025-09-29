import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Users, Calendar, Package, Clock, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { api, apiCall, ProductionKPIs } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { MarkdownRenderer } from "@/utils/markdownToHtml.tsx";
import { useWebSocket, WebSocketReadyState } from "@/hooks/useWebSocket";

interface WebSocketScheduleData {
  date: string;
  forecasted_demand: {
    blue_pump: number;
    green_pump: number;
    orange_pump: number;
  };
  production_orders: any[];
  production_schedule: any[];
  total_qty_scheduled: number;
  station_schedule_shift_a: any[];
  station_schedule_shift_b: any[];
  ts: string;
}


const Scheduling = () => {
  const [productionKPIs, setProductionKPIs] = useState<ProductionKPIs | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleChart, setScheduleChart] = useState<any[]>([]);
  const [operatorWorkload, setOperatorWorkload] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [operatorInsights, setOperatorInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ganttTasks, setGanttTasks] = useState<any[]>([]);
  const [realtimeScheduleData, setRealtimeScheduleData] = useState<WebSocketScheduleData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  // WebSocket connection for real-time scheduling data
  const wsUrl = `ws://192.168.10.165:5000/ws/scheduling/date_range?start=2018-01-01&end=2018-01-31&interval=4`;
  
  const { readyState, lastMessage } = useWebSocket({
    url: wsUrl,
    onMessage: (data: WebSocketScheduleData) => {
      console.log('WebSocket message received:', data);
      if (data && data.date) {
        setRealtimeScheduleData(prev => {
          // Keep only last 50 entries to prevent memory issues
          const updated = [...prev, data].slice(-50);
          return updated;
        });
        
        // Process station schedules for Gantt chart
        const processShift = (shiftData: any[], shiftName: string) => {
          if (!shiftData || shiftData.length === 0) {
            return [];
          }
          return shiftData.map((item, idx) => {
            const startTime = new Date(item.Event_Datetime);
            // Assuming a fixed 15-minute duration for each task as end time is not provided.
            const endTime = new Date(startTime.getTime() + 15 * 60000);

            const taskId = `task_${item.PO_Number || data.date}_${item.Station}_${item.Time}_${shiftName}_${idx}`;

            return {
              id: taskId,
              name: item.Product_Name || 'Unknown',
              start: startTime.toISOString(),
              end: endTime.toISOString(),
              progress: 0,
              raw: {
                ...item,
                Date: data.date,
                Time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                Scheduled_Date: item.Scheduled_Date,
                Station: item.Station,
                Operator: item.Operator,
                Product_Name: item.Product_Name,
                Unit: item.Unit,
                Shift: item.Shift,
              }
            };
          });
        };

        const shiftA_tasks = processShift(data.station_schedule_shift_a, 'A');
        const shiftB_tasks = processShift(data.station_schedule_shift_b, 'B');
        const newTasks = [...shiftA_tasks, ...shiftB_tasks];

        if (newTasks.length > 0) {
          // Update Gantt tasks, ensuring no duplicates by task ID
          setGanttTasks(prev => {
            const existingIds = new Set(prev.map(task => task.id));
            const uniqueNewTasks = newTasks.filter(task => !existingIds.has(task.id));
            // Keep a reasonable number of tasks to avoid performance issues
            return [...prev, ...uniqueNewTasks].slice(-500);
          });
        }
      }
    },
    onOpen: () => {
      setConnectionStatus('Connected');
      console.log('WebSocket connected for scheduling data');
    },
    onClose: () => {
      setConnectionStatus('Disconnected');
      console.log('WebSocket disconnected');
    },
    onError: (error) => {
      setConnectionStatus('Connection Error');
      console.error('WebSocket connection error:', error);
    },
    autoReconnect: true,
    reconnectInterval: 5000
  });

  // Update connection status based on WebSocket ready state
  useEffect(() => {
    switch (readyState) {
      case WebSocketReadyState.CONNECTING:
        setConnectionStatus('Connecting...');
        break;
      case WebSocketReadyState.OPEN:
        setConnectionStatus('Connected');
        break;
      case WebSocketReadyState.CLOSING:
        setConnectionStatus('Disconnecting...');
        break;
      case WebSocketReadyState.CLOSED:
        setConnectionStatus('Disconnected');
        break;
      default:
        setConnectionStatus('Unknown');
    }
  }, [readyState]);
  
  // Build day-wise Gantt chart data from the processed tasks
  const dayWiseGanttData = useMemo(() => {
    const allTasks = [...ganttTasks];
    if (!allTasks.length) return { timeSlots: [], stationData: [], realtimeData: realtimeScheduleData };

    // Define time slots from 8 AM to 8 PM (20:00)
    const timeSlots = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

    const stations = [...new Set(allTasks.map(task => task.raw?.Station))].filter(Boolean).sort();

    const stationData = stations.map(station => {
      const stationTasks = allTasks.filter(task => task.raw?.Station === station);
      return {
        station,
        tasks: stationTasks,
      };
    });

    return {
      timeSlots,
      stationData,
      realtimeData: realtimeScheduleData
    };
  }, [ganttTasks, realtimeScheduleData]);

  const fetchSchedulingData = async () => {
    setLoading(true);
    
    try {
      const [kpis, scheduleData, chartData, workload, attendanceData, leavesData, insights] = await Promise.allSettled([
        apiCall(() => api.getProductionKPIs()),
        apiCall(() => api.getSchedule()),
        apiCall(() => api.getScheduleChart()),
        apiCall(() => api.getOperatorWorkload()),
        apiCall(() => api.getAttendance()),
        apiCall(() => api.getLeaves()),
        apiCall(() => api.getOperatorInsights())
      ]);

      setProductionKPIs(kpis.status === 'fulfilled' ? kpis.value : null);
      setSchedule(scheduleData.status === 'fulfilled' ? (scheduleData.value || []) : []);
      setScheduleChart(chartData.status === 'fulfilled' ? (chartData.value || []) : []);
      setOperatorWorkload(workload.status === 'fulfilled' ? (workload.value || []) : []);
      setAttendance(attendanceData.status === 'fulfilled' ? (attendanceData.value || []) : []);
      setLeaves(leavesData.status === 'fulfilled' ? (leavesData.value || []) : []);
      setOperatorInsights(insights.status === 'fulfilled' ? (insights.value?.insights || []) : []);
      
      // Debug logging
      console.log('Scheduling Data Loaded:', {
        kpis: kpis.status === 'fulfilled' ? kpis.value : null,
        scheduleData: scheduleData.status === 'fulfilled' ? scheduleData.value?.length : 0,
        chartData: chartData.status === 'fulfilled' ? chartData.value?.length : 0,
        workload: workload.status === 'fulfilled' ? workload.value?.length : 0,
        attendanceData: attendanceData.status === 'fulfilled' ? attendanceData.value?.length : 0,
        leavesData: leavesData.status === 'fulfilled' ? leavesData.value?.length : 0,
        insights: insights.status === 'fulfilled' ? insights.value?.insights?.length : 0,
      });
      
      // Log sample data for debugging
      if (chartData.status === 'fulfilled' && chartData.value && chartData.value.length > 0) {
        console.log('Sample chart data:', chartData.value[0]);
      }
      if (workload.status === 'fulfilled' && workload.value && workload.value.length > 0) {
        console.log('Sample workload data:', workload.value[0]);
      }
      if (scheduleData.status === 'fulfilled' && scheduleData.value && scheduleData.value.length > 0) {
        console.log('Sample schedule data:', scheduleData.value[0]);
      }
    } catch (error) {
      console.error('Error fetching scheduling data:', error);
    }
    
    setLoading(false);
  };

  const handleRefresh = async () => {
    await fetchSchedulingData();
  };

  const handleExport = async () => {
    // Create CSV content for scheduling data
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Operators,${productionKPIs?.total_operators || 0}\n`
      + `Absent Today,${productionKPIs?.absent_today || 0}\n`
      + `Total Units Scheduled,${productionKPIs?.total_units_scheduled || 0}\n`
      + `Unique Products,${productionKPIs?.unique_products || 0}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scheduling-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSchedulingData();
    // Initial static Gantt data fetch (for legacy CSV data if available)
    fetch('')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Gantt API not available');
      })
      .then(data => {
        console.log('Static Gantt tasks received:', data);
        setGanttTasks(data);
      })
      .catch((error) => {
        console.log('Static Gantt API not available (expected with Python backend):', error);
        setGanttTasks([]);
      });
  }, []);

  const getTaskCardColor = (productName: string) => {
    if (productName.includes('Blue Pump')) {
      return 'bg-blue-100 border-blue-500';
    }
    if (productName.includes('Green Pump')) {
      return 'bg-green-100 border-green-500';
    }
    if (productName.includes('Orange Pump')) {
      return 'bg-orange-100 border-orange-500';
    }
    return 'bg-gray-100 border-gray-500';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div className="w-full p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Production Scheduling</h2>
        <div className="flex items-center space-x-2">
          {/* WebSocket Connection Status */}
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border">
            {connectionStatus === 'Connected' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {connectionStatus}
            </span>
            {realtimeScheduleData.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {realtimeScheduleData.length} updates
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleExport}
            className="bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Operators</CardTitle>
            <Users className="h-4 w-4 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.total_operators?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-100">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.absent_today?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Units Scheduled</CardTitle>
            <Package className="h-4 w-4 text-green-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.total_units_scheduled?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Unique Products</CardTitle>
            <Calendar className="h-4 w-4 text-purple-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.unique_products?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Station Workload */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <CardTitle>Station Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {scheduleChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scheduleChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="station" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Total_Units">
                      {scheduleChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No station workload data available (${scheduleChart.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operator Workload */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
            <CardTitle>Operator Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {operatorWorkload.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operatorWorkload.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operator" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Total_Units">
                      {operatorWorkload.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No operator workload data available (${operatorWorkload.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {attendance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: attendance.filter(a => a.present === 'Yes').length },
                        { name: 'Absent', value: attendance.filter(a => a.present === 'No').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No attendance data available (${attendance.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operator Insights */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <CardTitle>AI Operator Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {operatorInsights.length > 0 ? (
                <div className="space-y-2">
                  {operatorInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-400">
                      <p className="text-sm font-medium text-orange-800">{insight.operator_id}</p>
                      <div className="text-xs text-gray-700 mt-1">
                        <MarkdownRenderer 
                          content={insight.ai_insight || 'No insight available'} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    {loading ? "Loading..." : `No operator insights available (${operatorInsights.length} items)`}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Schedule Gantt Chart */}
      <div className="col-span-2">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle>Production Schedule</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-300 border border-green-500 mr-1"></div>
                  <span className="mr-3">Live</span>
                </div>
                {realtimeScheduleData.length > 0 && (
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                    Updates: {realtimeScheduleData.length}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px] bg-white dark:bg-gray-900">
              {dayWiseGanttData.stationData.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Header */}
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800 font-semibold text-sm">
                    <div className="w-40 sticky left-0 pl-4 py-2 bg-gray-50 dark:bg-gray-800">Station</div>
                    <div className="flex-1 pl-4 py-2">Scheduled Tasks</div>
                  </div>

                  {/* Station Rows */}
                  {dayWiseGanttData.stationData.map((station, sIdx) => (
                    <div key={sIdx} className="flex items-center">
                      <div className="w-40 sticky left-0 pl-4 py-2 text-sm font-medium bg-white dark:bg-gray-900 self-stretch flex items-center border-r">{station.station}</div>
                      <div className="flex-1 overflow-x-auto py-2">
                        <div className="flex space-x-2 px-2">
                          {station.tasks.map((task, taskIdx) => (
                            <div
                              key={task.id}
                              className={`group w-48 flex-shrink-0 rounded-lg p-2 shadow-md border-l-4 relative ${getTaskCardColor(task.name)}`}
                            >
                              <div className="font-semibold truncate text-sm">{task.name}</div>
                              <div className="text-gray-800 text-xs truncate">{task.raw.PO_Number || 'No PO'}</div>
                              <div className="text-gray-600 text-xs truncate">{task.raw.Operator}</div>
                              <div className="mt-2 text-right font-bold text-lg">{task.raw.Unit} <span className="font-normal text-xs">units</span></div>
                              <div className="text-gray-500 text-xs text-left absolute bottom-2">{new Date(task.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-12">
                  {connectionStatus === 'Connected' 
                    ? 'Waiting for production schedule data...' 
                    : 'No schedule data available - check WebSocket connection'}
                </div>
              )}
            </div>
            
            {/* Real-time Data Summary */}
            {realtimeScheduleData.length > 0 && (
              <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50 text-sm">
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Latest Production Update</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {realtimeScheduleData.slice(-3).map((data, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{data.date}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(data.ts).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Scheduled</div>
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {data.total_qty_scheduled?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center">
                          <div className="text-gray-500 dark:text-gray-400">Blue Pumps</div>
                          <div className="font-medium">{data.forecasted_demand?.blue_pump || 0}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-center">
                          <div className="text-gray-500 dark:text-gray-400">Green Pumps</div>
                          <div className="font-medium">{data.forecasted_demand?.green_pump || 0}</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-center">
                          <div className="text-gray-500 dark:text-gray-400">Orange Pumps</div>
                          <div className="font-medium">{data.forecasted_demand?.orange_pump || 0}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>All Schedule Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Station</th>
                    <th className="p-2 text-left">Operator</th>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Scheduled Date</th>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ganttTasks.length > 0 ? ganttTasks.map((task, idx) => (
                    <tr key={task.id || idx} className={`border-b hover:bg-muted/20 ${task.id?.startsWith('realtime_') ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <td className="p-2">
                        {task.id?.startsWith('realtime_') ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">LIVE</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">STATIC</span>
                        )}
                      </td>
                      <td className="p-2">{task.raw?.Station || '-'}</td>
                      <td className="p-2">{task.raw?.Operator || '-'}</td>
                      <td className="p-2">{task.raw?.Product_Name || '-'}</td>
                      <td className="p-2">{task.raw?.Scheduled_Date || '-'}</td>
                      <td className="p-2">{task.raw?.Time || '-'}</td>
                      <td className="p-2">
                        {task.start && task.end ? (
                          <span className="text-green-700 dark:text-green-400">Scheduled</span>
                        ) : (
                          <span className="text-red-700 dark:text-red-400">Missing Time</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {loading 
                          ? "Loading schedule tasks..." 
                          : connectionStatus === 'Connected' 
                            ? "Waiting for schedule data from WebSocket..." 
                            : "No schedule tasks available - check WebSocket connection"
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>


        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Operator ID</th>
                    <th className="text-left p-2">Operator Name</th>
                    <th className="text-left p-2">Present</th>
                    <th className="text-left p-2">Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length > 0 ? attendance.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/20">
                      <td className="p-2">{item.date}</td>
                      <td className="p-2">{item.operator_id}</td>
                      <td className="p-2">{item.operator_name || 'N/A'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.present === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.present}
                        </span>
                      </td>
                      <td className="p-2">{item.shift}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {loading ? "Loading attendance data..." : "No attendance data available"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests */}
      {leaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">From Date</th>
                    <th className="text-left p-2">To Date</th>
                    <th className="text-left p-2">Operator ID</th>
                    <th className="text-left p-2">Reason</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.slice(0, 10).map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/20">
                      <td className="p-2">{item.from_date}</td>
                      <td className="p-2">{item.to_date}</td>
                      <td className="p-2">{item.operator_id || '-'}</td>
                      <td className="p-2">{item.reason}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                          item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Scheduling;
