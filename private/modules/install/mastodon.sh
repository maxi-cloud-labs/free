#!/bin/sh

apt-get -y install redis-server optipng pngquant jhead jpegoptim gifsicle nodejs imagemagick ffmpeg libpq-dev libxml2-dev libxslt1-dev file g++ libprotobuf-dev protobuf-compiler pkg-config gcc autoconf bison build-essential libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libncurses5-dev libffi-dev libgdbm-dev libidn11-dev libicu-dev libjemalloc-dev
apt-get -y install libvips libvips-dev libicu-dev libidn11-dev

cd /usr/local/modules/mastodon
gem install bundler
bundle config deployment 'true'
bundle config without 'development test'
bundle install -j$(getconf _NPROCESSORS_ONLN)
corepack enable
yes | yarn set version 4.10.3
yarn install
export SECRET_KEY_BASE=$(openssl rand -hex 64)
export ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=$(openssl rand -base64 32)
export ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=$(openssl rand -base64 32)
export ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=$(openssl rand -base64 32)
RAILS_ENV=production bundle exec rails assets:precompile
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	rm -rf tmp/cache
fi

ln -sf /disk/admin/modules/mastodon/env .env.production
