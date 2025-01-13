import { useState, useEffect } from "react";
import axios from "axios";

const PROMETHEUS_BASE_URL = "http://localhost:9090";

interface RangeMetric {
  timestamp: number;
  value: number;
}

export const usePrometheusRangeMetrics = (
  query: string,
  start: number,
  end: number,
  step: string
): { data: RangeMetric[] | null; loading: boolean; error: string | null } => {
  const [data, setData] = useState<RangeMetric[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRangeMetrics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${PROMETHEUS_BASE_URL}/api/v1/query_range`, {
          params: {
            query,
            start,
            end,
            step,
          },
        });

        const result = response.data.data.result[0]?.values || [];

        const formattedData = result.map(([timestamp, value]: [number, string]) => ({
          timestamp,
          value: parseFloat(value),
        }));

        setData(formattedData);
        setError(null);
      } catch (err) {
        setError("Failed to fetch range metrics from Prometheus.");
      } finally {
        setLoading(false);
      }
    };

    fetchRangeMetrics();
  }, [query, start, end, step]);

  return { data, loading, error };
};
