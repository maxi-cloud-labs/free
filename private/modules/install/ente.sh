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
find apps/accounts/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/accounts/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteaccounts.", "ente.") };</script>' {} \;
yarn build:auth
find apps/auth/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/auth/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteauth.", "ente.") };</script>' {} \;
yarn build:cast
find apps/cast/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/cast/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("entecast.", "ente.") };</script>' {} \;
yarn build:embed
find apps/embed/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/embed/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteembed.", "ente.") };</script>' {} \;
yarn build:ensu
find apps/ensu/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/ensu/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteensu.", "ente.") };</script>' {} \;
yarn build:payments
yarn build:photos
find apps/photos/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/photos/out -name "*.html" -exec sed -i '/<head>/a <script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("entephotos.", "ente.") };</script>' {} \;
yarn build:share
cd ../cli
go mod tidy
go build -o /usr/local/bin/ente main.go
