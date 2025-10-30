import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

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

const ListAnalysis: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket("ws://192.168.10.159:5000/risk-data");
        
        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            console.log("Risk data received:", raw);

            // Normalize payload to component interface
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
              // Add new data to the beginning and keep only last 50 items
              const newData = [mapped, ...prev].slice(0, 50);
              return newData;
            });
            setIsLoading(false);
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
            setError("Error parsing data");
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
          setError("WebSocket connection error");
          setIsConnected(false);
        };

      } catch (err) {
        console.error("Error creating WebSocket:", err);
        setError("Failed to connect to WebSocket");
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
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Political": "bg-blue-100 text-blue-800",
      "Economic": "bg-green-100 text-green-800",
      "Social": "bg-purple-100 text-purple-800",
      "Technological": "bg-orange-100 text-orange-800",
      "Environmental": "bg-emerald-100 text-emerald-800",
      "Legal": "bg-red-100 text-red-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Risk Analysis
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={!isConnected}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected to WebSocket' : 'Disconnected'}
            </span>
            <span>Total Items: {riskData.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-700 font-medium">Error: {error}</div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">Connecting to WebSocket and loading data...</div>
          </CardContent>
        </Card>
      )}

      {/* Risk Data List */}
      {!isLoading && riskData.length > 0 && (
        <div className="space-y-4">
          {riskData.map((item, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{item.Headline}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(item.Date)}</span>
                        <Badge className={getCategoryColor(item.PESTEL_Category)}>
                          {item.PESTEL_Category}
                        </Badge>
                        <Badge variant="outline">
                          {item.Affected_Domains}
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
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-muted-foreground">{item.Summary}</p>
                  </div>

                  {/* Impact Details */}
                  <div>
                    <h4 className="font-medium mb-2">Impact Details</h4>
                    <p className="text-muted-foreground">
                      {item.Impact_Details && String(item.Impact_Details).trim().length > 0 ? item.Impact_Details : 'No impact details available'}
                    </p>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h4 className="font-medium mb-2">Recommended Actions</h4>
                    <p className="text-muted-foreground">
                      {item.Recommended_Actions && String(item.Recommended_Actions).trim().length > 0 ? item.Recommended_Actions : 'No recommended actions provided'}
                    </p>
                  </div>

                  {(item.Source || item.Link || item.Sentiment || item.Severity) && (
                    <div>
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

                  {item.Additional && Object.keys(item.Additional).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">More details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(item.Additional).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="font-medium min-w-28">{key}:</span>
                            <span className="break-words">
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
      {!isLoading && riskData.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {isConnected 
                ? "Waiting for data from WebSocket..." 
                : "Connect to WebSocket to receive risk analysis data."
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListAnalysis;
