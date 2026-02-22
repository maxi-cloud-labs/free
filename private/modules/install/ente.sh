#!/bin/sh

cd /usr/local/modules/ente
cd server
go mod tidy
go build -o museum cmd/museum/main.go
ln -sf /disk/admin/modules/ente/museum.yaml
go build -o keys tools/gen-random-keys/main.go
