FROM apache/nifi:1.23.2

# Tải PostgreSQL JDBC driver để NiFi kết nối được với các PostgreSQL DB
USER root
RUN wget -q https://jdbc.postgresql.org/download/postgresql-42.7.3.jar \
    -O /opt/nifi/nifi-current/lib/postgresql-42.7.3.jar

USER nifi
