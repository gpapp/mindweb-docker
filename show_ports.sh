#!/bin/bash
function showType {
TYPE=$1
echo "DB:$(docker port mw-db-${TYPE} |grep 9042)"
echo "Ports for $TYPE"
echo "DB:$(docker port mw-db-${TYPE} |grep 9042)"
echo "SESSION:$(docker port mw-session-manager-${TYPE} | grep 2000)"
echo "STORAGE:$(docker port mw-storage-${TYPE} | grep 2001)"
echo "FILE:$(docker port mw-file-${TYPE} | grep 2003)"
echo "BROKER:$(docker port mw-broker-${TYPE} | grep 8080)"
echo "UI:$(docker port mw-ui-${TYPE} |grep 80)"
}

echo "registry:$(docker port mw-registry )"
TYPE=$1
if [ -z "$TYPE" ]; then
  TYPE='DEV'
fi
showType $TYPE
