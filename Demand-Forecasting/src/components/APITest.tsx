import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, testAPIConnection, debugAPI } from '@/lib/api';

const APITest = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results: string[] = [];
    
    // Test 1: Basic connection
    try {
      const connected = await testAPIConnection();
      results.push(`Connection Test: ${connected ? '✅ PASS' : '❌ FAIL'}`);
    } catch (error) {
      results.push(`Connection Test: ❌ ERROR - ${error}`);
    }
    
    // Test 2: Products endpoint
    try {
      const products = await api.getProducts();
      results.push(`Products API: ${products && products.length > 0 ? '✅ PASS' : '❌ FAIL'} (${products?.length || 0} products)`);
    } catch (error) {
      results.push(`Products API: ❌ ERROR - ${error}`);
    }
    
    // Test 3: Forecasts endpoint
    try {
      const forecasts = await api.getForecasts();
      results.push(`Forecasts API: ${forecasts && forecasts.length > 0 ? '✅ PASS' : '❌ FAIL'} (${forecasts?.length || 0} forecasts)`);
    } catch (error) {
      results.push(`Forecasts API: ❌ ERROR - ${error}`);
    }
    
    // Test 4: Sales KPIs
    try {
      const salesKPIs = await api.getSalesKPIs();
      results.push(`Sales KPIs API: ${salesKPIs ? '✅ PASS' : '❌ FAIL'}`);
    } catch (error) {
      results.push(`Sales KPIs API: ❌ ERROR - ${error}`);
    }
    
    // Test 5: Inventory KPIs
    try {
      const inventoryKPIs = await api.getInventoryKPIs();
      results.push(`Inventory KPIs API: ${inventoryKPIs ? '✅ PASS' : '❌ FAIL'}`);
    } catch (error) {
      results.push(`Inventory KPIs API: ❌ ERROR - ${error}`);
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const runDebugAPI = async () => {
    setLoading(true);
    await debugAPI();
    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Integration Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={runTests} disabled={loading}>
              {loading ? 'Running Tests...' : 'Run API Tests'}
            </Button>
            <Button onClick={runDebugAPI} disabled={loading} variant="outline">
              Debug API
            </Button>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default APITest; 