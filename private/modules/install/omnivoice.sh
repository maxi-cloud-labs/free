#!/bin/sh

cd /home/ai
/home/ai/rootfs/usr/local/modules/_core_/pip.sh -f /usr/local/modules/omnivoice -v 3.11 -s
echo "PATH before any modif: $PATH"
PATHOLD=$PATH
PATH=/usr/local/modules/omnivoice/bin:$PATHOLD
export PATH=/usr/local/modules/omnivoice/bin:$PATHOLD
echo "PATH new: $PATH python: `python --version`"
pip install torch==2.8.0 torchaudio==2.8.0
pip install omnivoice num2words
PATH=$PATHOLD
export PATH=$PATHOLD
echo "PATH restored: $PATH"
