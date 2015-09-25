From google/nodejs:latest

USER root
RUN npm cache clean -fI
RUN npm install -g n
RUN n stable
RUN npm install -g bower

RUN apt-get update
RUN apt-get install apt-utils -y
RUN apt-get install nginx -y
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN sed -i 's+root .*$+root /var/www/;+; s+try_files \$uri \$uri/ /index.html;+try_files \$uri \$uri/ \= 404;+' /etc/nginx/sites-enabled/default 

RUN mkdir /var/www/
RUN chown -R www-data /var/log/nginx

ONBUILD USER www-data
WORKDIR /var/www/

