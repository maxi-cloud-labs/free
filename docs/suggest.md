# Suggest an Open Source module

If you think that we have forgotten a module, please suggest. The main requirement is that it needs to be Open Source. It's better if there is a Github repository though it's not a requirement.

# What's needed to suggest a module?
Each module integration is based on the following files:

- 1. module.json, the file that describes the module and provide a lot of information for run-time.

- 2. icons/module.png, a transparent 512-pixel black-only icon representing the module. It's recommended to find a good matching icon at [https://flaticon.com](https://flaticon.com).

- 3. logos/module.jpg, a white-based image representing the module.

- 4. install/module.sh, the /bin/sh script that needs to be run to install the module during the preparation of the image.

- 5. reset/module.sh, an optional /bin/sh script to reset the module. It's also called during the first setup.

- 6. services/module.service, an optional service for the module.

# Module.json
Each module is described by an exhaustive json config file:

```
{
	"module": "the module name (only the [a-z0-9] characters).",
	"name": "The Open Source name of the module (any character).",
	"title": "The title of the module (any character) which should be user-friendly.",
	"category": "The category of the module, ('Essential', 'Productivity', 'Knowledge', 'Collaboration', 'Personal', 'Media', 'Torrent', 'Utils', 'Server', 'Developer', 'Database').",
	"version": "The version of the module, usually the latest Release on the Github repository if any.",
	"installMethod": "The main installation method of the module ('apt', 'deb', 'wget', 'clone', 'pip').",
	"web": "A boolean if the module has a web interface (recommended).",
	"essential": "A boolean if the module is an 'essential' module.",
	"finished": "A boolean if the module integration has been finished.",
	"ai": "A boolean if the module uses AI.",
	"database": "The optional database used by the module ('sqlite', 'mysql', 'mongodb, 'postgresql').",
	"github": "the Github URL of the module if any.",
	"description": "A one-sentence description of the module.",
	"keywords": [
		"Keywords representing the module."
	],
	"proprietary": "The proprietary equivalent of the module if any.",
	"default": {
		"addConfigEnd": "An option configuration to be added at the end of the Apache2 module virtual host.",
		"alias": [ "Optional alias or subdomain of the module." ],
		"autoLogin": {
			"inject": [
				{
					"url": "Injection URL for auto-login.",
					"form": "Html queryselector of the form for auto-login.",
					"arg1": "Html queryselector of the first tag (usually username or email input) for auto-login.",
					"arg2": "Html queryselector of the second tag (usually password input) for auto-login.",
					"arg3": "Html queryselector of the submit tag (input or button) for auto-login.",
					"val1": "0:username, 1:email, 2:password, 4:nothing",
					"val2": "0:username, 1:email, 2:password, 4:nothing"
				}
			],
			"post": [
				{
					"url": "Post replacement URL for auto-login.",
					"arg1": "Field name of the first replacement, usually username or email.",
					"arg2": "Field name of the second replacement, usually password.",
					"val1": "0:username, 1:email, 2:password, 4:nothing",
					"val2": "0:username, 1:email, 2:password, 4:nothing"
				}
			]
		},
		"config": "A boolean to indicate if the module has a user configuration.",
		"enabled": "A boolean if the module web interface is enabled or not.",
		"followSymlinks": "A boolean if Apache2 FollowSymlinks directive should be added or removed.",
		"indexes": "A boolean if Apache2 Indexes directive should be added or removed.",
		"localPort": "The local port of the Apache2 module virtual host.",
		"multiViews": "A boolean if Apache2 MultiViews directive should be added or removed.",
		"permissions": [
			"The permission of the module, can be user for instance."
		],
		"permissionsPublicForbidden": "A boolean to indicate if the module cannot have public access",
		"reset": "A boolean to indicate if the module has a reset option.",
		"reservedToFirstUser": "A boolean to indicate if the module is reserved only to the first registered user.",
		"reverseProxy": [
			{
				"type": "The type of the Apache2 module virtual host reverse proxy, aka. 'http' or 'ws'.",
				"port": "The port number of the Apache2 module virtual host reverse proxy.",
				"path": "The original path of the Apache2 module virtual host reverse proxy.",
				"path2": "The target path of the Apache2 module virtual host reverse proxy."
			}
		],
		"services": [
			"The service name of the module."
		],
		"setup": "A boolean if the module needs setup.",
		"setupDependencies": [
			"The module dependencies of the module itself."
		],
		"setupRoot": "A boolean if the setup should be run with root privileges."
	}
}

```

The best way is to start from a similar module to the one in [https://github.com/maxi-cloud-labs/free/tree/master/private/modules](https://github.com/maxi-cloud-labs/free/tree/master/private/modules).
