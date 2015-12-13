From node:latest

USER root
RUN npm cache clean -fI; npm install -g bower;npm install -g grunt-cli

RUN apt-get update; apt-get install apt-utils nginx -y;apt-get clean
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN sed -i 's+root .*$+root /var/www/;+; s+try_files \$uri \$uri/ /index.html;+try_files \$uri \$uri/ \= 404;+' /etc/nginx/sites-enabled/default 

RUN chown -R www-data /var/log/nginx
RUN chown -R www-data /var/www

ONBUILD USER www-data
ONBUILD EXPOSE 80 5672
ONBUILD WORKDIR /var/www/
