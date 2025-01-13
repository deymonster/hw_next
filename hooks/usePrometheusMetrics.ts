import { useState, useEffect } from "react";
import axios from "axios";

const PROMETHEUS_BASE_URL = "http://localhost:9090"; // Адрес Prometheus

interface PrometheusMetric {
  metric: Record<string, string>;
  value: [number, string];
}

interface CpuMetrics {
  processor: string;
  bios: {
    manufacturer: string;
    releaseDate: string;
    version: string;
  };
  cpuUsage: number;
  temperature: number; // Средняя температура
}

export const usePrometheusMetrics = (instance: string): {
  data: CpuMetrics | null;
  loading: boolean;
  error: string | null;
} => {
  const [data, setData] = useState<CpuMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // Запрос данных из Prometheus
        const response = await axios.get(`${PROMETHEUS_BASE_URL}/api/v1/query`, {
          params: { query: `{instance="${instance}"}` },
        });

        const result: PrometheusMetric[] = response.data.data.result;
        

        // Обработка метрик
        const cpuMetrics: CpuMetrics = {
          processor: "",
          bios: {
            manufacturer: "",
            releaseDate: "",
            version: "",
          },
          cpuUsage: 0,
          temperature: 0,
        };

        let temperatureSensors: number[] = []; // Для сбора температуры с разных сенсоров

        result.forEach((metric) => {
          
          const { __name__, manufacturer, release_date, version, processor } = metric.metric;

          switch (__name__) {
            case "bios_info":
              cpuMetrics.bios = {
                manufacturer: manufacturer || "Unknown",
                releaseDate: release_date || "Unknown",
                version: version || "Unknown",
              };
              break;

            case "cpu_temperature":
              const temp = parseFloat(metric.value[1]);
              
              temperatureSensors.push(temp);
              break;

            case "cpu_usage_percent":
              
              const cpuUsage = parseFloat(metric.value[1]);
              cpuMetrics.cpuUsage = cpuUsage;
              cpuMetrics.processor = processor || "Unknown Processor";
              break;

            default:
              break;
          }
        });

        // Рассчёт средней температуры
        if (temperatureSensors.length > 0) {
          const averageTemperature =
            temperatureSensors.reduce((sum, temp) => sum + temp, 0) / temperatureSensors.length;
          
          cpuMetrics.temperature = parseFloat(averageTemperature.toFixed(2));
        }

        setData(cpuMetrics);
      } catch (err) {
        setError("Failed to fetch metrics from Prometheus.");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [instance]);

  return { data, loading, error };
};
