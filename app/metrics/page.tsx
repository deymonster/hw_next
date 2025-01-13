"use client";

import React, {useState} from "react";
import { usePrometheusMetrics } from "@/hooks/usePrometheusMetrics";
import { usePrometheusRangeMetrics } from "@/hooks/usePrometheusRangeMetrics";
import TemperatureChart from "@/components/charts/TemperatureChart";
import { Button } from "@/components/ui/button";


const MetricsPage: React.FC = () => {
  const { data, loading, error } = usePrometheusMetrics("192.168.13.179:9182");

  const [showChart, setShowChart] = useState(false);
  const [range, setRange] = useState<number>(3600);
  const [step, setStep] = useState<string>("15s");
  
  const now = Math.floor(Date.now() / 1000);
  
  // Хук для получения данных графика
  const { data: rangeData, loading: rangeLoading, error: rangeError } = usePrometheusRangeMetrics(
    "cpu_temperature",
    now - range,
    now,
    step
  );

   // Обработчик для изменения временного диапазона
   const handleRangeChange = (newRange: number) => {
    setRange(newRange);
  };

  // Обработчик для изменения шага
  const handleStepChange = (increment: boolean) => {
    const steps = ["15s", "30s", "1m", "5m", "10m"];
    const currentIndex = steps.indexOf(step);
    const newIndex = increment ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < steps.length) {
      setStep(steps[newIndex]);
    }
  };

  const handleShowChart = () => {
    setShowChart(true);
  };

  if (loading) return <p>Loading metrics...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Metrics</h1>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Processor</h2>
        <p>{data?.processor}</p>

        <Button
          onClick={handleShowChart}
          className="mt-2 p-2 bg-blue-500 text-white rounded"
        >
          Show Temperature Chart
        </Button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">BIOS Information</h2>
        <p>Manufacturer: {data?.bios.manufacturer}</p>
        <p>Release Date: {data?.bios.releaseDate}</p>
        <p>Version: {data?.bios.version}</p>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">CPU Usage</h2>
        <p>{data?.cpuUsage}%</p>
      </div>

      {showChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowChart(false)}
        >

          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >

            <h3 className="text-lg font-semibold mb-4">CPU Temperature Chart</h3>

            <button
              onClick={() => setShowChart(false)}
              className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded"
            >
              Close
            </button>

            <div className="mb-4">
              <label className="block mb-2 font-semibold">Time Range:</label>
              <select
                onChange={(e) => handleRangeChange(parseInt(e.target.value))}
                value={range}
                className="p-2 border rounded w-full"
              >
                <option value={3600}>Last 1 hour</option>
                <option value={21600}>Last 6 hours</option>
                <option value={86400}>Last 24 hours</option>
                <option value={604800}>Last 7 days</option>
              </select>
            </div>



            <div className="mb-4">
              <label className="block mb-2 font-semibold">Step (Resolution):</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStepChange(false)}
                  className="p-2 bg-gray-200 rounded text-lg"
                >
                  -
                </button>
                <span>{step}</span>
                <button
                  onClick={() => handleStepChange(true)}
                  className="p-2 bg-gray-200 rounded text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {rangeLoading ? (
              <p>Loading chart...</p>
            ) : rangeError ? (
              <p className="text-red-600">{rangeError}</p>
            ) : (
              <TemperatureChart data={rangeData || []} />
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MetricsPage;
