#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset swaggerui##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
rm -rf /disk/admin/modules/swaggerui
mkdir -p /disk/admin/modules/swaggerui

ln -sf /usr/local/modules/swaggerui/node_modules/swagger-ui-dist/swagger-ui.css /disk/admin/modules/swaggerui/
ln -sf /usr/local/modules/swaggerui/node_modules/swagger-ui-dist/index.css /disk/admin/modules/swaggerui/
ln -sf /usr/local/modules/swaggerui/node_modules/swagger-ui-dist/swagger-ui-bundle.js /disk/admin/modules/swaggerui/
cat > /disk/admin/modules/swaggerui/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" type="text/css" href="swagger-ui.css" />
<link rel="stylesheet" type="text/css" href="index.css" />
<title>API Docs of ${CLOUDNAME}</title>
<meta name="description" content="API Docs of ${CLOUDNAME}">
</head>
<body>
<div id="swagger-ui"></div>
<script src="swagger-ui-bundle.js" charset="UTF-8"> </script>
<script>
	window.onload = () => {
		window.ui = SwaggerUIBundle({
			url: 'openapi.json',
			dom_id: '#swagger-ui',
		});
	};
</script>
</body>
</html>
EOF
echo '{ "status":"OK" }' > /disk/admin/modules/swaggerui/health.json
cat > /disk/admin/modules/swaggerui/openapi.json <<EOF
{
	"openapi": "3.0.0",
	"info": {
		"title": "API Docs of ${CLOUDNAME}",
		"description": "The API documentation of ${CLOUDNAME} can be modified at /disk/admin/modules/swaggerui/openapi.json. You can also use the swagger build tool: /usr/bin/java -jar swagger-codegen-cli.jar",
		"version": "1.0.0"
	},
	"servers": [
		{
			"url": "https://apidocs.${PRIMARY}"
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
