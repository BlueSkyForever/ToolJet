#!/bin/bash

set -e
# Setup prerequisite dependencies
sudo apt-get -y install --no-install-recommends wget gnupg ca-certificates apt-utils curl
sudo apt-get -y install git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y postgresql-client

# Setup openresty
wget -O - https://openresty.org/package/pubkey.gpg | sudo apt-key add -
echo "deb http://openresty.org/package/ubuntu bionic main" > openresty.list
sudo mv openresty.list /etc/apt/sources.list.d/
sudo apt-get update
sudo apt-get -y install --no-install-recommends openresty
sudo apt-get install -y curl g++ gcc autoconf automake bison libc6-dev \
     libffi-dev libgdbm-dev libncurses5-dev libsqlite3-dev libtool \
     libyaml-dev make pkg-config sqlite3 zlib1g-dev libgmp-dev \
     libreadline-dev libssl-dev libmysqlclient-dev build-essential \
     freetds-dev libpq-dev
sudo apt-get install -y luarocks
sudo luarocks install lua-resty-auto-ssl
sudo mkdir /etc/resty-auto-ssl /var/log/openresty /etc/fallback-certs
sudo chown -R www-data:www-data /etc/resty-auto-ssl

# Oracle db client library setup
sudo apt install -y libaio1
curl -o instantclient-basiclite.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip -SL && \
    unzip instantclient-basiclite.zip && \
    sudo mv instantclient*/ /usr/lib/instantclient && \
    rm instantclient-basiclite.zip && \
    sudo ln -s /usr/lib/instantclient/libclntsh.so.19.1 /usr/lib/libclntsh.so && \
    sudo ln -s /usr/lib/instantclient/libocci.so.19.1 /usr/lib/libocci.so && \
    sudo ln -s /lib/libc.so.6 /usr/lib/libresolv.so.2 && \
    sudo ln -s /lib64/ld-linux-x86-64.so.2 /usr/lib/ld-linux-x86-64.so.2
export LD_LIBRARY_PATH="/usr/lib/instantclient"

# Gen fallback certs
sudo openssl rand -out /home/ubuntu/.rnd -hex 256
sudo chown www-data:www-data /home/ubuntu/.rnd
sudo openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 \
     -subj '/CN=sni-support-required-for-valid-ssl' \
     -keyout /etc/fallback-certs/resty-auto-ssl-fallback.key \
     -out /etc/fallback-certs/resty-auto-ssl-fallback.crt

# Setup nginx config
export SERVER_HOST="${SERVER_HOST:=localhost}"
export SERVER_USER="${SERVER_USER:=www-data}"
VARS_TO_SUBSTITUTE='$SERVER_HOST:$SERVER_USER'
envsubst "${VARS_TO_SUBSTITUTE}" < /tmp/nginx.conf > /tmp/nginx-substituted.conf
sudo cp /tmp/nginx-substituted.conf /usr/local/openresty/nginx/conf/nginx.conf

# Download and setup postgrest binary
curl -OL https://github.com/PostgREST/postgrest/releases/download/v10.1.1/postgrest-v10.1.1-linux-static-x64.tar.xz
tar xJf postgrest-v10.1.1-linux-static-x64.tar.xz
sudo mv ./postgrest /bin/postgrest
sudo rm postgrest-v10.1.1-linux-static-x64.tar.xz

# Setup app and postgrest as systemd service
sudo cp /tmp/nest.service /lib/systemd/system/nest.service
sudo cp /tmp/postgrest.service /lib/systemd/system/postgrest.service

# Setup app directory
mkdir -p ~/app
git clone -b main https://github.com/ToolJet/ToolJet.git ~/app && cd ~/app

mv /tmp/.env ~/app/.env
mv /tmp/setup_app ~/app/setup_app
sudo chmod +x ~/app/setup_app

sudo npm install -g npm@7.20.0
sudo chown -R 1000:1000 "/home/ubuntu/.npm"

# Building ToolJet app
sudo npm install -g @nestjs/cli
sudo npm run build
