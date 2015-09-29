FROM debian:wheezy
RUN mkdir -p /opt/etcd
RUN export ETCD_VERSION=v2.2.0 \
  && apt-get update && apt-get install -y curl --no-install-recommends ca-certificates && \
  curl -L  https://github.com/coreos/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz \
  | tar -zxC /opt/etcd --strip-components=1 \
  && apt-get remove --purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*
ENV PATH /opt/etcd:$PATH

#EXPOSE 8001:8001 8002:8002

#ENTRYPOINT [ "etcd", "-name=mindweb", "-debug", "-listen-client-urls", "http://0.0.0.0:8001", "-advertise-client-urls", "http://0.0.0.0:8001","-listen-peer-urls", "http://0.0.0.0:8002" ]


EXPOSE 4001:8001 7001:8002
ENTRYPOINT [ "etcd", "-name=mindweb", "-debug" ]
