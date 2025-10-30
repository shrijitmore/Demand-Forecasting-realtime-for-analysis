import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, TrendingUp, AlertTriangle, Clock, Shield } from "lucide-react";

interface RiskData {
  Date: string;
  Headline: string;
  PESTEL_Category: string;
  Summary: string;
  Affected_Domains: string;
  Impact_Details: string;
  Recommended_Actions: string;
  Relevant?: boolean;
  Source?: string;
  Link?: string;
  Sentiment?: string;
  Severity?: string;
  Additional?: Record<string, any>;
}

const RiskAnalysis: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        setConnectionAttempts(prev => prev + 1);
        console.log(`WebSocket connection attempt ${connectionAttempts + 1} to ws://192.168.10.159:5000/risk-data`);
        
        ws = new WebSocket("ws://192.168.10.159:5000/risk-data");
        
        ws.onopen = () => {
          console.log("Risk Analysis WebSocket connected successfully");
          setIsConnected(true);
          setError(null);
          setConnectionAttempts(0);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            console.log("Risk data received:", raw);

            // Map incoming fields to UI schema
            const mapped: RiskData = {
              Date: raw.Date,
              Headline: raw.Short_Title || raw.Headline || raw.Title || "",
              PESTEL_Category: raw.PESTEL || raw.PESTEL_Category || "",
              Summary: raw.Summary || raw.Title || "",
              Affected_Domains: raw.Affected_Domains || raw.Domain || "",
              Impact_Details: raw.Impact_Details || raw["Impact Details"] || raw["Impact Analysis"] || raw.Impact || "",
              Recommended_Actions: raw.Recommended_Actions || raw["Recommended Actions"] || raw.Recommendations || raw.Actions || "",
              Relevant: typeof raw.Relevant === 'boolean' ? raw.Relevant : undefined,
              Source: raw.Source || raw.Source_Name || undefined,
              Link: raw.Link || raw.Url || raw.URL || undefined,
              Sentiment: raw.Sentiment || undefined,
              Severity: raw.Severity || undefined,
              Additional: undefined
            };

            // Capture remaining unknown fields
            const knownKeys = new Set([
              'Date','Short_Title','Headline','Title','PESTEL','PESTEL_Category','Summary','Affected_Domains','Domain','Impact_Details','Impact','Recommended_Actions','Actions','Relevant','Source','Source_Name','Link','Url','URL','Sentiment','Severity'
            ]);
            const additional: Record<string, any> = {};
            Object.keys(raw).forEach((k) => {
              if (!knownKeys.has(k)) additional[k] = raw[k];
            });
            if (Object.keys(additional).length > 0) mapped.Additional = additional;

            setRiskData(prev => {
              // Add new data to the beginning and keep only last 100 items for performance
              const newData = [mapped, ...prev].slice(0, 100);
              return newData;
            });
            setIsLoading(false);
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
            setError("Error parsing incoming data");
          }
        };

        ws.onclose = (event) => {
          console.log("Risk Analysis WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds if not too many attempts
          if (connectionAttempts < 10) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          } else {
            setError("Failed to connect after multiple attempts. Please refresh the page.");
            setIsLoading(false);
          }
        };

        ws.onerror = (err) => {
          console.error("Risk Analysis WebSocket error:", err);
          setError("WebSocket connection error - check if the risk data service is running");
          setIsConnected(false);
        };

      } catch (err) {
        console.error("Error creating WebSocket:", err);
        setError("Failed to initialize WebSocket connection");
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRiskData([]);
    setIsLoading(true);
    setError(null);
    setConnectionAttempts(0);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Political": "bg-blue-100 text-blue-800 border-blue-200",
      "Economic": "bg-green-100 text-green-800 border-green-200",
      "Social": "bg-purple-100 text-purple-800 border-purple-200",
      "Technological": "bg-orange-100 text-orange-800 border-orange-200",
      "Environmental": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Legal": "bg-red-100 text-red-800 border-red-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      "Political": <Shield className="h-4 w-4" />,
      "Economic": <TrendingUp className="h-4 w-4" />,
      "Social": <Clock className="h-4 w-4" />,
      "Technological": <AlertTriangle className="h-4 w-4" />,
      "Environmental": <Shield className="h-4 w-4" />,
      "Legal": <AlertTriangle className="h-4 w-4" />
    };
    return icons[category] || <AlertTriangle className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStats = () => {
    if (!riskData.length) return null;
    
    const categoryStats = riskData.reduce((acc, item) => {
      acc[item.PESTEL_Category] = (acc[item.PESTEL_Category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const domainStats = riskData.reduce((acc, item) => {
      acc[item.Affected_Domains] = (acc[item.Affected_Domains] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { categoryStats, domainStats };
  };

  const stats = getStats();

  return (
    <div className="w-full p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            Risk Analysis Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Real-time PESTEL risk monitoring and analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'Live Connection' : 'Disconnected'}
            </span>
            {riskData.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {riskData.length} alerts
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={!isConnected}
            className="bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Risk Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{riskData.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Categories Monitored</CardTitle>
              <Shield className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.categoryStats).length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Affected Domains</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.domainStats).length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Most Recent</CardTitle>
              <Clock className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {riskData.length > 0 ? formatDate(riskData[0].Date) : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Connection Error: {error}</span>
            </div>
            <div className="text-sm text-red-600 dark:text-red-300 mt-1">
              Ensure the risk data service at ws://192.168.10.159:5000/risk-data is running
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Connecting to risk analysis service...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Data List */}
      {!isLoading && riskData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Risk Events ({riskData.length})
          </h3>
          {riskData.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                        {item.Headline}
                      </h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          📅 {formatDate(item.Date)}
                        </span>
                        <Badge 
                          className={`${getCategoryColor(item.PESTEL_Category)} flex items-center gap-1`}
                        >
                          {getCategoryIcon(item.PESTEL_Category)}
                          {item.PESTEL_Category}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          🎯 {item.Affected_Domains}
                        </Badge>
                        {typeof item.Relevant === 'boolean' && (
                          <Badge variant="outline" className={`${item.Relevant ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-600'}`}>
                            {item.Relevant ? 'Relevant' : 'Not Relevant'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                      📝 Summary
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item.Summary}
                    </p>
                  </div>

                  {/* Impact Details */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                    <h4 className="font-semibold mb-2 text-orange-900 dark:text-orange-300 flex items-center gap-2">
                      ⚠️ Impact Analysis
                    </h4>
                    <p className="text-orange-800 dark:text-orange-200 leading-relaxed">
                      {item.Impact_Details && String(item.Impact_Details).trim().length > 0 ? item.Impact_Details : 'No impact details available'}
                    </p>
                  </div>

                  {/* Recommended Actions */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <h4 className="font-semibold mb-2 text-green-900 dark:text-green-300 flex items-center gap-2">
                      💡 Recommended Actions
                    </h4>
                    <p className="text-green-800 dark:text-green-200 leading-relaxed">
                      {item.Recommended_Actions && String(item.Recommended_Actions).trim().length > 0 ? item.Recommended_Actions : 'No recommended actions provided'}
                    </p>
                  </div>

                  {/* Optional meta */}
                  {(item.Source || item.Link || item.Sentiment || item.Severity) && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                      <div className="flex flex-wrap gap-3 text-sm">
                        {item.Source && <Badge variant="secondary">Source: {item.Source}</Badge>}
                        {item.Sentiment && <Badge variant="secondary">Sentiment: {item.Sentiment}</Badge>}
                        {item.Severity && <Badge variant="secondary">Severity: {item.Severity}</Badge>}
                        {item.Link && (
                          <a href={item.Link} target="_blank" rel="noreferrer" className="underline text-blue-600">
                            Open Link
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* More details */}
                  {item.Additional && Object.keys(item.Additional).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">More details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(item.Additional).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-32">{key}:</span>
                            <span className="text-gray-800 dark:text-gray-200 break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && riskData.length === 0 && !error && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {isConnected 
                ? "Connected and waiting for risk analysis data..." 
                : "Connect to risk analysis service to receive real-time updates"
              }
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Service: ws://192.168.10.159:5000/risk-data
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiskAnalysis;