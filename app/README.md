<h1 align="center">mAxI.cloud, My Data, My sovereignty</h1>

****mAxI.cloud** is your PERSONAL cloud** with mail, calendar, AI chatbot, collaborative office suite, video conference, web hosting, blog, photos, files exchange, every online service you need.

mAxI.cloud gathers **150+ compiled and pre-configured** github or Open Source projects representing more than **4.8 million ⭐**.

<p align="center">🚀 <b>mAxI.cloud</b> is ①⓪⓪%&nbsp;&nbsp;🅾🅿🅴🅽 🆂🅾🆄🆁🅲🅴. 🚀</p>

# Content of this folder
`app` is a C-code app that runs on the dongle. It handles core features such as initial setup, refresh, routes of user interactions to the right code in the dongle. It halso handles the screen. 

# Compilation of this folder
To compile this folder:
* OS requirement: **Linux Ubuntu** or similar
* Run `apt-get install build-essential php libnm-dev libgtk-3-dev`
* Run `php ../private/modules-update.php`
* Run `./lvgl.sh -b` to compile LVGL
* Run `./lvgl-web.sh -s` to compile LVGL for the web interface leveraging emscripten
* Run `make`

You will get `app` which is the executable that runs on the dongle, `app.js` which is the web version leveraging emscripten that you can run with `app.html`, and `appD` which is a test desktop version based on gtk+-3.0.
