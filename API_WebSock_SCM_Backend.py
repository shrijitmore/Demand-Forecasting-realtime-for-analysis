import json
import time
import traceback
from datetime import datetime, timedelta
from urllib.parse import parse_qs
import pandas as pd
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock

app = Flask(__name__)
CORS(app)

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# ──────────────────────────────────────────────
# Data Loading Functions (Using CSV Files)
# ──────────────────────────────────────────────

def load_csv_data(filename):
    """Load CSV data from the Data directory."""
    try:
        filepath = os.path.join(os.path.dirname(__file__), 'Data', filename)
        if os.path.exists(filepath):
            df = pd.read_csv(filepath)
            return df
        else:
            print(f"Warning: File {filename} not found")
            return pd.DataFrame()
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return pd.DataFrame()

# Load sales data from CSV
def load_sales_data():
    return load_csv_data('Pump_Data.csv')

# Mock database connection for compatibility
def get_db_connection():
    return None

def run_query(query):
    """Mock function to simulate SQL queries using CSV data."""
    # This is a simplified mock - in real scenario you'd parse the query
    # For now, return empty DataFrame
    return pd.DataFrame()

def load_sql(query):
    """Mock function for SQL queries."""
    return pd.DataFrame()

    
# ──────────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────────

def safe_send(ws, message):
    """Safely send data over the WebSocket."""
    try:
        ws.send(message)
        return True
    except Exception:
        return False

def parse_interval(qs, default=1):
    """Extract interval parameter from query string."""
    params = parse_qs(qs)
    try:
        return int(params.get("interval", [default])[0])
    except ValueError:
        return default

def convert_dates(df):
    """
    Convert date or datetime columns to ISO-formatted strings for JSON serialization.
    """
    if df.empty:
        return df
    for col in df.columns:
        df[col] = df[col].apply(
            lambda x: x.isoformat()
            if isinstance(x, (datetime, pd.Timestamp))
            else (x.strftime("%Y-%m-%d") if hasattr(x, "strftime") else x)
        )
    return df


def get_supplier_row(supplier_name):
    df = run_query("SELECT * FROM suppliers")
    if df is None or df.empty:
        return None
    match = df[df["supplier_name"].str.lower() == supplier_name.lower()]
    if match.empty:
        return None
    return match.iloc[0]

def percent_to_float(val):
    try:
        if isinstance(val, str):
            return float(val.replace("%", "").strip())
        return float(val)
    except:
        return 0.0


# ──────────────────────────────────────────────
# ROOT ENDPOINT
# ──────────────────────────────────────────────
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "message": "Flask API running 🚀"})

# ──────────────────────────────────────────────
# INSIGHTS API
# ──────────────────────────────────────────────
@app.route("/api/insights/<period>", methods=["GET"])
def insights(period):
    table_map = {
        "monthly": "monthly_historical_ai_insights",
        "quarterly": "quarterly_historical_ai_insights",
        "yearly": "yearly_historical_ai_insights_region"
    }
    if period not in table_map:
        return jsonify({"error": f"Invalid period '{period}'"}), 400

    try:
        with get_db_connection() as conn:
            query = f"SELECT * FROM {table_map[period]}"
            df = pd.read_sql(query, conn)
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        print("DB Error in insights:", e)
        return jsonify({"error": str(e)})

# ──────────────────────────────────────────────
# KPIs API
# ──────────────────────────────────────────────
@app.route("/api/sales/kpis", methods=["GET"])
def kpis():
    df = load_sales_data()
    if df is None or df.empty:
        return jsonify({"error": "Sales data not found"})
    try:
        # Fix column names to match the actual CSV structure
        total_orders = int(df["Order Item Id"].nunique()) if "Order Item Id" in df.columns else 0
        total_sales = round(float(df["Sales"].sum()), 2) if "Sales" in df.columns else 0
        avg_discount = round(float(df["Order Item Discount Rate"].mean()) * 100, 2) if "Order Item Discount Rate" in df.columns else 0
        late_deliveries = int(df[df["Late_delivery_risk"] == 1].shape[0]) if "Late_delivery_risk" in df.columns else 0
        
        return jsonify({
            "total_orders": total_orders,
            "total_sales": total_sales,
            "avg_discount": avg_discount,
            "late_deliveries": late_deliveries
        })
    except Exception as e:
        print("Error in KPIs:", e)
        return jsonify({"error": str(e)})

@app.route("/api/sales/<string:metric>", methods=["GET"])
def sales_metric(metric):
    df = load_sales_data()
    if df is None or df.empty:
        return jsonify({"error": "Data not loaded"})

    try:
        if metric == "city-sales":
            data = df.groupby("Customer City")["Sales"].sum().nlargest(10)
            return jsonify({"cities": data.index.tolist(), "sales": data.values.tolist()})
        elif metric == "category-distribution":
            data = df.groupby("Category Name")["Sales"].sum()
            return jsonify({"categories": data.index.tolist(), "sales": data.values.tolist()})
        elif metric == "monthly-sales":
            df["order date (DateOrders)"] = pd.to_datetime(df["order date (DateOrders)"], errors="coerce")
            df["Month"] = df["order date (DateOrders)"].dt.to_period("M").astype(str)
            data = df.groupby("Month")["Sales"].sum().sort_index()
            return jsonify({"months": data.index.tolist(), "sales": data.values.tolist()})
        elif metric == "shipping-mode":
            data = df["Shipping Mode"].value_counts()
            return jsonify({"modes": data.index.tolist(), "counts": data.values.tolist()})
        elif metric == "region-sales":
            data = df.groupby("Order Region")["Sales"].sum().sort_values(ascending=False)
            return jsonify({"regions": data.index.tolist(), "sales": data.values.tolist()})
        elif metric == "top-products":
            data = df.groupby("Product Name")["Sales"].sum().nlargest(5)
            return jsonify({"products": data.index.tolist(), "sales": data.values.tolist()})
        else:
            return jsonify({"error": f"Invalid metric '{metric}'"}), 400
    except Exception as e:
        print("Error in sales_metric:", e)
        return jsonify({"error": str(e)})

# ─── Forecast APIs ────────────────────────────────────────
@app.route("/api/forecast/<string:frequency>")
def forecast_by_frequency(frequency):
    """Get forecast data by frequency (mock implementation using CSV data)."""
    df = load_csv_data('all_pump_forecasts.csv')
    if df is None or df.empty:
        return jsonify({"error": f"No forecast data found for {frequency}"}), 404

    # Convert date column
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    
    # Simple grouping by frequency (mock implementation)
    if frequency == "weekly":
        df["Period"] = df["Date"].dt.to_period("W").astype(str)
    elif frequency == "monthly":  
        df["Period"] = df["Date"].dt.to_period("M").astype(str)
    elif frequency == "daily":
        df["Period"] = df["Date"].dt.to_period("D").astype(str)
    else:
        df["Period"] = df["Date"].dt.to_period("D").astype(str)
    
    # Aggregate data
    result = df.groupby(["Period", "PRODUCT_CARD_ID", "PRODUCT_NAME"]).agg({
        "Forecasted_Demand": ["sum", "mean"]
    }).round(2)
    
    result.columns = ["total_demand", "average_demand"]
    result = result.reset_index()
    
    return jsonify(result.to_dict(orient="records"))

@app.route("/api/forecast/product/<string:product_id>")
def forecast_by_product(product_id):
    """Get forecast data by product ID."""
    df = load_csv_data('all_pump_forecasts.csv')
    if df is None or df.empty:
        return jsonify({"error": f"No forecast found for product {product_id}"}), 404

    # Filter by product ID
    product_data = df[df["PRODUCT_CARD_ID"] == product_id]
    if product_data.empty:
        return jsonify({"error": f"No forecast found for product {product_id}"}), 404

    return jsonify(product_data.to_dict(orient="records"))

# ─── Forecast AI Insights APIs ────────────────────────────────────────
@app.route("/api/forecast/insights/<period>")
def forecast_ai_insights(period):
    table_map = {
        "monthly": "monthly_forecast_ai_insights",
        "quarterly": "quarterly_forecast_ai_insights",
        "yearly": "yearly_forecast_ai_insights"
    }

    if period not in table_map:
        return jsonify({"error": f"Invalid period '{period}'. Use 'monthly', 'quarterly', or 'yearly'."}), 400

    query = f"SELECT * FROM {table_map[period]}"
    df = run_query(query)

    if df is None or df.empty:
        return jsonify({"error": f"No forecast insights found for {period}"}), 404

    return jsonify(df.to_dict(orient="records"))


# ─── Operator APIs ───────────────────────────────────────────────

# Get all operators with station & skill info
@app.route("/api/operators", methods=["GET"])
def get_operators():
    df = run_query("SELECT * FROM operator_station_map")
    if df is None or df.empty:
        return jsonify({"error": "No operator data found"}), 404
    return jsonify(df.to_dict(orient="records"))

# Get AI insights of operators
@app.route("/api/operators/insights", methods=["GET"])
def operator_insights():
    df = run_query("SELECT * FROM operator_insights")
    if df is None or df.empty:
        return jsonify({"error": "No operator AI insights found"}), 404
    return jsonify(df.to_dict(orient="records"))

# Get attendance log for a given month (pass month as 'january', 'february', etc.)
@app.route("/api/operators/attendance/<string:month>", methods=["GET"])
def operator_attendance(month):
    table_map = {
        "january": "attendance_log_january"
    }
    if month not in table_map:
        return jsonify({"error": f"Invalid month '{month}'"}), 400

    df = run_query(f"SELECT * FROM {table_map[month]}")
    if df is None or df.empty:
        return jsonify({"error": f"No attendance data found for {month}"}), 404
    return jsonify(df.to_dict(orient="records"))

# Get leave requests for a given month
@app.route("/api/operators/leaves/<string:month>", methods=["GET"])
def operator_leaves(month):
    table_map = {
        "january": "leave_requests_january",
        "february": "leave_requests_february"
        # add more months if needed
    }
    if month not in table_map:
        return jsonify({"error": f"Invalid month '{month}'"}), 400

    df = run_query(f"SELECT * FROM {table_map[month]}")
    if df is None or df.empty:
        return jsonify({"error": f"No leave requests found for {month}"}), 404
    return jsonify(df.to_dict(orient="records"))


# ─── INVENTORY APIs (SQL Version) ──────────────────────────────


@app.route("/api/inventory/<dataset>")
def inventory_data(dataset):
    table_map = {
        "stock_levels": "stock_levels",
        "stock_levels_updated": "stock_levels_updated",
        "alerts": "inventory_alerts",
        "bom": "bom_data",
        "mrp_plan": "mrp_plan",
        "production_orders": "production_orders",
        "schedule": "production_schedule",
        "reorder": "reorder_point_data"
    }
    if dataset not in table_map:
        return jsonify({"error": f"Invalid dataset '{dataset}'"}), 400
    try:
        df = run_query(f"SELECT * FROM {table_map[dataset]}")
        if df is None or df.empty:
            return jsonify({"error": f"No data found for '{dataset}'"}), 404
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── PROCUREMENT APIs (SQL Version) ────────────────────────────

@app.route("/api/procurement/insights")
def all_procurement_insights():
    try:
        df = run_query("SELECT * FROM smart_procurement_insights")
        if df is None or df.empty:
            return jsonify({"error": "No procurement insights found"}), 404
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/procurement/insight/<sku_id>")
def procurement_insight_by_sku(sku_id):
    try:
        df = run_query("SELECT * FROM smart_procurement_insights")
        if df is None or df.empty:
            return jsonify({"error": "No procurement insights data available"}), 404

        match = df[df["SKU_ID"].str.lower() == sku_id.lower()]
        if match.empty:
            return jsonify({"message": f"No insight found for SKU {sku_id}"}), 404
        return jsonify(match.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# ───────────────────────────────
# SUPPLIER SECTION
# ───────────────────────────────

# Get all suppliers
@app.route("/api/suppliers", methods=["GET"])
def get_suppliers():
    df = run_query("SELECT * FROM suppliers")
    if df is None or df.empty:
        return jsonify({"error": "No suppliers found"}), 404
    return jsonify(df.to_dict(orient="records"))


# Get supplier by SKU_No
@app.route("/api/suppliers/<string:sku_no>", methods=["GET"])
def get_supplier_by_sku(sku_no):
    query = f"SELECT * FROM suppliers WHERE SKU_No = '{sku_no}'"
    df = run_query(query)
    if df is None or df.empty:
        return jsonify({"error": f"No supplier found for SKU_No {sku_no}"}), 404
    return jsonify(df.to_dict(orient="records"))


# Get AI supplier insights by SKU_No
@app.route("/api/suppliers/insights/<string:sku_no>", methods=["GET"])
def get_supplier_ai_insights(sku_no):
    query = f"SELECT * FROM ai_supplier_insight_output WHERE SKU_No = '{sku_no}'"
    df = run_query(query)
    if df is None or df.empty:
        return jsonify({"error": f"No AI insights found for SKU_No {sku_no}"}), 404
    return jsonify(df.to_dict(orient="records"))


# Get alternate suppliers for a given SKU_No
@app.route("/api/suppliers/alternate/<string:sku_no>", methods=["GET"])
def get_alternate_suppliers(sku_no):
    query = f"SELECT * FROM alternate_suppliers WHERE SKU_No = '{sku_no}'"
    df = run_query(query)
    if df is None or df.empty:
        return jsonify({"error": f"No alternate suppliers found for SKU_No {sku_no}"}), 404
    return jsonify(df.to_dict(orient="records"))




# ──────────────────────────────────────────────
# WebSocket endpoint for real-time scheduling data  
# Usage: ws://localhost:5000/ws/scheduling/date_range?start=2018-01-01&end=2018-01-31&interval=10
# ──────────────────────────────────────────────
@sock.route("/ws/scheduling/date_range")
def ws_scheduling_by_range(ws):
    qs = ws.environ.get("QUERY_STRING", "")
    params = parse_qs(qs)

    # Parse start and end dates
    start_str = (params.get("start", [""])[0] or "").strip()
    end_str = (params.get("end", [""])[0] or "").strip()

    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
    except ValueError:
        safe_send(ws, json.dumps({"error": "invalid_date", 
                                  "hint": "Use format YYYY-MM-DD for start and end"}))
        return

    interval = parse_interval(qs, 10)  # Default 10 seconds

    try:
        current_date = start_date
        while current_date <= end_date:
            # Generate mock real-time scheduling data
            payload = {
                "date": current_date.isoformat(),
                "forecasted_demand": {
                    "blue_pump": 85 + (hash(str(current_date)) % 20),
                    "green_pump": 70 + (hash(str(current_date)) % 15), 
                    "orange_pump": 65 + (hash(str(current_date)) % 10),
                },
                "production_orders": [
                    {
                        "Order_ID": f"PO_{current_date.strftime('%Y%m%d')}_001",
                        "Product_Name": "Blue Pump",
                        "Quantity": 10 + (hash(str(current_date)) % 5),
                        "Status": "In Progress"
                    }
                ],
                "production_schedule": [
                    {
                        "Station_Name": f"Station_{1 + (hash(str(current_date)) % 3)}",
                        "Operator_Name": f"Operator_{1 + (hash(str(current_date)) % 5)}",
                        "Product_Name": ["Blue Pump", "Green Pump", "Orange Pump"][hash(str(current_date)) % 3],
                        "Scheduled_Time": datetime.now().strftime("%H:%M:%S"),
                        "Status": "Active"
                    }
                ],
                "total_qty_scheduled": 50 + (hash(str(current_date)) % 30),
                "station_schedule_shift_a": [],
                "station_schedule_shift_b": [],
                "ts": datetime.utcnow().isoformat() + "Z",
            }

            if not safe_send(ws, json.dumps(payload)):
                break  # Stop streaming if the client disconnects

            # Move to next date and wait
            current_date += timedelta(days=1)
            time.sleep(interval)

    except Exception as e:
        safe_send(ws, json.dumps({"error": str(e), "trace": traceback.format_exc()}))


# ──────────────────────────────────────────────
# Run Flask App
# ──────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
