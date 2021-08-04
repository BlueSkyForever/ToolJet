#!/bin/bash

set -e
# Setup prerequisite dependencies
sudo apt-get -y install --no-install-recommends wget gnupg ca-certificates apt-utils curl
sudo apt-get -y install git
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y postgresql-client

# Setup openresty
wget -O - https://openresty.org/package/pubkey.gpg | sudo apt-key add -
echo "deb http://openresty.org/package/ubuntu bionic main" > openresty.list
sudo mv openresty.list /etc/apt/sources.list.d/
sudo apt-get update
sudo apt-get -y install --no-install-recommends openresty
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y curl g++ gcc autoconf automake bison libc6-dev \
     libffi-dev libgdbm-dev libncurses5-dev libsqlite3-dev libtool \
     libyaml-dev make pkg-config sqlite3 zlib1g-dev libgmp-dev \
     libreadline-dev libssl-dev libmysqlclient-dev build-essential \
     freetds-dev libpq-dev
sudo apt-get install -y luarocks
sudo luarocks install lua-resty-auto-ssl
sudo mkdir /etc/resty-auto-ssl
sudo chown -R www-data:www-data /etc/resty-auto-ssl
sudo mkdir /var/log/openresty

# Gen fallback certs
sudo openssl rand -out /home/ubuntu/.rnd -hex 256
sudo chown www-data:www-data /home/ubuntu/.rnd
sudo openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 \
     -subj '/CN=sni-support-required-for-valid-ssl' \
     -keyout /etc/ssl/resty-auto-ssl-fallback.key \
     -out /etc/ssl/resty-auto-ssl-fallback.crt

# Setup directories
sudo mv /tmp/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
sudo cp /tmp/nest.service /lib/systemd/system/nest.service

mkdir -p ~/app
git clone -b nestjs-packer-changes https://github.com/ToolJet/ToolJet.git ~/app && cd ~/app

mv /tmp/.env ~/app/.env
mv /tmp/setup_app ~/app/setup_app
sudo chmod +x ~/app/setup_app

# Building ToolJet app
sudo npm install -g @nestjs/cli
sudo npm run build
