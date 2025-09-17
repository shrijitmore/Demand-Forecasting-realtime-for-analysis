// src/components/GanttChart.jsx
import React, { useState, useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css'; // Import the required CSS

const GanttChart = () => {
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('Day');
  const ganttRef = useRef(null);
  const ganttInstance = useRef(null);

  useEffect(() => {
    fetch('/api/schedule/gantt')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
      .then(data => setTasks(data || []))
      .catch(err => console.error("Error fetching Gantt data:", err));
  }, []);

  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      // Destroy the old instance if it exists to prevent memory leaks
      if (ganttInstance.current) {
        ganttInstance.current.destroy();
      }

      // Create a new Gantt chart instance
      ganttInstance.current = new Gantt(ganttRef.current, tasks, {
        header_height: 65,
        column_width: 35,
        bar_height: 25,
        bar_corner_radius: 4,
        padding: 18,
        view_mode: viewMode,
        on_click: (task) => {
          console.log("Task clicked:", task);
        },
      });
    }
  }, [tasks, viewMode]); // Re-render the chart if tasks or viewMode change

  // Function to change the view mode
  const changeViewMode = (mode) => setViewMode(mode);

  return (
    <div>
      <div className="mb-4">
        <span className="mr-2 font-bold">View Mode:</span>
        <button className="p-2 mr-2 border rounded" onClick={() => changeViewMode('Quarter Day')}>Quarter Day</button>
        <button className="p-2 mr-2 border rounded" onClick={() => changeViewMode('Half Day')}>Half Day</button>
        <button className="p-2 mr-2 border rounded" onClick={() => changeViewMode('Day')}>Day</button>
        <button className="p-2 mr-2 border rounded" onClick={() => changeViewMode('Week')}>Week</button>
        <button className="p-2 mr-2 border rounded" onClick={() => changeViewMode('Month')}>Month</button>
      </div>
      <div className="gantt-container overflow-auto">
        {tasks.length > 0 ? (
          <svg ref={ganttRef}></svg>
        ) : (
          <p>Loading schedule or no data available.</p>
        )}
      </div>
    </div>
  );
};

export default GanttChart;