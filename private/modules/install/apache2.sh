#!/bin/sh

apt-get -y install apache2
rm -f /etc/apache2/sites-enabled/*
rm -f /etc/apache2/ports.conf
sed -i -e "s/^ServerTokens .*/ServerTokens Prod/" /etc/apache2/conf-enabled/security.conf
sed -i -e "s/^ServerSignature .*/ServerSignature Off/" /etc/apache2/conf-enabled/security.conf
