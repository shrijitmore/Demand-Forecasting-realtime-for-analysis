import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface MetricProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

interface MetricsPanelProps {
  metrics?: MetricProps[];
  title?: string;
  className?: string;
  isLoading?: boolean;
}

const MetricsPanel = ({
  metrics = [
    {
      title: "Total Orders",
      value: "1,234",
      trend: 5.2,
      trendLabel: "vs last period",
    },
    {
      title: "Total Sales",
      value: "$45,678",
      trend: -2.4,
      trendLabel: "vs last period",
    },
    {
      title: "Average Discount",
      value: "12.5%",
      trend: 0.8,
      trendLabel: "vs last period",
    },
    {
      title: "Late Deliveries",
      value: "24",
      trend: -8.7,
      trendLabel: "vs last period",
    },
  ],
  title = "Key Metrics",
  className = "",
  isLoading = false,
}: MetricsPanelProps) => {
  if (isLoading) {
    return (
      <div className={`w-full bg-background ${className}`}>
        <h3 className="text-lg font-medium mb-3">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-muted rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-background ${className}`}>
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {metric.title}
                  </p>
                  <h4 className="text-2xl font-bold mt-1">{metric.value}</h4>
                  {metric.trend !== undefined && (
                    <div className="flex items-center mt-2">
                      {metric.trend > 0 ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : metric.trend < 0 ? (
                        <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                      ) : (
                        <span className="h-4 w-4 text-yellow-500 mr-1">―</span>
                      )}
                      <span
                        className={`text-xs ${metric.trend > 0 ? "text-green-500" : metric.trend < 0 ? "text-red-500" : "text-yellow-500"}`}
                      >
                        {Math.abs(metric.trend)}% {metric.trendLabel}
                      </span>
                    </div>
                  )}
                </div>
                {metric.icon && (
                  <div className="text-muted-foreground">{metric.icon}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MetricsPanel;
