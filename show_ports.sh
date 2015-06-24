#!/bin/bash

echo "DB:$(docker port mw-db-DEV |grep 9042)"
echo "SESSION:$(docker port mw-session-manager-DEV | grep 2000)"
echo "STORAGE:$(docker port mw-storage-DEV | grep 2001)"
echo "CONVERT:$(docker port mw-freeplane-converter-DEV | grep 2002)"
echo "FILE:$(docker port mw-file-DEV | grep 2003)"
echo "BROKER:$(docker port mw-broker-DEV | grep 8080)"
echo "UI:$(docker port mw-ui-DEV |grep 8080)"
