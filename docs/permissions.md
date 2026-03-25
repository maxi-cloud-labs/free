This page documents the modules permissions architecture.

Most of the modules have a web interface which is eventually exposed through the Apache2 of **mAxI.cloud**. This provides an additional layer of security.

Your **mAxI.cloud** users can have the role of admin or the role of user. The very first user, which username is the cloud name, has a super admin role and can't be deleted.

The web interface of a module can be disabled (aka. turned off), made public, meaning that all visitors can access it or can be restricted to role-admin or role-user visitors.

The permissions setup at in the permissions section of the web app concern only the web interface of the module.
