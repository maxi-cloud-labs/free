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

yarn build:auth
find apps/auth/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/auth/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteauth.", "ente.") };</script></head>@' {} \;
rm -rf /usr/local/modules/enteauth
cp -a apps/auth/out /usr/local/modules/enteauth

yarn build:cast
find apps/cast/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/cast/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("entecast.", "ente.") };</script></head>@' {} \;
rm -rf /usr/local/modules/entecast
cp -a apps/cast/out /usr/local/modules/entecast

yarn build:ensu
find apps/ensu/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/ensu/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteensu.", "ente.") };</script></head>@' {} \;
rm -rf /usr/local/modules/enteensu
cp -a apps/ensu/out /usr/local/modules/enteensu

yarn build:photos
find apps/photos/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
find apps/photos/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("entephotos.", "ente.") };</script></head>@' {} \;
rm -rf /usr/local/modules/entephotos
cp -a apps/photos/out /usr/local/modules/entephotos

#yarn build:payments

#yarn build:accounts
#find apps/accounts/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
#find apps/accounts/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteaccounts.", "ente.") };</script></head>@' {} \;
#rm -rf /usr/local/modules/enteaccounts
#cp -a apps/accounts/out /usr/local/modules/enteaccounts

#yarn build:embed
#find apps/embed/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
#find apps/embed/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteembed.", "ente.") };</script></head>@' {} \;
#rm -rf /usr/local/modules/enteembed
#cp -a apps/embed/out /usr/local/modules/enteembed

#yarn build:share
#find apps/share/out -name "*.js" -exec sed -i 's/[a-zA-Z0-9]\+.env.NEXT_PUBLIC_ENTE_ENDPOINT/window.env.NEXT_PUBLIC_ENTE_ENDPOINT/g' {} \;
#find apps/share/out -name "*.html" -exec sed -i 's@</head>@<script>window.env = { NEXT_PUBLIC_ENTE_ENDPOINT: window.location.protocol + "//" + window.location.hostname.replace("enteshare.", "ente.") };</script></head>@' {} \;
#rm -rf /usr/local/modules/enteshare
#cp -a apps/share/out /usr/local/modules/enteshare

cd ..
rm -rf apps

cd cli
go mod tidy
go build -o /usr/local/bin/ente main.go
