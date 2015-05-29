#!/bin/bash
COMPONENTS='db broker storage session-manager freeplane-converter ui'

function rebuildComponent () {
        NAME=$1

	if [ ! -d $NAME ]; then 
	  git clone ssh://git@dev.itworks.hu:2022/MindWeb/$NAME.git
        else
          cd $NAME
          git pull
          cd ..
        fi
	docker rmi mindweb/$NAME
	docker build -t mindweb/$NAME $NAME
}

echo 'What should I rebuild?'
echo -e '\tA - All modules'
echo -e '\tb - Broker'
echo -e '\td - db'
echo -e '\tm - session-manager'
echo -e '\tu - UI'
echo -e '\ts - storage service (MISSING)'
echo -e '\tf - converter service (MISSING)'
read -N1 -p '(Abdmsf)' res
echo -e '\n'

case $res in
	'A') COMPONENTS='db session-manager broker ui'
	;;
	'b')
	    COMPONENTS='broker'
	;;
	'd')
	    COMPONENTS='db'
	;;
	'm')
	    COMPONENTS='session-manager'
	;;
	'u')
	    COMPONENTS='ui'
	;;
	's')
	    COMPONENTS='storage'
	;;
	'f')
	    COMPONENTS='freeplane-converter'
	;;
	*)
	    echo -e"\n\nInvalid value selected: $res"
	    exit
	;;
esac
read -N1 -p 'Rebuild (b) or recreate (C)' res
echo -e '\n'

case $res in 
  'b')
      REBUILD='NO'
  ;;
  '*')
      REBUILD=''
  ;;
esac

for i in $COMPONENTS; do
	docker stop mw-$i-1
	docker rm mw-$i-1
        if [[ -n $REBUILD ]] ; then rebuildComponent $i; fi
	case $i in
	  'db')
             docker create -P --name mw-db-1 mindweb/db
          ;;
	  'session-manager')
	    docker create -P --name mw-session-manager-1 \
	      --link mw-db-1:db \
	      mindweb/session-manager
	  ;;
	  'ui')
	    docker create -P --name mw-ui-1 \
              --link mw-broker-1:broker \
              mindweb/ui
	  ;;
	  'storage')
	    docker create -P --name mw-storage-1 --link mw-db-1:db mindweb/storage
	  ;;
	  'freeplane-converter')
            docker create -P --name mw-freeplane-converter-1 mindweb/freeplane-converter
	  ;;
	  'broker')
	    docker create -P -p 192.168.1.20:8080:8080 --name mw-broker-1 \
	        --link mw-session-manager-1:session-manager \
	        --link mw-ui-1:ui \
	        mindweb/broker
#	        --link mw-storage-1:storage \
#	        --link mw-freeplane-converter-1:freeplane-converter \
	   ;;
	esac
        docker start mw-$i-1
done



