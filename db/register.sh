#!/bin/sh
/docker-entrypoint.sh cassandra &
IP=$(ip addr show dev eth0 | awk '/inet / {print $2}'| cut -d/ -f1)
VALUE='{"name":"db","path":"__DUMMY__","authorized":false,"host":"'$IP'","port":"'${DB_PORT}'"}'
while true; do
    curl http://192.168.1.20:2379/v2/keys/mindweb/${TYPE}/services/db -XPUT \
        -d ttl=10 \
        -d value=${VALUE}
    sleep 5
done