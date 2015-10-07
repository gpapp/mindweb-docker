From node:latest

USER root
RUN useradd node
RUN mkdir /home/node
RUN chown node /home/node

WORKDIR /home/node
ONBUILD ADD . /home/node
ONBUILD RUN chown -R node /home/node
ONBUILD USER node
ONBUILD RUN npm install

CMD []
ENTRYPOINT ["/usr/local/bin/npm", "start"]
