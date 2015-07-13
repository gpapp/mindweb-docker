From google/nodejs:latest

USER root
RUN npm cache clean -fI
RUN npm install -g n
RUN n stable
RUN useradd node
RUN mkdir /home/node
RUN chown node /home/node

WORKDIR /home/node
ONBUILD USER node
ONBUILD ADD . /home/node
ONBUILD RUN npm install

CMD []
ENTRYPOINT ["/nodejs/bin/npm", "start"]
