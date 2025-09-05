FROM prom/prometheus:v2.36.0

# Установка curl для health checks и API calls
USER root
RUN apk add --no-cache curl

# Создание директорий для конфигурации
RUN mkdir -p /etc/prometheus/targets /etc/prometheus/alerts

# Копирование базовой конфигурации
COPY prometheus.yml /etc/prometheus/
COPY alertmanager.yml /etc/prometheus/
COPY targets/ /etc/prometheus/targets/
COPY alerts/ /etc/prometheus/alerts/

# Установка правильных прав доступа
RUN chown -R prometheus:prometheus /etc/prometheus

# Возврат к пользователю prometheus
USER prometheus

# Expose порт для API
EXPOSE 9090

# Команда запуска с включенным lifecycle API
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus", \
     "--web.console.libraries=/usr/share/prometheus/console_libraries", \
     "--web.console.templates=/usr/share/prometheus/consoles", \
     "--web.enable-lifecycle", \
     "--web.enable-admin-api"]