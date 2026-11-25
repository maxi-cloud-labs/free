<h1 align="center">mAxI.cloud: your cloud, your AI, your sovereignty</h1>

**mAxI.cloud** is a disruptive, beautifully designed, all-in-one cloud & AI platform that makes digital sovereignty effortless.

Think Netflix for Cloud & AI apps: **mAxI.cloud** is a curated catalog of **300+ configured, secured and fully maintained** github or Open Source projects representing more than **10+ million ⭐**.

<p align="center">🚀 <b>mAxI.cloud</b> is ①⓪⓪%&nbsp;&nbsp;🅾🅿🅴🅽 🆂🅾🆄🆁🅲🅴. 🚀</p>

# Content of this folder
`app` is a C-code app that runs on the hardware. It handles core features such as initial setup, refresh, routes of user interactions. It halso handles the screen for the dongle.

# Compilation of this folder
To compile this folder:
* OS requirement: **Linux Ubuntu** or similar
* Run `apt-get install build-essential php libnm-dev libgtk-3-dev`
* Run `php ../private/modules-update.php`
* Run `./lvgl.sh -b` to compile LVGL
* Run `./lvgl-web.sh -s` to compile LVGL for the web interface leveraging emscripten
* Run `make`

You will get `app` which is the executable that runs on the hardware, `app.js` which is the web version leveraging emscripten that you can run with `app.html`, and `appD` which is a desktop test version based on gtk+-3.0.
