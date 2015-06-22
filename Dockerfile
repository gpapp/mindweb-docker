From google/nodejs-runtime:latest
RUN npm cache clean -fI
RUN npm install -g n
RUN n stable

EXPOSE 2004
