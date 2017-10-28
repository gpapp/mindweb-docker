# Mindweb docker

This package contains a set of utilities to set up a working mindweb 
environment on an Ubuntu server. 

This is supposed to be the root of location where you check your 
mindweb ui and server repositories out.

The environments are designed to span over several nodes, 
but the supporting scripts are created for a single node
environment for now. 

For multi node deployments, Docker Swarm, Puppet, Chef, etc. 
should be used

## Components

### nodejs-base
This is the base docker image used within the server and 
ui modules.

### DB
Mindweb uses a Cassandra db cluster to store it's 
files.

### Kafka
The interactive editing in the mindweb service is 
achieved by using an Apache Kafka cluster. 

## Getting started

Run the script ```mindweb.sh --init-docker``` to 
initialize nodejs docker layer

Run the script `mindweb.sh --init-db 
--kafka-port`**`KAFKA_PORT`**`
--db-port`**`DB_PORT`**`
--type `**`DEV`** to create
your db and kafka docker container named
**mw-db-DEV** and **mw-kafka-DEV** respectively.

Clone the repositories mindweb-ui and mindweb-server 
from Github and *rename* them as ui and server.

Run the script `mindweb.sh --build --all 
--http-port`**`HTTP_PORT`**`
--server-port`**`SERVER_PORT`**`
--kafka-port`**`KAFKA_PORT`**`
--db-port`**`DB_PORT`**`
--type `**`DEV`** to build your servers
**mw-ui-DEV** and **mw-server-DEV** respectively.

You can use any string for TYPE as it changes the suffix of the created docker components. 
If you don't want to specify all ports you can use the type DEV or LIVE, and they define their default ports differently.

PORTNAME       |Description                                                 |  DEV  | LIVE 
---------------|------------------------------------------------------------|-------|-------
HTTP_PORT      | External port of the NGIX webserver in the ui component    |  8082 | 8080  
SERVER_PORT    | Internal port of the NodeJS server in the server component |  8083 | 8081  
DB_PORT        | Internal port of the Cassandra DB used by the server       | 19042 | 9042  
KAFKA_PORT     | Internal port of the Kafka component used by the server    | 19092 | 9092  

##Linux environment
### Systemd scripts
Copy the script in the systemd directory to 
/etc/systemd/system and modify it according to your 
own file locations:

Replace /home/gpapp/mindweb with the actual location 
of your scripts.

### UFW Rules

Considering your docker to use the network segment 172.17.0.0/16 
you can execute the following commands to allow access through UFW.
 
* Access the server from the proxy LIVE
    ufw allow from 172.17.0.0/16 to YOUR_IP port 8081
* Access the database from the server LIVE
    ufw allow from 172.17.0.0/16 to YOUR_IP port 19042

* Access the server from the proxy DEV
    ufw allow from 172.17.0.0/16 to YOUR_IP port 8083

* Access the database from the server DEV
    ufw allow from 172.17.0.0/16 to YOUR_IP port 9042

The ui server itself can either be exposed directly over 
the internet or through a pass-through proxy.