<h1 align="center">mAxI.cloud: your cloud, your AI, your sovereignty</h1>

**mAxI.cloud** is a disruptive, beautifully designed, all-in-one cloud & AI platform that makes digital sovereignty effortless.

Think Netflix for Cloud & AI apps: **mAxI.cloud** is a curated catalog of **300+ configured, secured and fully maintained** github or Open Source projects representing more than **10+ million ⭐**.

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
