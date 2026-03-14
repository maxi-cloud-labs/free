<h1 align="center">mAxI.cloud, My Data, My sovereignty</h1>

****mAxI.cloud** is your PERSONAL cloud** with mail, calendar, AI chatbot, collaborative office suite, video conference, web hosting, blog, photos, files exchange, every online service you need.

mAxI.cloud gathers **150+ compiled and pre-configured** github or Open Source projects representing more than **4.8 million ⭐**.

<p align="center">🚀 <b>mAxI.cloud</b> is ①⓪⓪%&nbsp;&nbsp;🅾🅿🅴🅽 🆂🅾🆄🆁🅲🅴. 🚀</p>

# Content of this folder
`screenAvr` is a C-code app that can manage and flash the AVR chip installed on the dongle Pro.

# Compilation of this folder
To compile this folder:
* OS requirement: **Linux Ubuntu** or similar
* Run `apt-get install build-essential`
* Get the AVR cross-compilation toolchain
* Modify MYPATH in `Makefile` with your cross-compilation toolchain PATH
* Run `make`

You will get `main.elf` which can be burnt on the dongle using the `burn.sh` script.
