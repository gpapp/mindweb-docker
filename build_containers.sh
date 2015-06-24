#!/bin/bash
COMPONENTS='storage session-manager file freeplane-converter ui broker'

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

function findDependents () {
	local C=$1
	for i in $COMPONENTS; do 
		if [[ $C != $i ]]; then 
			for j in $(cat $i/docker_create.sh|sed -nr '/--link/ { s/.*\-\-link mw-(.*)-\$TYPE:.*/\1/; p}'); do
				if [[ $C == $j ]]; then 
					echo "$C ==> $i" >&2
					local LEAFS=$(findDependents "$i")
			fi
			done
		fi
	done
	for i in $LEAFS; do
		LEAFS=$(echo $LEAFS|sed -rn "s/$i//g; s/(.*)/\1 $i/;p")
	done
	echo -n "$C $LEAFS"
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
	docker build -t mindweb/$NAME $NAME
}

function resolve_module () {
    res=$1
    case $res in
    	'A') echo $COMPONENTS
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
    	'F')
    	    echo 'freeplane-converter'
    	;;
    	'f')
    	    echo 'file'
    	;;
    	*)
    	    echo -e "\n\nInvalid value selected: $res"
    	    return 1
    	;;
    esac
    return 0
}

TYPE='DEV'
BROKER_PORT='8081'
export TYPE
export BROKER_PORT
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
	-b|--broker-port)
	    BROKER_PORT="$2"
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
	    echo -e "Valid parameters are:
    -a|--all: force everything
    -i|--interactive: Use interactive shell
    -t|--type:   Type of build (defaults to dev)
    -b|--broker-port: The port for the broker to listen to (defaults to 8081)
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
    REBUILD=$PULL
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
        echo $PUSH
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

DEP_CHAIN=""
for i in $MODIFIED; do
	DEP_CHAIN="$DEP_CHAIN $(findDependents $i)"
done
for i in $DEP_CHAIN; do
	DEP_CHAIN=$(echo $DEP_CHAIN|sed -rn "s/$i//g; s/(.*)/\1 $i/;p")
done
echo "Dependencies to recreate:"$DEP_CHAIN

# Remove all modified components
for i in $DEP_CHAIN; do
	echo "Stopping container:" $i
	docker stop mw-$i-$TYPE >/dev/null
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

# Start all components
for i in $DEP_CHAIN; do
	echo "Starting container:" $i
	docker start mw-$i-$TYPE >/dev/null
done

echo "Cleaning up untaged images"
docker rmi $(docker images|awk '{if (/^<none>/) {print $3}}')
