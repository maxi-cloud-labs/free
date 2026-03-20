#!/bin/sh

apt-get -y install fail2ban
cat > /etc/fail2ban/jail.d/defaults-debian.conf << EOF
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 162.227.165.66
bantime  = 1h
findtime = 10m
maxretry = 3
banaction = nftables
banaction_allports = nftables[type=allports]
backend = systemd

[sshd]
enabled = true

[apache-auth]
enabled = true
port    = http,https
logpath = /var/log/apache2/error.log
backend = polling

[apache-badbots]
enabled = true
port    = http,https
logpath = /var/log/apache2/other_vhosts_access.log
backend = polling

[apache-noscript]
enabled = true
port    = http,https
logpath = /var/log/apache2/error.log
backend = polling
EOF
