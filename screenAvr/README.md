<h1 align="center">mAxI.cloud: my Data, my AI, my Sovereignty</h1>

**mAxI.cloud** is your **AI self-hosted OS** with AI chatbot, AI agents, mail, Office suite, video conference, web hosting, blog, photos, files exchange... **Every AI and cloud service you need. All secured.**

**mAxI.cloud** includes **225+ compiled and pre-configured** github or Open Source projects representing more than **6.5 million ⭐**.

<p align="center">🚀 <b>mAxI.cloud</b> is ①⓪⓪%&nbsp;&nbsp;🅾🅿🅴🅽 🆂🅾🆄🆁🅲🅴. 🚀</p>

# Content of this folder
`screenAvr` is a C-code app that can manage and flash the AVR chip installed on the dongle.

# Compilation of this folder
To compile this folder:
* OS requirement: **Linux Ubuntu** or similar
* Run `apt-get install build-essential`
* Get the AVR cross-compilation toolchain
* Modify MYPATH in `Makefile` with your cross-compilation toolchain PATH
* Run `make`

You will get `main.elf` which can be burnt on the dongle using the `burn.sh` script.
