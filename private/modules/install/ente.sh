#!/bin/sh

cd /usr/local/modules/ente
cd server
go mod tidy
go build cmd/museum/main.go
ln -sf /disk/admin/modules/ente/museum.yaml
