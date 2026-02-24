FROM alpine:latest

# Install FreeRADIUS, PostgreSQL driver and dos2unix
RUN apk add --no-cache \
    freeradius \
    freeradius-postgresql \
    freeradius-utils \
    dos2unix

# Copy config files from host
COPY config/radius/clients.conf /etc/raddb/clients.conf
COPY config/radius/mods-enabled/sql /etc/raddb/mods-enabled/sql

# Fix permissions and line endings
# dos2unix ensures LF line endings (fixing Windows mount issues)
RUN dos2unix /etc/raddb/clients.conf /etc/raddb/mods-enabled/sql && \
    chown root:radius /etc/raddb/clients.conf /etc/raddb/mods-enabled/sql && \
    chmod 640 /etc/raddb/clients.conf /etc/raddb/mods-enabled/sql

# Run FreeRADIUS in foreground
CMD ["radiusd", "-f", "-X"]
