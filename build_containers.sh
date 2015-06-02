#!/bin/bash
COMPONENTS='db broker storage session-manager freeplane-converter ui'

function checkForUpdate () {
#	set -x
	NAME=$1
	if [ ! -d $NAME ]; then 
	    RETVAL=1;
        else
	    cd $NAME
	    if `git status -uall |grep 'nothing to commit' >/dev/null`; then
		LOCAL=$(git rev-parse @)
		REMOTE=$(git rev-parse @{u})
		BASE=$(git merge-base @ @{u})

		if [ $LOCAL = $REMOTE ]; then
		    RETVAL=0;
		elif [ $LOCAL = $BASE ]; then
		    RETVAL=1;
		elif [ $REMOTE = $BASE ]; then
		    RETVAL=2;
		else
		    RETVAL=3;
		fi
	    else
		RETVAL=2;
	    fi
	    cd ..
	fi
	return $RETVAL
}

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

# Moved interactive part here for later use
function interactive () {
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
  *)
      REBUILD=''
  ;;
esac
}

while [[ $# > 0 ]]; do
    key="$1"

    case $key in
	-a|--all)
	    echo "Forcing to rebuild everything"
	    ALL=true
	;;
	-i|--interactive)
	    echo "Entering interactive mode"
	;;
	-m|--module)
	    MODULE="$2"
	    shift # past argument
	;;
	*)
            # unknown option
	    echo -e "Valid parameters are:
    -a|--all: force everything
    -i|--interactive: Use interactive shell
    -m|--module: build specific module only (shortcuts from interactive shell)
"
	    exit
	;;
    esac
    shift # past argument or value
done


COMPONENTS='db session-manager broker ui freeplane-converter'

if [ ! $ALL ]; then 
    for i in $COMPONENTS; do
	checkForUpdate $i
	STATUS=$?
	if [[ $STATUS -eq '0' ]]; then
	    status='OK';
	elif [[ $STATUS -eq '1' ]]; then
	    status='NEED UPDATE';
	    PULL="${PULL} $i"
	elif [[ $STATUS == 2 ]]; then
	    status='NEED COMMIT';
	    PUSH="${PUSH} $i"
	elif [[ $STATUS == 3 ]]; then
	    status='DIVERGED';
	    MERGE="${MERGE} $i"
	fi
	echo "Checking $i: $status"
    done

    if [ -n "$PULL" ]; then echo "These projects need pull/clone: $PULL"; fi
    if [ -n "$PUSH" ]; then echo "These projects need commit/push: $PUSH"; fi
    if [ -n "$MERGE" ]; then echo "These projects need merge: $MERGE"; fi

else
    PUSH=$COMPONENTS
fi

MODIFIED="${PULL} ${PUSH} ${MERGE}"

if [ -n "${PUSH}${MERGE}" ]; then
    read -N1 -p 'Force rebuild? (yN)' res
    echo -e '\n'

    case $res in
	'y')
	    REBUILD='YES'
	;;
	*)
	    exit
	;;
    esac
fi

# Remove all modified components
for i in $MODIFIED; do
	docker stop mw-$i-1
	docker rm mw-$i-1
done

# Rebuild components if needed
if [[ -n $MODIFIED ]] ; then
	for i in $MODIFIED; do rebuildComponent $i;  done
fi

# Perform container specific creation
for i in $MODIFIED; do
    cd $i
    ./docker_create.sh
    cd -
done

# Start all components
for i in $MODIFIED; do
	docker start mw-$i-1
done

