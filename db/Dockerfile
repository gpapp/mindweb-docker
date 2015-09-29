From cassandra:latest
ADD register.sh /
RUN apt-get update;apt-get install curl -y

ENTRYPOINT ["/register.sh"]

EXPOSE 7280/tcp
