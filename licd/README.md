# licd (License Control Daemon)

Lightweight HTTP service that:

- Tracks device activations with license limit
- Exposes Prometheus HTTP SD endpoint at `/sd/targets`
- Provides `/license/status`, `/license/activate`, `/license/deactivate`

## Run locally

go run ./cmd/licd

## Endpoints

- GET /license/status
- POST /license/activate {"deviceId","agentKey","ipAddress","port":9182}
- POST /license/deactivate {"deviceId"}
- GET /sd/targets
