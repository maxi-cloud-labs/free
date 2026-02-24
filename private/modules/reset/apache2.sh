#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset apache2##################"
rm -rf /disk/admin/modules/apache2/www
mkdir -p /disk/admin/modules/apache2/www
cat > /disk/admin/modules/apache2/www/index.html <<EOF
<html>
<body>
You can edit this home page in the folder: /disk/admin/modules/apache2/www<br><br>
Go to the main <a href="/m/app">App</a> of the system
</body>
</html>
EOF

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
