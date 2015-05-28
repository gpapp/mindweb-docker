#!/bin/bash
COMPONENTS='db broker storage session-manager freeplane-converter'
COMPONENTS='db session-manager mw-broker'

docker rm mw-db-1
docker rm mw-broker-1
docker rm mw-session-manager-1
docker rm mw-storage-1

for i in $COMPONENTS; do 
	rm -rf $i
	git clone ssh://git@dev.itworks.hu:2022/MindWeb/$i.git
	docker rmi mindweb/$i

	docker build -t mindweb/$i $i

done

docker create -P --name mw-db-1 mindweb/db
docker create -P --name mw-session-manager-1 --link mw-db-1:db mindweb/session-manager
#docker create -P --name mw-storage-1 --link mw-db-1:db mindweb/storage
#docker create -P --name mw-freeplane-converter-1 mindweb/freeplane-converter

docker create -P --name mw-broker-1 \
    --link mw-session-manager-1:session-manager \
    mindweb/broker
#    --link mw-storage-1:storage \
#    --link mw-freeplane-converter-1:freeplane-converter \

