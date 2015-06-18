#!/bin/bash
## This snippet is used by the build script to create container specific to the project

docker create -P --name mw-db-$TYPE mindweb/db

exit
echo "Starting db and trying to connect to it"
docker start mw-db-$TYPE


# Initialize db
until docker run -it --link mw-db-$TYPE:cassandra --rm --volume `pwd`/scripts:/scripts cassandra sh -c 'exec cqlsh "$CASSANDRA_PORT_9042_TCP_ADDR" -f /scripts/init_sessions.cql'
do 
	echo "Retrying in 1 sec"
	sleep 1
done

docker stop mw-db-$TYPE
