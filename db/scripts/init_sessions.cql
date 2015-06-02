CREATE keyspace mindweb with replication = {'class': 'SimpleStrategy', 'replication_factor': 30};
CREATE TABLE IF NOT EXISTS mindweb.sessions (
          sid text PRIMARY KEY,
          sobject text
       );
