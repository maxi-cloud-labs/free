The autologin feature of **mAxI.cloud** is a powerful feature to avoid entering manually credentials to access web interface of various modules.

The credentials of the modules if any are stored in json config files in the `/disk/admin/modules/_config_/` folder of the system.

When autologin is used, the page sends fake standardized credentials to the system. The Apache2 backend intercepts those credentials and replace them locally by the real credentials read from `/disk/admin/modules/_config_/module-name.json`.

It's extremelly secure as the real credentials don't transit over the Internet and stays on the system.
