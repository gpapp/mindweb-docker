#!/bin/bash
## This snippet is used by the build script to create container specific to the project

docker create -P --name mw-file-$TYPE \
    --link mw-storage-$TYPE:storage \
    --volume `pwd`/../.config/$TYPE/file:/home/node/config \
  mindweb/file


if [ ! -f  ../.config/$TYPE/file/config.json ]; then 
  mkdir -p ../.config/$TYPE/file
  cp config/config.json ../.config/$TYPE/file/config.json
fi
