#!/bin/sh
IP=$(ip addr show dev eth0 | awk '/inet / {print $2}'| cut -d/ -f1)
VALUE='{"name":"db","path":"__DUMMY__","authorized":false,"host":"'$IP'","port":"'${DB_PORT}'"}'
watch -n5 -x curl http://192.168.1.20:2379/v2/keys/mindweb/${TYPE}/services/db -XPUT \
  -d ttl=5 \
  -d value=${VALUE}