From node:latest

USER root
RUN useradd node
RUN mkdir /home/node
RUN chown node /home/node
RUN npm install -g nodemon

WORKDIR /home/node
ONBUILD ADD . /home/node
ONBUILD RUN chown -R node /home/node
ONBUILD USER node
ONBUILD RUN npm install

CMD []
ENTRYPOINT ["/usr/local/bin/nodemon", "start"]
