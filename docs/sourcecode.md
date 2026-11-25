This page documents the source code folders of this project.

# Introduction

As a reminder, conceptually a **module** (from the development point of view) is the same thing as an **app** (from the user point of view). See [Architecture](architecture) for how the folders below fit together.

# Folders

| Folder | Language | Content |
|---|---|---|
| `app` | C | The app managing the hardware (screen, buttons, buzzer, Wi-Fi, BLE). Scenario with hardware only. |
| `auth` | TypeScript | Based on better-auth: security, permissions and modules handler. Scenario with hardware and scenario on headless server. |
| `build` | | Build folder. |
| `client` | TypeScript | The frontend: the main web interface. |
| `docs` | HTML | The documentation, this website. |
| `kernel` | C | The Kernel drivers for the hardware. |
| `login` | TypeScript | A web interface to log in. Most of its content is symlinked from `client`. |
| `moduleApache2` | C | An Apache2 add-on for the permissions and the [Auto-Login](autologin). |
| `moduleIpApache2` | C | An Apache2 add-on to handle proxy info (real IP of the client, related to frp). |
| `pam` | C | A PAM add-on for Linux authentication. |
| `private` | Bash, PHP | A bunch of scripts (build, install, firmware, modules catalog tools). |
| `private/modules` | JSON, Bash | The configuration of all the modules: one `module-name.json` each, plus their install and reset scripts. |
| `rootfs` | | A bunch of resources installed to `/` in the image. |
| `screenAvr` | C | A burning tool for the AVR chip on the hardware. |
