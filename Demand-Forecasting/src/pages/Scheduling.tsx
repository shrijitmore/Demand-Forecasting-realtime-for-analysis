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
  const wsUrl = `ws://localhost:5000/ws/scheduling/date_range?start=2018-01-01&end=2018-01-31&interval=10`;
  
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
        
        // Update Gantt tasks with real-time data
        if (data.production_schedule && data.production_schedule.length > 0) {
          const newTasks = data.production_schedule.map((item, idx) => ({
            id: `realtime_${data.date}_${idx}`,
            name: `${item.Product_Name || 'Unknown Product'} - ${data.date}`,
            start: data.ts,
            end: new Date(new Date(data.ts).getTime() + 15 * 60000).toISOString(), // 15 minutes duration
            progress: 0,
            raw: {
              ...item,
              Date: data.date,
              Time: new Date(data.ts).toLocaleTimeString(),
              Scheduled_Date: data.date,
              Station: item.Station_Name || 'Unknown Station',
              Operator: item.Operator_Name || 'Unknown Operator',
              Product_Name: item.Product_Name || 'Unknown Product',
              Unit: data.total_qty_scheduled
            }
          }));
          
          setGanttTasks(prev => [...prev, ...newTasks].slice(-100)); // Keep last 100 tasks
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
  
  // Build day-wise Gantt chart data from real-time and CSV tasks
  const dayWiseGanttData = useMemo(() => {
    const allTasks = [...ganttTasks];
    console.log('Processing all tasks (including real-time):', allTasks);
    
    if (!allTasks.length) return { timeSlots: [], stationData: [], realtimeData: realtimeScheduleData };
    
    // Extract unique time slots and sort them
    const timeSlots = [...new Set(allTasks.map(task => task.raw?.Time))].filter(Boolean).sort();
    console.log('Time slots found:', timeSlots);
    
    // Get unique stations
    const stations = [...new Set(allTasks.map(task => task.raw?.Station))].filter(Boolean);
    console.log('Stations found:', stations);
    
    // Create station data with time slot activity
    const stationData = stations.map(station => {
      const stationTasks = allTasks.filter(task => task.raw?.Station === station);
      const timeActivity = timeSlots.map(time => {
        const taskAtTime = stationTasks.find(task => task.raw?.Time === time);
        return taskAtTime ? {
          active: true,
          operator: taskAtTime.raw?.Operator,
          product: taskAtTime.raw?.Product_Name,
          unit: taskAtTime.raw?.Unit,
          isRealtime: taskAtTime.id?.startsWith('realtime_')
        } : { active: false, isRealtime: false };
      });
      
      return {
        station,
        timeActivity
      };
    });
    
    console.log('Final dayWiseGanttData:', { timeSlots, stationData, realtimeCount: realtimeScheduleData.length });
    return { timeSlots, stationData, realtimeData: realtimeScheduleData };
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
    // Fetch Gantt tasks
    fetch('http://localhost:3000/api/schedule/gantt')
      .then(res => res.json())
      .then(data => {
        console.log('Gantt tasks received:', data);
        setGanttTasks(data);
      })
      .catch((error) => {
        console.error('Error fetching gantt tasks:', error);
        setGanttTasks([]);
      });
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="w-full p-4 bg-background space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Production Scheduling</h2>
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
            <CardTitle className="text-sm font-medium">Total Operators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.total_operators?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.absent_today?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Scheduled</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionKPIs?.total_units_scheduled?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
        <Card>
          <CardHeader>
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
                    <Bar dataKey="Total_Units" fill="#8884d8" />
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
        <Card>
          <CardHeader>
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
                    <Bar dataKey="Total_Units" fill="#82ca9d" />
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
        <Card>
          <CardHeader>
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
                      <Cell fill="#00C49F" />
                      <Cell fill="#FF8042" />
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
        <Card>
          <CardHeader>
            <CardTitle>AI Operator Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {operatorInsights.length > 0 ? (
                <div className="space-y-2">
                  {operatorInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm font-medium">{insight.operator_id}</p>
                      <div className="text-xs text-muted-foreground mt-1">
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

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Schedule Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Production Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            
            <div className="overflow-x-auto">
              {dayWiseGanttData.timeSlots.length > 0 ? (
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Station</th>
                      {dayWiseGanttData.timeSlots.map((time, idx) => (
                        <th key={idx} className="p-2 text-center">{time}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayWiseGanttData.stationData.map((station, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-medium">{station.station}</td>
                        {station.timeActivity.map((activity, timeIdx) => (
                          <td key={timeIdx} className="p-1">
                            {activity.active ? (
                              <div className="bg-blue-200 p-1 rounded text-xs">
                                <div className="font-medium">{activity.operator}</div>
                                <div className="text-gray-600">{activity.product}</div>
                                <div className="text-gray-500">Unit: {activity.unit}</div>
                              </div>
                            ) : (
                              <div className="h-8"></div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-muted-foreground">No schedule data available</div>
              )}
            </div>
            {/* Table for all tasks, including those not shown in Gantt */}
            <div className="mt-6">
              <h4 className="font-semibold mb-2">All Schedule Tasks</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2">Station</th>
                      <th className="p-2">Operator</th>
                      <th className="p-2">Product</th>
                      <th className="p-2">Scheduled Date</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ganttTasks.map((task, idx) => (
                      <tr key={task.id || idx} className="border-b">
                        <td className="p-2">{task.raw?.Station || '-'}</td>
                        <td className="p-2">{task.raw?.Operator || '-'}</td>
                        <td className="p-2">{task.raw?.Product_Name || '-'}</td>
                        <td className="p-2">{task.raw?.Scheduled_Date || '-'}</td>
                        <td className="p-2">{task.raw?.Time || '-'}</td>
                        <td className="p-2">
                          {task.start && task.end ? (
                            <span className="text-green-700">Shown in Gantt</span>
                          ) : (
                            <span className="text-red-700">Missing/Invalid Date or Time</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-48">
              <div style={{ height: '709%' }} className="overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sticky top-0 bg-background">Date</th>
                      <th className="text-left p-2 sticky top-0 bg-background">Operator ID</th>
                      <th className="text-left p-2 sticky top-0 bg-background">Operator Name</th>
                      <th className="text-left p-2 sticky top-0 bg-background">Present</th>
                      <th className="text-left p-2 sticky top-0 bg-background">Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/20">
                        <td className="p-2">{item.date}</td>
                        <td className="p-2">{item.operator_id}</td>
                        <td className="p-2">{item.operator_name}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.present === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.present}
                          </span>
                        </td>
                        <td className="p-2">{item.shift}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
