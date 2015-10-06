#!/bin/bash
COMPONENTS='ui server'

function rebuildComponent () {
        NAME=$1
	cd $NAME
	git pull
	cd -
	docker build -t mindweb/$NAME $NAME
}

function resolve_module () {
    res=$1
    case $res in
    	'A') echo $COMPONENTS
    	;;
    	'n')
    	    echo 'nodejs-base'
    	;;
    	'd')
    	    echo 'db'
    	;;
    	'u')
    	    echo 'ui'
    	;;
    	's')
    	    echo 'server'
    	;;
    	*)
    	    echo -e "\n\nInvalid value selected: $res"
    	    return 1
    	;;
    esac
    return 0
}

function help() {
    echo "
Usage mindweb.sh <command> <options>
    Valid commands are:
    start - start all containers
    restart - start all containers
    stop - stop all containers
    build - build modules
    init-docker - initialize docker repository
    init-db - intitialize database
    help - this help"
}

function help_build () {
    echo -e "
Valid build parameters are:
    -a|--all: force everything
    -i|--interactive: Use interactive shell
    -t|--type:   Type of build (defaults to dev)
    -hp|--http-port: The port for the server to listen to (defaults to 8082)
    -sp|--server-port: The port for the server to listen to (defaults to 8083)
    -dp|--db-port: The port for the db to listen to (defaults to 9042)
    -m|--module: build specific module only (shortcuts from interactive shell)"
}

export TYPE='DEV'
export HTTP_PORT='8082'
export SERVER_PORT='8083'
export DB_PORT='9042'

if [[ $# == 0 ]]; then
  help
  exit
fi

CMD=$1
shift

BUILD=0
START=0
STOP=0

case $CMD in
    start)
	echo "Starting services"
	MANUAL=1
	PUSH=$COMPONENTS
	START=1
	;;
    restart)
	echo "Starting services"
	MANUAL=1
	PUSH=$COMPONENTS
	STOP=1
	START=1
	;;
    stop)
	echo "Stopping services"
	MANUAL=1
	PUSH=$COMPONENTS
	STOP=1
	;;
    init-docker)
	echo "Initializing docker images"
	docker rmi -f mindweb/nodejs-base
	docker build -t mindweb/nodejs-base nodejs-base 
	docker rmi -f mindweb/webserver-base
	docker build -t mindweb/webserver-base webserver-base
	exit
    ;;
    init-db)
	echo "Initializing db"
	MANUAL=1
	PUSH='db'
    ;;
    build)
	STOP=1
	BUILD=1
	START=1
	;;
    *)
	help
	exit
esac
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
	-t|--type)
	    TYPE="$2"
	    shift
	;;
	-hp|--http-port)
	    HTTP_PORT="$2"
	    shift
	;;
	-sp|--server-port)
	    SERVER_PORT="$2"
	    shift
	;;
	-dp|--db-port)
	    DB_PORT="$2"
	    shift
	;;
	-m|--module)
	    MANUAL=1
    	    PUSH=$(resolve_module $2)
	    if [[ $? == 1 ]]; then
	        echo $PUSH
	        exit
	    fi
	    shift # past argument
	;;
	*)
            # unknown option
	    help_build
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
    REBUILD=$PULL
fi
if [ $INTERACTIVE ]; then
    echo 'What should I rebuild?'
    echo -e '\tA - All modules'
    echo -e '\td - db'
    echo -e '\tu - UI'
    echo -e '\ts - server component'
    read -N1 -p '(Adus)' res
    echo -e '\n'

    PUSH=$(resolve_module $res)
    if [[ $? == 1 ]]; then
        echo $PUSH
        exit
    fi 
fi

MODIFIED="${PULL} ${PUSH} ${MERGE}"

if [ -n "${PUSH}${MERGE}" ] && [[ $BUILD == 1 ]]; then
    echo "Building modules: ${PUSH}${MERGE}"
    read -N1 -p 'Force rebuild? (yN)' res
    echo -e '\n'

    case $res in
    	'y') REBUILD=$MODIFIED ;;
    	*)   REBUILD=''; ;;
    esac
fi

DEP_CHAIN=$MODIFIED

# Stop all dependents
if [[ $STOP == 1 ]]; then
    for i in $DEP_CHAIN; do
	echo "Stopping container:" $i
	docker stop mw-$i-$TYPE >/dev/null
    done
fi

if [[ $BUILD == 1 ]]; then
    for i in $DEP_CHAIN; do
	echo "Removing container:" $i
	docker rm mw-$i-$TYPE >/dev/null
    done
    # Rebuild components if needed
    for i in $REBUILD; do rebuildComponent $i;  done

    # Perform container specific creation
    for i in $DEP_CHAIN; do
	echo Creating container $i
	cd $i
	./docker_create.sh >/dev/null
        cd -
    done
fi

if [[ $START == 1 ]]; then
    # Start all components
    for i in $DEP_CHAIN; do
	    echo "Starting container:" $i
	    docker start mw-$i-$TYPE >/dev/null
    done
fi

echo "Cleaning up untaged images"
UNTAGED=$(docker images|awk '{if (/^<none>/) {print $3}}')
if [ -n "$UNTAGED" ]; then
    docker rmi $UNTAGED
fi
