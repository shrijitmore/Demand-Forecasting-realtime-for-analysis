# Supply Chain Management Dashboard

A comprehensive React-based dashboard for supply chain management with real-time data visualization and analytics.

## 🚀 Features

- **Forecast Demand**: Product demand forecasting with weekly/monthly/quarterly views
- **Historical Sales**: Sales analytics with KPIs, regional performance, and category distribution
- **Inventory & Procurement**: Stock levels, reorder points, lead times, and supplier alerts
- **Production Scheduling**: Operator workload, station distribution, and attendance tracking
- **Supplier Performance**: Supplier KPIs, delivery performance, and alternate suppliers

## 🛠️ Setup

### Prerequisites
- Node.js (v16 or higher)
- Your Express.js backend running on port 3000

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Ensure your Express.js backend is running:**
   ```bash
   # In your backend directory
   node server.js
   ```

## 🔧 API Integration

The frontend is fully integrated with your Express.js backend APIs:

### Available Endpoints
- **Forecast APIs**: `/api/forecasts`, `/api/forecasts/weekly`, `/api/forecasts/monthly`, `/api/forecasts/quarterly`
- **Sales APIs**: `/api/sales/kpis`, `/api/sales/{metric}`
- **Inventory APIs**: `/api/inventory/kpis`, `/api/inventory/{dataset}`
- **Scheduling APIs**: `/api/kpis`, `/api/schedule`, `/api/attendance`
- **Supplier APIs**: `/api/suppliers/list`, `/api/suppliers/{endpoint}/{supplier}`

### Debug Mode
In development mode, a yellow "Debug API" button appears in the top-right corner to test API connectivity.

## 📊 Data Visualization

- **Charts**: Line charts, bar charts, pie charts using Recharts
- **KPIs**: Real-time key performance indicators
- **Tables**: Detailed data tables with export functionality
- **Responsive Design**: Works on desktop and mobile devices

## 🎨 UI Components

Built with:
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** for components
- **Recharts** for data visualization
- **Lucide React** for icons

## 🔍 Troubleshooting

### API Connection Issues
1. Ensure your Express.js backend is running on `http://localhost:3000`
2. Check the browser console for API errors
3. Use the "Debug API" button to test endpoint connectivity
4. Verify CORS is enabled on your backend

### Common Issues
- **400 Bad Request**: Check if the API endpoint exists in your backend
- **CORS Errors**: Ensure your backend allows requests from the frontend
- **Data Not Loading**: Check the browser network tab for failed requests

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── lib/                # Utilities and API functions
├── types/              # TypeScript type definitions
└── App.tsx            # Main application component
```

## 🚀 Deployment

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Serve the built files:**
   ```bash
   npm run preview
   ```

## 📝 API Documentation

For detailed API documentation, refer to your Express.js backend code. The frontend automatically adapts to available endpoints and provides fallbacks for missing data.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
