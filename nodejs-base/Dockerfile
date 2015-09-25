From google/nodejs:latest

USER root
RUN npm cache clean -fI
RUN npm install -g n tsc
RUN n stable
RUN useradd node
RUN mkdir /home/node
RUN chown node /home/node

WORKDIR /home/node
ONBUILD ADD . /home/node
ONBUILD RUN chown -R node /home/node
ONBUILD USER node
ONBUILD RUN npm install
ONBUILD RUN find . -name "*.ts" | xargs tsc -m commonjs -t ES5 --sourceMap; exit 0

CMD []
ENTRYPOINT ["/nodejs/bin/npm", "start"]
