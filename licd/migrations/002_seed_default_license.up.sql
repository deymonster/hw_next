-- Seed default active license with 50 agents if table empty
INSERT INTO license_info (
    install_id,
    license_key,
    customer_data,
    encrypted_data,
    server_signature,
    last_heartbeat_at,
    key_version,
    max_agents,
    expires_at,
    status,
    hardware_hash
)
SELECT
    'seeded-default-install',
    NULL,
    NULL,
    X'',
    NULL,
    NULL,
    1,
    50,
    NULL,
    'active',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM license_info);