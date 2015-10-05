#!/bin/bash
## This snippet is used by the build script to create container specific to the project
docker create \
    -P -p 0.0.0.0:$HTTP:8082 \
    --env TYPE=${TYPE} \
    --volume `pwd`/../.config/$TYPE/server:/home/node/config \
    --name mw-server-$TYPE \
    mindweb/server

if [ ! -f  ../.config/$TYPE/server/config.json ]; then 
  mkdir -p ../.config/$TYPE/server
  cp config/config.json ../.config/$TYPE/server/config.json
fi
