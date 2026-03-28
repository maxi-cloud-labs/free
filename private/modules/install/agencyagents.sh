#!/bin/sh

cd /usr/local/modules/agencyagents
ln -sf /usr/local/modules/docsify/lib/docsify.min.js
ln -sf /usr/local/modules/docsify/lib/plugins
ln -sf /usr/local/modules/docsify/lib/themes

cat > index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1.0, shrink-to-fit=no, viewport-fit=cover">
<title>Agency Agents</title>
<meta name="description" content="Agency Agents">
<link rel="stylesheet" href="themes/vue.css">
</head>
<body>
<div id="app"></div>
<script>
window.\$docsify = {
	name: 'Agency Agents',
	homepage: 'README.md'
};
</script>
<script src="docsify.min.js"></script>
<script src="plugins/search.min.js"></script>
</body>
</html>
EOF
