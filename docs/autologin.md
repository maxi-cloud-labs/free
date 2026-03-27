The autologin feature of **mAxI.cloud** is a powerful feature to avoid entering manually credentials to access the web interfaces of the various modules.

As a reminder, if any, the credentials of a module are stored in the json config file `/disk/admin/modules/_config_/module-name.json`.

When autologin is used, the page sends fake credentials to the system. The Apache2 backend intercepts those credentials and replaces them locally by the real credentials read from `/disk/admin/modules/_config_/module-name.json`.

It's extremelly secure as the real credentials don't transit over the Internet and stays on the system.
