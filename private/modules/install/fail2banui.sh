#!/bin/sh

cd /usr/local/modules/fail2banui
go mod tidy
go -o fail2ban-ui cmd/server/main.go
ln -sf /disk/admin/modules/fail2banui/fail2ban-ui.db
ln -sf /disk/admin/modules/fail2banui/fail2ban-ui.db-shm
ln -sf /disk/admin/modules/fail2banui/fail2ban-ui.db-wal
