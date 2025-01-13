import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TemperatureChartProps {
  data: { timestamp: number; value: number }[];
}

const TemperatureChart: React.FC<TemperatureChartProps> = ({ data }) => {
  // Преобразование данных для графика
  const chartData = data.map((item) => ({
    time: new Date(item.timestamp * 1000).toLocaleTimeString(),
    value: parseFloat(item.value.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#4f46e5"
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TemperatureChart;
