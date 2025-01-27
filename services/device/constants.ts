export const CONFIG = {
    METRICS_PORT: Number(process.env.METRICS_PORT) || 9182,
    HANDSHAKE_KEY: process.env.AGENT_HANDSHAKE_KEY || 'VERY_SECRET_KEY',
    PROMETHEUS_TARGETS_PATH:
      '/Users/deymonster/My projects/HW monitor NextJS/hw-monitor/prometheus/targets/windows_targets.json',
    PROMETHEUS_RELOAD_URL: 'http://localhost:9090/-/reload',
  };