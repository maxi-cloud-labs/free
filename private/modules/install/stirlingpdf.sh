#!/bin/sh

apt-get install -y libleptonica-dev zlib1g-dev libreoffice-writer libreoffice-calc libreoffice-impress unpaper ocrmypdf
apt-get install -y tesseract-ocr
mv /usr/local/modules/stirlingpdf /home/ai/build
mkdir /usr/local/modules/stirlingpdf
cd /home/ai/build/stirlingpdf
/home/ai/rootfs/usr/local/modules/_core_/pip.sh -f /usr/local/modules/stirlingpdf -s
echo "PATH before any modif: $PATH"
PATHOLD=$PATH
PATH=/usr/local/modules/stirlingpdf/bin:$PATHOLD
export PATH=/usr/local/modules/stirlingpdf/bin:$PATHOLD
echo "PATH new: $PATH python: `python --version`"
pip install uno opencv-python-headless unoconv pngquant WeasyPrint
pip install unoserver
PATH=$PATHOLD
export PATH=$PATHOLD
echo "PATH restored: $PATH"
wget -nv --show-progress --progress=bar:force:noscroll https://github.com/Stirling-Tools/Stirling-PDF/releases/download/v2.5.3/Stirling-PDF.jar
cp -a scripts Stirling-PDF.jar /usr/local/modules/stirlingpdf
