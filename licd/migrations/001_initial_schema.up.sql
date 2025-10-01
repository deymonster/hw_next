-- Основная информация о лицензии
CREATE TABLE license_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    install_id TEXT UNIQUE NOT NULL,
    license_key TEXT,
    customer_data TEXT, -- JSON строка с данными клиента (ИНН, реквизиты)
    encrypted_data BLOB, -- Зашифрованные данные лицензии
    server_signature TEXT, -- Подпись сервера
    last_heartbeat_at DATETIME,
    key_version INTEGER DEFAULT 1,
    max_agents INTEGER DEFAULT 0,
    expires_at DATETIME,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    hardware_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Активированные агенты
CREATE TABLE activations (
    agent_key TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    labels JSON,
    activation_sig TEXT,
    hardware_hash TEXT,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Аудит лог
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate', 'heartbeat', 'validate', 'license_check')),
    agent_key TEXT,
    ip TEXT,
    user_agent TEXT,
    result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'denied')),
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_activations_ip ON activations(ip);
CREATE INDEX idx_activations_updated_at ON activations(updated_at);
CREATE INDEX idx_activations_last_seen_at ON activations(last_seen_at);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_agent_key ON audit_log(agent_key);
CREATE INDEX idx_license_info_install_id ON license_info(install_id);
CREATE INDEX idx_license_info_status ON license_info(status);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_license_info_updated_at
    AFTER UPDATE ON license_info
    FOR EACH ROW
BEGIN
    UPDATE license_info SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_activations_updated_at
    AFTER UPDATE ON activations
    FOR EACH ROW
BEGIN
    UPDATE activations SET updated_at = CURRENT_TIMESTAMP WHERE agent_key = NEW.agent_key;
END;