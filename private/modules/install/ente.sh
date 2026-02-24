#!/bin/sh

cd /usr/local/modules/ente
cd server
go mod tidy
go build -o museum cmd/museum/main.go
ln -sf /disk/admin/modules/ente/museum.yaml
go build -o keys tools/gen-random-keys/main.go
cd ../web
apt-get -y install -t trixie-backports libstd-rust-dev-wasm32
yes | yarn install
yarn build:accounts
yarn build:auth
yarn build:cast
yarn build:embed
yarn build:ensu
yarn build:payments
yarn build:photos
yarn build:share
