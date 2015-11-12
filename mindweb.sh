#!/bin/bash
COMPONENTS='ui server'

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
    -t|--type:   Type of build (defaults to DEV)
    -hp|--http-port: The port for the server to listen to (defaults to 8082)
    -sp|--server-port: The port for the server to listen to (defaults to 8083)
    -dp|--db-port: The port for the db to listen to (defaults to 9042)
    -m|--module: build specific module only (shortcuts from interactive shell)
    -f: force rebuild"
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
	-t|--type)
	    TYPE="$2"
	    shift
	;;
	-f)
	    FORCE=1
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

MODIFIED="${PULL} ${PUSH} ${MERGE}"

if [ -n "${PUSH}${MERGE}" ] && [[ $BUILD == 1 ]]; then

  if [[ $FORCE == 1 ]]; then
    REBUILD=$MODIFIED
  else
    echo "Building modules: ${PUSH}${MERGE}"
    read -N1 -p 'Force rebuild? (yN)' res
    echo -e '\n'

    case $res in
    	'y') REBUILD=$MODIFIED ;;
    	*)   REBUILD=''; ;;
    esac
  fi
fi

DEP_CHAIN=$MODIFIED

if [[ $BUILD == 1 ]]; then
    # Rebuild components if needed
    for i in $REBUILD; do rebuildComponent $i;  done

    # Perform container specific creation
    for i in $DEP_CHAIN; do
	echo "Creating container $i"
	cd $i
	docker rm mw-$i-$TYPE-tmp >/dev/null
	./docker_create.sh mw-${i}-${TYPE}-tmp >/dev/null
        cd -
    done
fi

    # Check if db runs
    if [[ $(docker ps|grep mw-db-${TYPE}) ]]; then 
      docker start mw-db-${TYPE}
    fi
    # Wait for DB to accept connections
    i=0
    while [[ $i < 5 ]]; do
      if [[ `docker run -it --link mw-db-$TYPE:cassandra --rm cassandra sh -c 'exec cqlsh "$CASSANDRA_PORT_9042_TCP_ADDR" -e "describe keyspace mindweb"'` ]]; then
	break;
      fi
      i=$(( $i + 1 ))
      echo "Database is not available, sleeping for $i seconds"
      sleep $i
    done
    if [[ $i == 5 ]]; then
	echo "Could not connect to databese" >&2
	exit 1;
    fi

# Stop all dependents
for i in $DEP_CHAIN; do
    if [[ $STOP == 1 ]]; then
	echo "Stopping container:" $i
	docker stop mw-$i-$TYPE >/dev/null
	if [[ $BUILD == 1 ]]; then
	    echo "Replacing container:" $i
	    docker rm mw-$i-$TYPE >/dev/null
	    docker rename mw-$i-$TYPE-tmp  mw-$i-$TYPE >/dev/null
	fi
    fi
    if [[ $START == 1 ]]; then
	echo "Starting container:" $i
	docker start mw-$i-$TYPE >/dev/null
    fi
done

echo "Cleaning up untaged images"
UNTAGED=$(docker images|awk '{if (/^<none>/) {print $3}}')
if [ -n "$UNTAGED" ]; then
    docker rmi $UNTAGED
fi
