#!/bin/bash
## This snippet is used by the build script to create container specific to the project

NAME=$1
NAME=mw-db-$TYPE

docker create \
    -P -p 0.0.0.0:$DB_PORT:9042 \
    --env DB_PORT=${DB_PORT} \
    --env TYPE=${TYPE} \
    --volume `pwd`/../.config/$TYPE/db/data:/var/lib/cassandra/data \
    --volume `pwd`/../.config/$TYPE/db/log:/var/log/cassandra \
    --name $NAME \
    mindweb/db

if [ ! -d  ../.config/$TYPE/db/data ]; then 
  mkdir -p ../.config/$TYPE/db/data
fi

if [ ! -d  ../.config/$TYPE/db/log ]; then 
  mkdir -p ../.config/$TYPE/db/log
fi

exit

echo "Starting db and trying to connect to it"
docker start $NAME

#Wait for DB to accept connections
i=1
while (( $i < 32 )); do
  if [[ `docker run -t --link $NAME:cassandra --rm cassandra sh -c 'exec cqlsh "$CASSANDRA_PORT_9042_TCP_ADDR" -e "describe system"'|grep "CREATE TABLE system.batchlog "` ]]; then
    echo "DB connection validated"
    CAN_START=1;
    break;
  fi
  i=$(( $i * 2 ))
  echo "Database is not available, sleeping for $i seconds"
  sleep $i
done

if [[ $CAN_START == "1" ]]; then
# Initialize db
  docker run -it --link $NAME:cassandra --rm --volume `pwd`/scripts:/scripts cassandra sh -c 'exec cqlsh "$CASSANDRA_PORT_9042_TCP_ADDR" -f /scripts/init_sessions.cql'
fi

docker stop $NAME
