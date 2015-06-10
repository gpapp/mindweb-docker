#!/bin/bash
COMPONENTS='db storage session-manager freeplane-converter ui broker'

function checkForUpdate () {
	NAME=$1
	if [ ! -d $NAME ]; then 
	    RETVAL=1;
        else
	    cd $NAME
	    git remote update >/dev/null
	    if `git status -uall |grep 'nothing to commit' >/dev/null`; then
		LOCAL=$(git rev-parse @)
		REMOTE=$(git rev-parse origin/master)
		BASE=$(git merge-base @ origin/master)

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

function resolve_module () {
    res=$1
    case $res in
    	'A') echo 'db session-manager broker ui'
    	;;
    	'b')
    	    echo 'broker'
    	;;
    	'd')
    	    echo 'db'
    	;;
    	'm')
    	    echo 'session-manager'
    	;;
    	'u')
    	    echo 'ui'
    	;;
    	's')
    	    echo 'storage'
    	;;
    	'f')
    	    echo 'freeplane-converter'
    	;;
    	*)
    	    echo -e "\n\nInvalid value selected: $res"
    	    return 1
    	;;
    esac
    return 0
}

# Moved interactive part here for later use
function interactive () {
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
	    MANUAL=1
        PUSH=$COMPONENTS
	;;
	-i|--interactive)
	    echo "Entering interactive mode"
	    MANUAL=1
	    INTERACTIVE=1
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

if [ ! $MANUAL ]; then 
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
fi
if [ $INTERACTIVE ]; then
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

    PUSH=$(resolve_module $res)
    if [[ $? == 1 ]]; then
        echo $PULL
        exit
    fi 
fi

MODIFIED="${PULL} ${PUSH} ${MERGE}"

if [ -n "${PUSH}${MERGE}" ]; then
    read -N1 -p 'Force rebuild? (yN)' res
    echo -e '\n'

    case $res in
    	'y') REBUILD=$MODIFIED ;;
    	*)   REBUILD=''; ;;
    esac
fi

# Remove all modified components
for i in $MODIFIED; do
	docker stop mw-$i-1
	docker rm mw-$i-1
done

# Rebuild components if needed
for i in $REBUILD; do rebuildComponent $i;  done

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

