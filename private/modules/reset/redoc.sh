#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset redoc##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
rm -rf /disk/admin/modules/redoc
mkdir -p /disk/admin/modules/redoc

ln -sf /usr/local/modules/redoc/node_modules/redoc/bundles/redoc.standalone.js /disk/admin/modules/redoc/
cat > /disk/admin/modules/redoc/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Reference doc of ${CLOUDNAME}</title>
<meta name="description" content="Reference doc of ${CLOUDNAME}">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link href="https://fonts.googleapis.com|Roboto:300,400,700" rel="stylesheet">
</head>
<body>
<redoc spec-url="openapi.json"></redoc>
<script src="./redoc.standalone.js"> </script>
</body>
</html>
EOF
echo '{ "status":"OK" }' > /disk/admin/modules/redoc/health.json
cat > /disk/admin/modules/redoc/openapi.json <<EOF
{
	"openapi": "3.0.0",
	"info": {
		"title": "Redoc of ${CLOUDNAME}",
		"description": "The reference documentation of ${CLOUDNAME} can be modified at /disk/admin/modules/redoc/openapi.json. You can also use the swagger build tool: /usr/bin/java -jar swagger-codegen-cli.jar",
		"version": "1.0.0"
	},
	"servers": [
		{
			"url": "https://redoc.${PRIMARY}"
		}
	],
	"paths": {
		"/health.json": {
			"get": {
				"summary": "Get health",
				"responses": {
					"200": {
						"description": "A JSON array for the server status",
						"content": {
							"application/json": {
								"schema": {
									"type": "object",
									"properties": {
										"status": {
											"type": "string",
											"example": "OK"
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
}
EOF

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
