## Initialization

docker run -it --link mw-db-1:cassandra --rm cassandra sh -c 'exec cqlsh "$CASSANDRA_PORT_9042_TCP_ADDR"'

cqlsh> CREATE keyspace mindweb with replication = {'class': 'SimpleStrategy', 'replication_factor': 30};
cqlsh> CREATE TABLE IF NOT EXISTS mindweb.sessions (
          sid text PRIMARY KEY,
          sobject text
       );

