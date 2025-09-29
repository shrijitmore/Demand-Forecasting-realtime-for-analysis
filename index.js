const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { getWeek, getMonth, getQuarter } = require('date-fns');
const cors = require('cors')

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from Data directory
app.use('/static', express.static(path.join(__dirname, 'Data')));

// Middleware to log all incoming requests
app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});
const port = 3000;

const dataPath = path.join(__dirname, 'Data', 'all_pump_forecasts.csv');
const insightsDataPath = path.join(__dirname, 'Data', 'groq_bullet_monthly_insights.csv');
const yearlyInsightsPath = path.join(__dirname, 'Data', 'groq_yearly_regional_insights.csv');
const monthlyInsightsPath = path.join(__dirname, 'Data', 'groq_monthly_insights.csv');
const quarterlyInsightsPath = path.join(__dirname, 'Data', 'groq_quarterly_regional_insights.csv');

let yearlyInsightsData = [];
let monthlyInsightsData = [];
let quarterlyInsightsData = [];

// Function to read and parse the CSV data
const loadData = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(dataPath)
            .pipe(csv())
            .on('data', (row) => {
                row.Forecasted_Demand = parseFloat(row.Forecasted_Demand);
                row.Date = new Date(row.Date);
                data.push(row);
            })
            .on('end', () => {
                forecastData = data;
                console.log('CSV data successfully loaded.');
                resolve(forecastData);
            })
            .on('error', (error) => {
                console.error('Error loading CSV data:', error);
                reject(error);
            });
    });
};

// Function to load alternate suppliers data
const loadAlternateSuppliersData = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        const alternateSuppliersPath = path.join(__dirname, 'Data', 'alternate_suppliers.csv');
        
        fs.createReadStream(alternateSuppliersPath)
            .pipe(csv())
            .on('data', (row) => {
                // Convert all numeric fields to numbers
                row.sku_id = row.sku_id ? String(row.sku_id) : null;
                row.otd_percentage = parseFloat(row.otd_percentage);
                row.quality_score = parseFloat(row.quality_score);
                data.push(row);
            })
            .on('end', () => {
                alternateSuppliersData = data;
                console.log('Alternate suppliers data loaded:', data.length, 'records');
                resolve(data);
            })
            .on('error', (error) => {
                console.error('Error loading alternate suppliers data:', error);
                reject(error);
            });
    });
};

// Helper function to filter data based on query parameters
const filterData = (req) => {
    const { PRODUCT_CARD_ID, PRODUCT_NAME } = req.query;
    let filteredData = [...forecastData];

    if (PRODUCT_CARD_ID) {
        filteredData = filteredData.filter(d => d.PRODUCT_CARD_ID === PRODUCT_CARD_ID);
    }
    if (PRODUCT_NAME) {
        filteredData = filteredData.filter(d => d.PRODUCT_NAME === PRODUCT_NAME);
    }
    return filteredData;
};

// API endpoint to get all forecast data (with optional filtering)
app.get('/api/forecasts', (req, res) => {
    console.log('Handling request for /api/forecasts');
    const filteredData = filterData(req);
    res.json(filteredData);
});

// Helper function to aggregate data
const aggregateData = (data, groupBy) => {
    const aggregated = data.reduce((acc, curr) => {
        let key;
        const year = curr.Date.getFullYear();
        if (groupBy === 'weekly') {
            const week = getWeek(curr.Date);
            key = `${year}-W${week}`;
        } else if (groupBy === 'monthly') {
            const month = getMonth(curr.Date) + 1; // getMonth is 0-indexed
            key = `${year}-M${month}`;
        } else if (groupBy === 'quarterly') {
            const quarter = getQuarter(curr.Date);
            key = `${year}-Q${quarter}`;
        }

        if (!acc[key]) {
            acc[key] = { demand: 0, count: 0 };
        }
        acc[key].demand += curr.Forecasted_Demand;
        acc[key].count += 1;
        return acc;
    }, {});

    return Object.entries(aggregated).map(([key, value]) => ({
        period: key,
        total_demand: value.demand,
        average_demand: value.demand / value.count
    }));
};

// API endpoints for aggregated data
app.get('/api/forecasts/weekly', (req, res) => {
    const filteredData = filterData(req);
    res.json(aggregateData(filteredData, 'weekly'));
});

app.get('/api/forecasts/monthly', (req, res) => {
    const filteredData = filterData(req);
    res.json(aggregateData(filteredData, 'monthly'));
});

app.get('/api/forecasts/quarterly', (req, res) => {
    const filteredData = filterData(req);
    res.json(aggregateData(filteredData, 'quarterly'));
});

// Function to read and parse the insights CSV data
const loadInsightsData = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(insightsDataPath)
            .pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                insightsData = data;
                console.log('Insights CSV data successfully loaded.');
                resolve(insightsData);
            })
            .on('error', (error) => {
                console.error('Error loading insights CSV data:', error);
                reject(error);
            });
    });
};

// Helper function to filter insights data
const filterInsightsData = (req) => {
    const { Month, PRODUCT_CARD_ID, PRODUCT_NAME } = req.query;
    let filteredData = [...insightsData];

    if (Month) {
        filteredData = filteredData.filter(d => d.Month === Month);
    }
    if (PRODUCT_CARD_ID) {
        filteredData = filteredData.filter(d => d.PRODUCT_CARD_ID === PRODUCT_CARD_ID);
    }
    if (PRODUCT_NAME) {
        filteredData = filteredData.filter(d => d.PRODUCT_NAME === PRODUCT_NAME);
    }
    return filteredData;
};

// API endpoint for AI insights
app.get('/api/insights', (req, res) => {
    const filteredData = filterInsightsData(req);
    res.json(filteredData);
});

// Helper function to load yearly regional insights data
const loadYearlyRegionalInsights = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        try {
            fs.createReadStream(yearlyInsightsPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    yearlyInsightsData = data;
                    console.log('Yearly Regional Insights data loaded:', yearlyInsightsData.length, 'records');
                    resolve(yearlyInsightsData);
                })
                .on('error', (error) => {
                    console.error('Error loading yearly insights data:', error);
                    yearlyInsightsData = [];
                    resolve([]); // Resolve with empty array instead of rejecting
                });
        } catch (error) {
            console.error('Error accessing yearly insights file:', error);
            yearlyInsightsData = [];
            resolve([]);
        }
    });
};

// Helper function to load monthly regional insights data
const loadMonthlyRegionalInsights = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        try {
            fs.createReadStream(monthlyInsightsPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    monthlyInsightsData = data;
                    console.log('Monthly Regional Insights data loaded:', monthlyInsightsData.length, 'records');
                    resolve(monthlyInsightsData);
                })
                .on('error', (error) => {
                    console.error('Error loading monthly insights data:', error);
                    monthlyInsightsData = [];
                    resolve([]); // Resolve with empty array instead of rejecting
                });
        } catch (error) {
            console.error('Error accessing monthly insights file:', error);
            monthlyInsightsData = [];
            resolve([]);
        }
    });
};

// Helper function to load quarterly regional insights data
const loadQuarterlyRegionalInsights = () => {
    return new Promise((resolve, reject) => {
        const data = [];
        try {
            fs.createReadStream(quarterlyInsightsPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    quarterlyInsightsData = data;
                    console.log('Quarterly Regional Insights data loaded:', quarterlyInsightsData.length, 'records');
                    resolve(quarterlyInsightsData);
                })
                .on('error', (error) => {
                    console.error('Error loading quarterly insights data:', error);
                    quarterlyInsightsData = [];
                    resolve([]); // Resolve with empty array instead of rejecting
                });
        } catch (error) {
            console.error('Error accessing quarterly insights file:', error);
            quarterlyInsightsData = [];
            resolve([]);
        }
    });
};

// Helper function to filter yearly regional insights data
const filterYearlyRegionalInsights = (req) => {
    const { Year } = req.query;
    let filteredData = [...yearlyInsightsData];

    if (Year) {
        filteredData = filteredData.filter(d => d.Year === Year);
    }
    return filteredData;
};

// Helper function to filter monthly regional insights data
const filterMonthlyRegionalInsights = (req) => {
    const { Month, Year } = req.query;
    let filteredData = [...monthlyInsightsData];

    if (Month) {
        filteredData = filteredData.filter(d => d.Month === Month);
    }
    if (Year) {
        filteredData = filteredData.filter(d => d.Year === Year);
    }
    return filteredData;
};

// Helper function to filter quarterly regional insights data
const filterQuarterlyRegionalInsights = (req) => {
    const { Quarter, Year } = req.query;
    let filteredData = [...quarterlyInsightsData];

    if (Quarter) {
        filteredData = filteredData.filter(d => d.Quarter === Quarter);
    }
    if (Year) {
        filteredData = filteredData.filter(d => d.Year === Year);
    }
    return filteredData;
};

// API endpoints for historical regional insights
app.get('/api/insights/historical/yearly', (req, res) => {
    const filteredData = filterYearlyRegionalInsights(req);
    res.json(filteredData);
});

app.get('/api/insights/historical/monthly', (req, res) => {
    const filteredData = filterMonthlyRegionalInsights(req);
    res.json(filteredData);
});

app.get('/api/insights/historical/quarterly', (req, res) => {
    const filteredData = filterQuarterlyRegionalInsights(req);
    res.json(filteredData);
});

// API endpoint to get unique products for dropdowns
app.get('/api/products', (req, res) => {
    const products = [...new Map(forecastData.map(item => [item['PRODUCT_CARD_ID'], {PRODUCT_CARD_ID: item.PRODUCT_CARD_ID, PRODUCT_NAME: item.PRODUCT_NAME}])).values()];
    res.json(products);
});

// ─── SALES APIs ────────────────────────────────────────

// Load sales data
let salesData = [];
const loadSalesData = () => {
    return new Promise((resolve, reject) => {
        const salesPath = path.join(__dirname, 'Data', 'Pump_Data.csv');
        const data = [];
        fs.createReadStream(salesPath)
            .pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                salesData = data;
                console.log('Sales data successfully loaded.');
                resolve(salesData);
            })
            .on('error', (error) => {
                console.error('Error loading sales data:', error);
                reject(error);
            });
    });
};

// Sales KPIs endpoint
app.get('/api/sales/kpis', (req, res) => {
    if (!salesData.length) {
        return res.json({ error: "Sales data not found" });
    }
    try {
        const totalOrders = new Set(salesData.map(item => item['Order Item Id'])).size;
        const totalSales = salesData.reduce((sum, item) => sum + parseFloat(item.Sales || 0), 0);
        const avgDiscount = salesData.reduce((sum, item) => sum + parseFloat(item['Order Item Discount Rate'] || 0), 0) / salesData.length;
        const lateDeliveries = salesData.filter(item => item['Late_delivery_risk'] === '1').length;
        
        res.json({
            total_orders: totalOrders,
            total_sales: Math.round(totalSales * 100) / 100,
            avg_discount: Math.round(avgDiscount * 100 * 100) / 100,
            late_deliveries: lateDeliveries
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Sales metrics endpoint
app.get('/api/sales/:metric', (req, res) => {
    const { metric } = req.params;
    if (!salesData.length) {
        return res.json({ error: "Data not loaded" });
    }

    try {
        if (metric === 'city-sales') {
            const citySales = {};
            salesData.forEach(item => {
                const city = item['Customer City'];
                const sales = parseFloat(item.Sales || 0);
                citySales[city] = (citySales[city] || 0) + sales;
            });
            const sortedCities = Object.entries(citySales)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            res.json({
                cities: sortedCities.map(([city]) => city),
                sales: sortedCities.map(([,sales]) => sales)
            });
        } else if (metric === 'category-distribution') {
            const categorySales = {};
            salesData.forEach(item => {
                const category = item['Category Name'];
                const sales = parseFloat(item.Sales || 0);
                categorySales[category] = (categorySales[category] || 0) + sales;
            });
            res.json({
                categories: Object.keys(categorySales),
                sales: Object.values(categorySales)
            });
        } else if (metric === 'monthly-sales') {
            const monthlySales = {};
            salesData.forEach(item => {
                const date = new Date(item['order date (DateOrders)']);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const sales = parseFloat(item.Sales || 0);
                monthlySales[month] = (monthlySales[month] || 0) + sales;
            });
            const sortedMonths = Object.entries(monthlySales).sort();
            res.json({
                months: sortedMonths.map(([month]) => month),
                sales: sortedMonths.map(([,sales]) => sales)
            });
        } else if (metric === 'shipping-mode') {
            const shippingModes = {};
            salesData.forEach(item => {
                const mode = item['Shipping Mode'];
                shippingModes[mode] = (shippingModes[mode] || 0) + 1;
            });
            res.json({
                modes: Object.keys(shippingModes),
                counts: Object.values(shippingModes)
            });
        } else if (metric === 'region-sales') {
            const regionSales = {};
            salesData.forEach(item => {
                const region = item['Order Region'];
                const sales = parseFloat(item.Sales || 0);
                regionSales[region] = (regionSales[region] || 0) + sales;
            });
            const sortedRegions = Object.entries(regionSales).sort(([,a], [,b]) => b - a);
            res.json({
                regions: sortedRegions.map(([region]) => region),
                sales: sortedRegions.map(([,sales]) => sales)
            });
        } else if (metric === 'top-products') {
            const productSales = {};
            salesData.forEach(item => {
                const product = item['Product Name'];
                const sales = parseFloat(item.Sales || 0);
                productSales[product] = (productSales[product] || 0) + sales;
            });
            const sortedProducts = Object.entries(productSales)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            res.json({
                products: sortedProducts.map(([product]) => product),
                sales: sortedProducts.map(([,sales]) => sales)
            });
        } else {
            res.status(400).json({ error: `Invalid metric '${metric}'` });
        }
    } catch (error) {
        res.json({ error: error.message });
    }
});

// ─── INVENTORY APIs ──────────────────────────────────

// Load inventory data
let stockData = [];
let alertData = [];
let scheduleData = [];
let bomData = [];
let mrpData = [];
let productionOrdersData = [];
let stationScheduleData = [];

const loadInventoryData = () => {
    console.log('Loading inventory data...');
    return Promise.all([
        new Promise((resolve, reject) => {
            const stockPath = path.join(__dirname, 'Data', 'total_stock_levels_updated.csv');
            console.log('Loading stock data from:', stockPath);
            const data = [];
            fs.createReadStream(stockPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean up field names - remove BOM and normalize
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.replace(/^\uFEFF/, '').trim(); // Remove BOM
                        cleanRow[cleanKey] = row[key];
                    });
                    data.push(cleanRow);
                })
                .on('end', () => {
                    stockData = data;
                    console.log('Stock data loaded:', data.length, 'items');
                    if (data.length > 0) {
                        console.log('Stock data fields:', Object.keys(data[0]));
                        console.log('First stock item:', data[0]);
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading stock data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const alertPath = path.join(__dirname, 'Data', 'total_demo_sku_inventory_alerts.csv');
            console.log('Loading alert data from:', alertPath);
            const data = [];
            fs.createReadStream(alertPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean up field names - remove BOM and normalize
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.replace(/^\uFEFF/, '').trim(); // Remove BOM
                        cleanRow[cleanKey] = row[key];
                    });
                    data.push(cleanRow);
                })
                .on('end', () => {
                    alertData = data;
                    console.log('Alert data loaded:', data.length, 'items');
                    if (data.length > 0) {
                        console.log('Alert data fields:', Object.keys(data[0]));
                        console.log('First alert item:', data[0]);
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading alert data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const schedulePath = path.join(__dirname, 'Data', 'total_production_schedule.csv');
            console.log('Loading schedule data from:', schedulePath);
            const data = [];
            fs.createReadStream(schedulePath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    scheduleData = data;
                    console.log('Schedule data loaded:', data.length, 'items');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading schedule data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const bomPath = path.join(__dirname, 'Data', 'bom_data.csv');
            console.log('Loading BOM data from:', bomPath);
            const data = [];
            fs.createReadStream(bomPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    bomData = data;
                    console.log('BOM data loaded:', data.length, 'items');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading BOM data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const mrpPath = path.join(__dirname, 'Data', 'total_mrp_plan_updated.csv');
            console.log('Loading MRP data from:', mrpPath);
            const data = [];
            fs.createReadStream(mrpPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    mrpData = data;
                    console.log('MRP data loaded:', data.length, 'items');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading MRP data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const ordersPath = path.join(__dirname, 'Data', 'total_production_orders.csv');
            console.log('Loading production orders data from:', ordersPath);
            const data = [];
            fs.createReadStream(ordersPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    productionOrdersData = data;
                    console.log('Production orders data loaded:', data.length, 'items');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading production orders data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const stationPath = path.join(__dirname, 'Data', 'total_station_schedule_updated.csv');
            console.log('Loading station schedule data from:', stationPath);
            const data = [];
            fs.createReadStream(stationPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    stationScheduleData = data;
                    console.log('Station schedule data loaded:', data.length, 'items');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading station schedule data:', error);
                    reject(error);
                });
        })
    ]).then(() => {
        console.log('All inventory data loaded successfully');
    }).catch((error) => {
        console.error('Error loading inventory data:', error);
    });
};

// Inventory KPIs endpoint
app.get('/api/inventory/kpis', (req, res) => {
    try {
        console.log('Inventory KPIs endpoint called');
        console.log('Stock data length:', stockData.length);
        console.log('Alert data length:', alertData.length);
        console.log('Schedule data length:', scheduleData.length);
        
        const totalSkus = new Set(stockData.map(item => item.SKU_No)).size;
        const totalStockOnHand = stockData.reduce((sum, item) => sum + parseInt(item.Stock_On_Hand || 0), 0);
        const inTransit = stockData.reduce((sum, item) => sum + parseInt(item.In_Transit || 0), 0);
        const belowReorderPoint = alertData.filter(item => 
            parseInt(item.Available || 0) < parseInt(item.Reorder_Point || 0)
        ).length;
        const avgLeadTime = stockData.reduce((sum, item) => sum + parseFloat(item.Lead_Time_Days || 0), 0) / stockData.length;
        const scheduledQty = scheduleData.reduce((sum, item) => sum + parseInt(item.Scheduled_Quantity || 0), 0);
        
        const kpis = {
            total_skus: totalSkus,
            total_stock_on_hand: totalStockOnHand,
            in_transit: inTransit,
            below_reorder_point: belowReorderPoint,
            avg_lead_time: Math.round(avgLeadTime * 100) / 100,
            scheduled_qty: scheduledQty
        };
        
        console.log('Inventory KPIs calculated:', kpis);
        res.json(kpis);
    } catch (error) {
        console.error('Error in inventory KPIs endpoint:', error);
        res.json({ error: error.message });
    }
});

// Reorder chart endpoint
app.get('/api/inventory/reorder_chart', (req, res) => {
    try {
        console.log('Reorder chart endpoint called. Alert data length:', alertData.length);
        if (alertData.length > 0) {
            console.log('Sample alert data item:', alertData[0]);
            console.log('Available fields in alert data:', Object.keys(alertData[0] || {}));
        }
        
        const chartData = alertData.map((item, index) => {
            // Try multiple field name variations
            const skuNo = item.SKU_No || item['SKU_No'] || item.sku_no || item.skuNo || `SKU${index + 1}`;
            const available = parseInt(item.Available || item.available || 0);
            const reorderPoint = parseInt(item.Reorder_Point || item.reorder_point || 0);
            
            return {
                SKU_No: skuNo,
                Available: available,
                Reorder_Point: reorderPoint
            };
        }).filter(item => item.SKU_No && item.SKU_No !== 'undefined');
        
        console.log('Reorder chart data generated:', chartData.length, 'items');
        if (chartData.length > 0) {
            console.log('Sample reorder data:', chartData[0]);
        }
        res.json(chartData);
    } catch (error) {
        console.error('Error in reorder chart endpoint:', error);
        res.json({ error: error.message });
    }
});

// Lead times endpoint
app.get('/api/inventory/lead_times', (req, res) => {
    try {
        console.log('Lead times endpoint called. Stock data length:', stockData.length);
        if (stockData.length > 0) {
            console.log('Sample stock data item:', stockData[0]);
            console.log('Available fields in stock data:', Object.keys(stockData[0] || {}));
        }
        
        const leadTimes = stockData.map((item, index) => {
            // Try multiple field name variations
            const skuNo = item.SKU_No || item['SKU_No'] || item.sku_no || item.skuNo || `SKU${index + 1}`;
            const leadTimeDays = parseFloat(item.Lead_Time_Days || item.lead_time_days || 0);
            
            return {
                SKU_No: skuNo,
                Lead_Time_Days: leadTimeDays
            };
        }).filter(item => item.SKU_No && item.SKU_No !== 'undefined');
        
        console.log('Lead times data generated:', leadTimes.length, 'items');
        if (leadTimes.length > 0) {
            console.log('Sample lead time data:', leadTimes[0]);
        }
        res.json(leadTimes);
    } catch (error) {
        console.error('Error in lead times endpoint:', error);
        res.json({ error: error.message });
    }
});

// Supplier alerts endpoint
app.get('/api/inventory/suppliers', (req, res) => {
    try {
        const filtered = alertData.filter(item => 
            parseInt(item.Available || 0) < parseInt(item.Reorder_Point || 0)
        );
        const supplierCounts = {};
        filtered.forEach(item => {
            const supplier = item.Supplier;
            supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
        });
        const result = Object.entries(supplierCounts).map(([supplier, count]) => ({
            Supplier: supplier,
            Alert_Count: count
        }));
        res.json(result);
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Inventory data endpoint
app.get('/api/inventory/:dataset', (req, res) => {
    const { dataset } = req.params;
    console.log(`Inventory data endpoint called for dataset: ${dataset}`);
    
    const fileMap = {
        'stock_levels': stockData,
        'alerts': alertData,
        'bom': bomData,
        'mrp_plan': mrpData,
        'production_orders': productionOrdersData,
        'schedule': scheduleData,
        'station_schedule': stationScheduleData
    };
    
    if (!fileMap[dataset]) {
        console.log(`Invalid dataset requested: ${dataset}`);
        return res.status(400).json({ error: `Invalid dataset '${dataset}'` });
    }
    
    const data = fileMap[dataset];
    console.log(`Returning ${data.length} items for dataset: ${dataset}`);
    if (data.length > 0) {
        console.log(`Sample data for ${dataset}:`, data[0]);
    }
    
    res.json(data);
});

// ─── PROCUREMENT APIs ────────────────────────────────

// Load procurement data
let procurementData = [];

const loadProcurementData = () => {
    return new Promise((resolve, reject) => {
        const procurementPath = path.join(__dirname, 'Data', 'smart_procurement_insights_dec2017.csv');
        const data = [];
        fs.createReadStream(procurementPath)
            .pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                procurementData = data;
                console.log('Procurement data successfully loaded.');
                resolve();
            })
            .on('error', reject);
    });
};

// All procurement insights endpoint
app.get('/api/procurement/insights', (req, res) => {
    res.json(procurementData);
});

// Procurement insight by SKU endpoint
app.get('/api/procurement/insight/:sku_id', (req, res) => {
    const { sku_id } = req.params;
    const match = procurementData.filter(item => item.SKU_ID === sku_id);
    if (match.length === 0) {
        return res.status(404).json({ message: `No insight found for SKU ${sku_id}` });
    }
    res.json(match);
});

// ─── OPERATOR, SCHEDULE & SUPPLIER SERVICES ──────────

// Load operator data
let attendanceData = [];
let leaveRequestsData = [];
let operatorInsightsData = [];

const loadOperatorData = () => {
    return Promise.all([
        new Promise((resolve, reject) => {
            const attendancePath = path.join(__dirname, 'Data', 'attendance_log.csv');
            console.log('Loading attendance data from:', attendancePath);
            const data = [];
            fs.createReadStream(attendancePath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    attendanceData = data;
                    console.log('Attendance data loaded:', data.length, 'records');
                    if (data.length > 0) {
                        console.log('Sample attendance item:', data[0]);
                        console.log('Available fields:', Object.keys(data[0]));
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading attendance data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const janPath = path.join(__dirname, 'Data', 'leave_requests_january.csv');
            const febPath = path.join(__dirname, 'Data', 'leave_requests_february.csv');
            const data = [];
            
            Promise.all([
                new Promise((resolveJan, rejectJan) => {
                    fs.createReadStream(janPath)
                        .pipe(csv())
                        .on('data', (row) => {
                            const cleanRow = {};
                            Object.keys(row).forEach(key => {
                                const cleanKey = key.replace(/^\uFEFF/, '').trim();
                                cleanRow[cleanKey] = row[key];
                            });
                            data.push(cleanRow);
                        })
                        .on('end', resolveJan)
                        .on('error', rejectJan);
                }),
                new Promise((resolveFeb, rejectFeb) => {
                    fs.createReadStream(febPath)
                        .pipe(csv())
                        .on('data', (row) => {
                            const cleanRow = {};
                            Object.keys(row).forEach(key => {
                                const cleanKey = key.replace(/^\uFEFF/, '').trim();
                                cleanRow[cleanKey] = row[key];
                            });
                            data.push(cleanRow);
                        })
                        .on('end', resolveFeb)
                        .on('error', rejectFeb);
                })
            ]).then(() => {
                leaveRequestsData = data;
                resolve();
            }).catch(reject);
        }),
        new Promise((resolve, reject) => {
            const insightsPath = path.join(__dirname, 'Data', 'groq_operator_jan_feb_insights.csv');
            console.log('Loading operator insights data from:', insightsPath);
            const data = [];
            fs.createReadStream(insightsPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Normalize keys and values
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.replace(/^[\uFEFF\s]+|[\s]+$/g, '');
                        cleanRow[cleanKey] = row[key];
                    });
                    const operatorId = cleanRow.Operator_ID || cleanRow.operator_id || cleanRow["Operator_ID "];
                    const aiInsight = cleanRow.AI_Insight || cleanRow.ai_insight || cleanRow["AI_Insight "];
                    data.push({ operator_id: operatorId, ai_insight: aiInsight });
                })
                .on('end', () => {
                    operatorInsightsData = data;
                    console.log('Operator insights data loaded:', data.length, 'records');
                    if (data.length > 0) {
                        console.log('Sample operator insight item (normalized):', data[0]);
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading operator insights data:', error);
                    reject(error);
                });
        })
    ]);
};

// Production KPIs endpoint
app.get('/api/kpis', (req, res) => {
    try {
        console.log('Production KPIs endpoint called');
        console.log('Attendance data length:', attendanceData.length);
        console.log('Station schedule data length:', stationScheduleData.length);
        
        const totalOperators = new Set(attendanceData.map(item => item.Operator_ID)).size;
        const today = '2018-01-01';
        const absentToday = attendanceData.filter(item => 
            item.Date === today && item.Present === 'No'
        ).length;
        const totalUnitsScheduled = new Set(stationScheduleData.map(item => item.Unit || item.unit)).size;
        const uniqueProducts = new Set(stationScheduleData.map(item => item.Product_Name || item.product_name)).size;
        
        const kpis = {
            total_operators: totalOperators,
            absent_today: absentToday,
            total_units_scheduled: totalUnitsScheduled,
            unique_products: uniqueProducts
        };
        
        console.log('Production KPIs calculated:', kpis);
        res.json(kpis);
    } catch (error) {
        console.error('Error in production KPIs endpoint:', error);
        res.status(500).json({ error: `KPI error: ${error.message}` });
    }
});

// Schedule table endpoint
app.get('/api/schedule', (req, res) => {
    console.log('Schedule endpoint called. Station schedule data length:', stationScheduleData.length);
    if (!stationScheduleData.length) {
        return res.status(500).json({ error: "Schedule file not found or corrupted" });
    }
    
    if (stationScheduleData.length > 0) {
        console.log('Sample station schedule item:', stationScheduleData[0]);
        console.log('Available fields:', Object.keys(stationScheduleData[0]));
    }
    
    const formattedData = stationScheduleData.map(item => ({
        Start_Time: item.Time || item.time || item.Start_Time,
        Station_Name: item.Station || item.station || item.Station_Name,
        Operator_Name: item.Operator || item.operator || item.Operator_Name,
        Model: item.Product_Model || item.product_model || item.Model,
        Product: item.Product_Name || item.product_name || item.Product,
        Date: item.Scheduled_Date || item.scheduled_date || item.Date,
        PO: item.PO_Number || item.po_number || item.PO,
        Units: item.Unit || item.unit || item.Units
    }));
    
    console.log('Formatted schedule data length:', formattedData.length);
    if (formattedData.length > 0) {
        console.log('Sample formatted schedule item:', formattedData[0]);
    }
    
    res.json(formattedData);
});

// Station chart data endpoint
app.get('/api/schedule/chart', (req, res) => {
    console.log('Schedule chart endpoint called. Station schedule data length:', stationScheduleData.length);
    if (!stationScheduleData.length) {
        return res.status(500).json({ error: "Chart data failed" });
    }
    
    if (stationScheduleData.length > 0) {
        console.log('Sample station schedule item for chart:', stationScheduleData[0]);
    }
    
    const stationTotals = {};
    stationScheduleData.forEach(item => {
        const station = item.Station || item.station;
        const units = parseInt(item.Unit || item.unit || 0);
        if (station) {
            stationTotals[station] = (stationTotals[station] || 0) + units;
        }
    });
    
    const chartData = Object.entries(stationTotals).map(([station, total]) => ({
        station: station,
        Total_Units: total
    }));
    
    console.log('Station chart data generated:', chartData.length, 'items');
    if (chartData.length > 0) {
        console.log('Sample station chart data:', chartData[0]);
    }
    
    res.json(chartData);
});

// Operator workload endpoint
app.get('/api/schedule/operator_workload', (req, res) => {
    console.log('Operator workload endpoint called. Station schedule data length:', stationScheduleData.length);
    if (!stationScheduleData.length) {
        return res.status(500).json({ error: "Workload data failed" });
    }
    
    if (stationScheduleData.length > 0) {
        console.log('Sample station schedule item for workload:', stationScheduleData[0]);
    }
    
    const operatorTotals = {};
    stationScheduleData.forEach(item => {
        const operator = item.Operator || item.operator;
        const units = parseInt(item.Unit || item.unit || 0);
        if (operator) {
            operatorTotals[operator] = (operatorTotals[operator] || 0) + units;
        }
    });
    
    const workloadData = Object.entries(operatorTotals).map(([operator, total]) => ({
        operator: operator,
        Total_Units: total
    }));
    
    console.log('Operator workload data generated:', workloadData.length, 'items');
    if (workloadData.length > 0) {
        console.log('Sample operator workload data:', workloadData[0]);
    }
    
    res.json(workloadData);
});

// Attendance table endpoint
app.get('/api/attendance', (req, res) => {
    console.log('Attendance endpoint called. Data length:', attendanceData.length);
    if (attendanceData.length > 0) {
        console.log('Sample attendance item:', attendanceData[0]);
        console.log('Available fields:', Object.keys(attendanceData[0]));
    }
    
    const formattedData = attendanceData.map(item => ({
        date: item.Date || item.date,
        operator_id: item.Operator_ID || item.operator_id,
        operator_name: item.Operator_Name || item.operator_name,
        present: item.Present || item.present,
        shift: item.Shift || item.shift || 'Day'
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Formatted attendance data length:', formattedData.length);
    if (formattedData.length > 0) {
        console.log('Sample formatted attendance item:', formattedData[0]);
    }
    
    res.json(formattedData);
});

app.get('/api/attendance/table', (req, res) => {
    const formattedData = attendanceData.map(item => ({
        date: item.Date || item.date,
        operator_id: item.Operator_ID || item.operator_id,
        operator_name: item.Operator_Name || item.operator_name,
        present: item.Present || item.present,
        shift: item.Shift || item.shift || 'Day'
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(formattedData);
});

// Leave requests endpoint
app.get('/api/leaves', (req, res) => {
    // Build a quick lookup for operator names from attendance
    const operatorIdToName = new Map(
        attendanceData
            .map(a => [a.Operator_ID || a.operator_id, a.Operator_Name || a.operator_name])
            .filter(([id, name]) => id && name)
    );

    const formattedData = leaveRequestsData.map(item => {
        const operatorId = item.Operator_ID || item.operator_id;
        return {
            from_date: item.From_Date || item.from_date,
            to_date: item.To_Date || item.to_date,
            operator_id: operatorId,
            operator_name: item.operator_name || operatorIdToName.get(operatorId) || null,
            reason: item.Reason || item.reason || '',
            status: item.status || 'Approved'
        };
    });

    console.log('Leaves endpoint returning', formattedData.length, 'items');
    if (formattedData.length > 0) {
        console.log('Sample leave item:', formattedData[0]);
    }
    res.json(formattedData);
});

// All operator insights endpoint
app.get('/api/operator-insights', (req, res) => {
    console.log('Operator insights endpoint called. Data length:', operatorInsightsData.length);
    if (operatorInsightsData.length > 0) {
        console.log('Sample operator insight item:', operatorInsightsData[0]);
        console.log('Available fields:', Object.keys(operatorInsightsData[0]));
    }
    
    const filteredInsights = operatorInsightsData.filter(item => {
        const hasOperatorId = item.operator_id;
        const hasInsight = item.ai_insight;
        return hasOperatorId && hasInsight;
    }).map(item => ({
        operator_id: item.operator_id,
        ai_insight: item.ai_insight
    }));
    
    console.log('Filtered operator insights length:', filteredInsights.length);
    if (filteredInsights.length > 0) {
        console.log('Sample filtered insight:', filteredInsights[0]);
    }
    
    res.json({ insights: filteredInsights });
});

// All operator insights endpoint (legacy - for backward compatibility)
app.get('/api/insights', (req, res) => {
    const filteredInsights = operatorInsightsData.filter(item => {
        const hasOperatorId = item.operator_id || item.Operator_ID;
        const hasInsight = item.ai_insight || item.AI_Insight;
        return hasOperatorId && hasInsight;
    });
    res.json({ insights: filteredInsights });
});

// Insight by operator endpoint
app.get('/api/insights1/:operator_id', (req, res) => {
    const { operator_id } = req.params;
    const filtered = operatorInsightsData.filter(item => item.operator_id === operator_id);
    if (filtered.length === 0) {
        return res.json({ message: `No insights found for ${operator_id}` });
    }
    res.json({ insights1: filtered });
});

// Operator dropdown endpoint
app.get('/api/operators/dropdown', (req, res) => {
    const operators = [...new Set(operatorInsightsData
        .filter(item => item.operator_id || item.Operator_ID)
        .map(item => item.operator_id || item.Operator_ID)
    )].sort();
    res.json({ operators: operators });
});

// ─── SUPPLIER PERFORMANCE APIs ───────────────────────

// Load supplier data
let suppliersData = [];
let alternateSuppliersData = [];
let supplierInsightsData = [];

const loadSupplierData = () => {
    return Promise.all([
        new Promise((resolve, reject) => {
            const suppliersPath = path.join(__dirname, 'Data', 'suppliers.csv');
            console.log('Loading suppliers data from:', suppliersPath);
            const data = [];
            fs.createReadStream(suppliersPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    suppliersData = data;
                    console.log('Suppliers data loaded:', data.length, 'records');
                    if (data.length > 0) {
                        console.log('Sample supplier data:', data[0]);
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading suppliers data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const altPath = path.join(__dirname, 'Data', 'alternate_suppliers.csv');
            console.log('Loading alternate suppliers data from:', altPath);
            const data = [];
            fs.createReadStream(altPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    alternateSuppliersData = data;
                    console.log('Alternate suppliers data loaded:', data.length, 'records');
                    if (data.length > 0) {
                        console.log('Sample alternate supplier data:', data[0]);
                        console.log('Available fields:', Object.keys(data[0]));
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading alternate suppliers data:', error);
                    reject(error);
                });
        }),
        new Promise((resolve, reject) => {
            const insightsPath = path.join(__dirname, 'Data', 'ai_supplier_insight_output.csv');
            console.log('Loading supplier insights data from:', insightsPath);
            const data = [];
            fs.createReadStream(insightsPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean up field names - remove BOM and normalize
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.replace(/^\uFEFF/, '').trim(); // Remove BOM
                        cleanRow[cleanKey] = row[key];
                    });
                    data.push(cleanRow);
                })
                .on('end', () => {
                    supplierInsightsData = data;
                    console.log('Supplier insights data loaded:', data.length, 'records');
                    if (data.length > 0) {
                        console.log('Sample supplier insight data:', data[0]);
                        console.log('Available fields:', Object.keys(data[0]));
                    }
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading supplier insights data:', error);
                    reject(error);
                });
        })
    ]);
};

// Supplier data endpoint
app.get('/api/suppliers/:endpoint/:supplier', (req, res) => {
    try {
        const { endpoint, supplier } = req.params;
        
        if (!suppliersData || suppliersData.length === 0) {
            return res.status(500).json({ error: "Suppliers data not loaded" });
        }
        
        const match = suppliersData.filter(item => 
            item.Supplier_Name?.toLowerCase() === supplier.toLowerCase()
        );
        
        if (match.length === 0) {
            return res.status(404).json({ error: `${supplier} not found` });
        }
        
        const supplierData = match[0];
        
        if (endpoint === 'kpis') {
            res.json({
                supplier: supplierData.Supplier_Name,
                lead_time_days: parseFloat(supplierData.Lead_Time_Days),
                fulfillment_rate_percent: parseFloat(supplierData.Fulfillment_Rate.replace('%', '')),
                otd_percent: parseFloat(supplierData.OTD_Percentage.replace('%', '')),
                late_deliveries: parseInt(supplierData.Late_Deliveries),
                total_orders: parseInt(supplierData.Total_Orders)
            });
        } else if (endpoint === 'metrics') {
            res.json({
                "OTD %": parseFloat(supplierData.OTD_Percentage.replace('%', '')),
                "Quality Score": parseFloat(supplierData.Quality_Score),
                "Fulfillment %": parseFloat(supplierData.Fulfillment_Rate.replace('%', ''))
            });
        } else if (endpoint === 'delivery-stats') {
            const totalOrders = parseInt(supplierData.Total_Orders);
            const lateDeliveries = parseInt(supplierData.Late_Deliveries);
            res.json({
                on_time: totalOrders - lateDeliveries,
                late: lateDeliveries,
                total: totalOrders
            });
        } else {
            res.status(400).json({ error: `Unknown supplier endpoint '${endpoint}'` });
        }
    } catch (error) {
        console.error('Error in /api/suppliers/:endpoint/:supplier:', error);
        res.status(500).json({ error: error.message });
    }
});

// List suppliers endpoint
app.get('/api/suppliers/list', (req, res) => {
    try {
        if (!suppliersData || suppliersData.length === 0) {
            return res.status(500).json({ error: "Suppliers data not loaded" });
        }
        
        const suppliers = [...new Set(suppliersData
            .filter(item => item.Supplier_Name)
            .map(item => item.Supplier_Name)
        )].sort();
        res.json(suppliers);
    } catch (error) {
        console.error('Error in /api/suppliers/list:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alternate suppliers endpoint
// Alternate suppliers endpoint for specific supplier
app.get('/api/suppliers/alternates/:supplier', (req, res) => {
    const { supplier } = req.params;
    const mainSupplier = suppliersData.find(item => 
        item.Supplier_Name.toLowerCase() === supplier.toLowerCase()
    );
    
    if (!mainSupplier) {
        return res.status(404).json({ error: `${supplier} not found` });
    }
    
    const skus = mainSupplier.SKU_No;
    
    const filtered = alternateSuppliersData.filter(item => item.sku_id === skus);
    
    const result = filtered.map(item => ({
        sku_id: item.sku_id,
        supplier_name: item.supplier_name,
        otd_percentage: item.otd_percentage,
        quality_score: item.quality_score,
        email: item.email,
        location: item.location
    })).filter(item => item.sku_id && item.supplier_name);
    
    res.json(result);
});

// New endpoint to fetch all alternate suppliers
app.get('/api/suppliers/alternates', (req, res) => {
    try {
        // Check if data is loaded
        if (!alternateSuppliersData || alternateSuppliersData.length === 0) {
            return res.status(500).json({ error: "Alternate suppliers data not loaded" });
        }

        console.log('Alternate suppliers data length:', alternateSuppliersData.length);
        if (alternateSuppliersData.length > 0) {
            console.log('Sample alternate supplier item:', alternateSuppliersData[0]);
            console.log('Available fields:', Object.keys(alternateSuppliersData[0]));
        }

        // Get all unique suppliers from alternateSuppliersData
        const uniqueSuppliers = [...new Set(alternateSuppliersData.map(item => item.Supplier_Name?.toLowerCase()).filter(Boolean))];
        
        // For each supplier, get their alternates
        const allAlternates = uniqueSuppliers.map(supplier => {
            const filtered = alternateSuppliersData.filter(item => 
                item.Supplier_Name?.toLowerCase() === supplier
            );
            
            return filtered.map(item => ({
                sku_id: item.SKU_ID,
                supplier_name: item.Supplier_Name,
                otd_percentage: parseFloat(item.OTD_Percentage || 0),
                quality_score: parseFloat(item.Quality_Score || 0),
                email: item.Email,
                location: item.Location,
                avg_lead_time_days: parseFloat(item.Avg_Lead_Time_Days || 0),
                fulfillment_rate: parseFloat(item.Fulfillment_Rate || 0)
            })).filter(item => item.sku_id && item.supplier_name);
        }).flat();

        // Sort by supplier name for better display
        allAlternates.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));

        console.log('Processed alternate suppliers:', allAlternates.length);
        res.json(allAlternates);
    } catch (error) {
        console.error('Error in /api/suppliers/alternates:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all unique SKU IDs for dropdown
app.get('/api/supplier-insights/skus', (req, res) => {
    try {
        if (!supplierInsightsData || supplierInsightsData.length === 0) {
            return res.status(500).json({ error: "Supplier insights data not loaded" });
        }
        
        const uniqueSkus = [...new Set(supplierInsightsData
            .filter(item => item.SKU_ID)
            .map(item => item.SKU_ID)
        )].sort();
        
        res.json(uniqueSkus);
    } catch (error) {
        console.error('Error in /api/supplier-insights/skus:', error);
        res.status(500).json({ error: error.message });
    }
});

// Modified supplier insight endpoint to work with SKU_IDs directly
app.get('/api/suppliers/insight/:identifier', (req, res) => {
    const { identifier } = req.params;
    console.log("Identifier Data",identifier);
    try {
        if (!supplierInsightsData || supplierInsightsData.length === 0) {
            return res.status(500).json({ error: "Supplier insights data not loaded" });
        }
        
        // Find by SKU_ID directly
        const skuMatch = supplierInsightsData.filter(item => 
            item.SKU_ID && item.SKU_ID.toLowerCase() === identifier.toLowerCase()
        );
        
        if (skuMatch.length > 0) {
            return res.json({
                sku_id: skuMatch[0].SKU_ID,
                insight: skuMatch[0].AI_Supplier_Insight
            });
        }
        
        return res.status(404).json({ error: `No AI insight found for ${identifier}` });
    } catch (error) {
        console.error('Error in /api/suppliers/insight:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── INSIGHTS APIs ───────────────────────────────────

// Load insights data


const loadHistoricalInsightsData = () => {
    return Promise.all([
        new Promise((resolve, reject) => {
            const monthlyPath = path.join(__dirname, 'Data', 'groq_monthly_insights.csv');
            const data = [];
            fs.createReadStream(monthlyPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    monthlyInsightsData = data;
                    resolve();
                })
                .on('error', reject);
        }),
        new Promise((resolve, reject) => {
            const quarterlyPath = path.join(__dirname, 'Data', 'groq_quarterly_regional_insights.csv');
            const data = [];
            fs.createReadStream(quarterlyPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    quarterlyInsightsData = data;
                    resolve();
                })
                .on('error', reject);
        }),
        new Promise((resolve, reject) => {
            const yearlyPath = path.join(__dirname, 'Data', 'groq_yearly_regional_insights.csv');
            const data = [];
            fs.createReadStream(yearlyPath)
                .pipe(csv())
                .on('data', (row) => {
                    data.push(row);
                })
                .on('end', () => {
                    yearlyInsightsData = data;
                    resolve();
                })
                .on('error', reject);
        })
    ]);
};

// Insights by period endpoint
app.get('/api/insights/:period', (req, res) => {
    const { period } = req.params;
    const fileMap = {
        'monthly': monthlyInsightsData,
        'quarterly': quarterlyInsightsData,
        'yearly': yearlyInsightsData
    };
    
    if (!fileMap[period]) {
        return res.status(400).json({ error: `Invalid period '${period}'` });
    }
    
    res.json(fileMap[period]);
});

// Endpoint to serve alternate suppliers CSV as JSON
app.get('/api/alternate-suppliers', (req, res) => {
    const altPath = path.join(__dirname, 'Data', 'alternate_suppliers.csv');
    const results = [];
    fs.createReadStream(altPath)
        .pipe(csv())
        .on('data', (row) => {
            results.push(row);
        })
        .on('end', () => {
            res.json(results);
        })
        .on('error', (err) => {
            console.error('Error reading alternate_suppliers.csv:', err);
            res.status(500).json({ error: 'Failed to read alternate_suppliers.csv' });
        });
});

// Gantt chart endpoint for production schedule
const parseTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [day, month, year] = dateStr.split('-');
  const [hour, minute] = timeStr.split(':');
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
};

// Helper function to reliably parse 'DD-MM-YYYY' dates
const parseScheduleDate = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
  
    const dateParts = dateStr.split('-'); // [DD, MM, YYYY]
    const timeParts = timeStr.split(':');   // [HH, mm]
  
    if (dateParts.length !== 3 || timeParts.length !== 2) return null;
    
    // new Date(year, monthIndex, day, hours, minutes)
    // Note: month is 0-indexed in JavaScript's Date object, so we subtract 1.
    const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]);
    
    // Check if the created date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  };
  
  app.get('/api/schedule/gantt', (req, res) => {
    if (!stationScheduleData || stationScheduleData.length === 0) {
      return res.status(500).json({ error: "Schedule data is not available." });
    }
  
    // Step 1: Clean the keys to remove BOM and other whitespace.
    const cleanedData = stationScheduleData.map(row => {
      const cleanedRow = {};
      for (const key in row) {
        cleanedRow[key.trim()] = row[key];
      }
      return cleanedRow;
    });
  
    // Step 2: Map the cleaned data to the task format.
    const tasks = cleanedData.map((item, idx) => {
      const startDate = parseScheduleDate(item['Scheduled_Date'], item['Time']);
      
      let startISO = null;
      let endISO = null;
      
      if (startDate) {
        // Set the end time to be 15 minutes after the start time
        const endDate = new Date(startDate.getTime() + 15 * 60000);
        startISO = startDate.toISOString();
        endISO = endDate.toISOString();
      }
      
      return {
        id: `task_${idx + 1}`, // Gantt libraries prefer string IDs
        name: `${item['Product_Name']} at ${item['Station']}`,
        start: startISO,
        end: endISO,
        progress: 0,
        // You can add more fields if the library supports them
        raw: item, // Include the original CSV data
      };
    }).filter(task => task.start !== null); // Filter out tasks that couldn't be parsed
  
    res.json(tasks);
  });

// ─── HEALTH CHECK ─────────────────────────────────────

app.get('/', (req, res) => {
    res.json({ message: "✅ Unified SCM Express API is up and running!" });
});

// Catch-all middleware for 404s
app.use((req, res, next) => {
    res.status(404).send(`Sorry, can't find that! The requested URL was: ${req.originalUrl}`);
    console.log(`No route found for ${req.method} ${req.originalUrl}`);
});

// Start the server after loading the data
app.listen(port, async () => {
    try {
        await loadAllData();
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
});

const loadAllData = async () => {
    try {
        await loadData();
        await loadAlternateSuppliersData();
        await loadInsightsData();
        await loadYearlyRegionalInsights();
        await loadMonthlyRegionalInsights();
        await loadQuarterlyRegionalInsights();
        await loadSalesData();
        await loadInventoryData();
        await loadProcurementData();
        await loadOperatorData();
        await loadSupplierData();
        await loadHistoricalInsightsData();
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
};
