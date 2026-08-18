FROM postgres:16-alpine

RUN apk add --no-cache \
    bash \
    ca-certificates \
    gzip \
    restic \
    tzdata

COPY scripts/vps-backup.sh /usr/local/bin/vps-backup.sh
COPY scripts/backup-loop.sh /usr/local/bin/backup-loop.sh
RUN chmod +x /usr/local/bin/vps-backup.sh /usr/local/bin/backup-loop.sh

ENV TZ=UTC
ENTRYPOINT ["/usr/local/bin/backup-loop.sh"]
