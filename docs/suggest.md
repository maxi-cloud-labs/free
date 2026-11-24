# Suggest an Open Source module

If you think that we have forgotten a module, please suggest it. The main requirement is that it must be Open Source. It's better if there is a GitHub repository, though it's not a requirement.

# What's needed to suggest a module?
Each module integration is based on the following files, all located in [private/modules](https://github.com/maxi-cloud-labs/free/tree/master/private/modules):

- 1. module.json, the file that describes the module and provides the information used at run-time. The resources icons/module.png (512x512, black only on transparent background), images/module.backdrop.jpg (1280x720) and images/module.poster.jpg (768x1024) are automatically generated, the images from the hero field.

- 2. install/module.sh, the /bin/sh script that is run to install the module during the preparation of the image.

- 3. reset/module.sh, an optional /bin/sh script to reset the module. It's also called during the first setup, so it's mandatory when the default.setup property is set.

- 4. services/name.service, optional systemd services for the module, listed in default.services.

# Module: module.json
Each module is described by an exhaustive json config file. All the top-level properties are mandatory, while the properties in default are optional unless stated otherwise:

```
{
	"module": "The module identifier, identical to the file name (only the [a-z0-9_] characters).",
	"name": "The Open Source name of the module, with its official spelling (any character).",
	"title": "A short, user-friendly title in Title Case, usually 2-3 words describing what the module does (translated).",
	"category": "The category of the module ('Productivity', 'Knowledge', 'Collaboration', 'Personal', 'Media', 'Torrent', 'Utils', 'Server', 'Developer', 'Database', 'AI Generative', 'AI Agentic').",
	"version": "The installed version of the module, usually the latest release or tag on the GitHub repository, or a short commit hash.",
	"installMethod": "The main installation method of the module ('apt', 'apt (source)', 'deb', 'wget', 'tar', 'clone', 'npm', 'pip').",
	"web": "A boolean if the module has a web interface (recommended). If true, default.localPort is mandatory.",
	"recommended": "A boolean if the module is a 'recommended' module.",
	"finished": "A boolean if the module integration has been finished.",
	"database": "The database used by the module ('SQLite', 'MySQL', 'PostgreSQL', 'MongoDB', 'BoltDB'), or an empty string.",
	"github": "The GitHub repository as 'owner/repo' (not a URL), or an empty string if there is none or if it's shared with another module.",
	"description": "A one-sentence description of the module, ending with a period (translated).",
	"hero": "A short visual scene used to generate the poster and backdrop images, followed by a few mood words.",
	"keywords": [
		"Up to 10 keywords representing the module, lowercase single words without spaces or hyphens, sorted alphabetically."
	],
	"proprietary": [
		"The names of the proprietary (closed-source) equivalents of the module, sorted alphabetically. The array is empty if there is none."
	],
	"default": {
		"addConfigBegin": "A configuration line added at the beginning of the Apache2 module virtual host.",
		"addConfigEnd": "A configuration line added at the end of the Apache2 module virtual host.",
		"addLineInDirectory": "A configuration line added in the Directory block of the Apache2 module virtual host.",
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
		"autoLoginNoGzip": [ "Regular expressions of the request URIs for which gzip is disabled so that auto-login can be injected." ],
		"cmds": [ "The commands provided by a terminal module, shown to the user." ],
		"config": "A boolean to indicate if the module has a user configuration.",
		"enabled": "A boolean to indicate if the module web interface is enabled or not.",
		"enabledUnalterable": "A boolean to indicate if the user cannot disable the module.",
		"followSymLinks": "A boolean to indicate if Apache2 FollowSymLinks directive should be added or removed.",
		"homepage": "The path appended to the module URL when opening it, for instance '/login'.",
		"indexes": "A boolean if Apache2 Indexes directive should be added or removed.",
		"localPort": "The local port of the Apache2 module virtual host, unique among all modules (9400 and above).",
		"multiViews": "A boolean if Apache2 MultiViews directive should be added or removed.",
		"path": "The DocumentRoot of the Apache2 module virtual host (default: /usr/local/modules/module).",
		"permissions": [
			"The permissions of the module ('user', 'public' or 'hardware')."
		],
		"permissionsPublicForbidden": "A boolean to indicate if the module cannot have public access.",
		"reset": "A boolean to indicate if the module has a reset option.",
		"reservedToFirstUser": "A boolean to indicate if the module is reserved only to the first registered user.",
		"reverseProxy": [
			{
				"type": "The type of the Apache2 module virtual host reverse proxy, aka. 'http' or 'ws'.",
				"port": "The port number of the Apache2 module virtual host reverse proxy.",
				"path": "The original path of the Apache2 module virtual host reverse proxy.",
				"path2": "The optional target path of the Apache2 module virtual host reverse proxy (default: path)."
			}
		],
		"services": [
			"The systemd service names of the module."
		],
		"setup": "A boolean to indicate if the module needs setup. It requires reset/module.sh and setupDependencies.",
		"setupDependencies": [
			"The modules that must be set up before the module itself."
		],
		"setupPriority": "A boolean to set up the module before all the other modules.",
		"setupRoot": "A boolean if the setup should be run with root privileges."
	}
}
```

A few modules use specific properties in default, such as localRanges (apache2), bindingPort and protocols (frp), containerID and containerRun (ollama), configFile (tabby), features and mtp (umtpresponder). Look at these modules if you need something similar.

The best way is to start from a similar module in [https://github.com/maxi-cloud-labs/free/tree/master/private/modules](https://github.com/maxi-cloud-labs/free/tree/master/private/modules).
