# UFW Rules

* Access the server from the proxy LIVE
    ufw allow from 172.17.0.0/16 to 192.168.1.20 port 8081
* Access the database from the server LIVE
    ufw allow from 172.17.0.0/16 to 192.168.1.20 port 19042

* Access the server from the proxy DEV
    ufw allow from 172.17.0.0/16 to 192.168.1.20 port 8083

* Access the database from the server DEV
    ufw allow from 172.17.0.0/16 to 192.168.1.20 port 9042
