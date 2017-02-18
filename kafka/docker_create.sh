#!/bin/bash
## This snippet is used by the build script to create container specific to the project

NAME=mw-kafka-$TYPE

docker create \
    -p 2181:2181 \
    -p $KAFKA_PORT:9092 \
    --env ADVERTISED_HOST="192.168.1.20" \
    --env ADVERTISED_PORT=$KAFKA_PORT \
    --name $NAME \
    spotify/kafka
