#!/bin/sh

cd /home/ai
/home/ai/rootfs/usr/local/modules/_core_/pip.sh -f /usr/local/modules/litellm -v 3.12 -s
echo "PATH before any modif: $PATH"
PATHOLD=$PATH
PATH=/usr/local/modules/litellm/bin:$PATHOLD
export PATH=/usr/local/modules/litellm/bin:$PATHOLD
echo "PATH new: $PATH python: `python --version`"
cd /usr/local/modules/litellm
pip install prisma litellm 'litellm[proxy]'
cd lib/python*/site-packages/litellm/proxy
rm -rf /usr/local/modules/litellm/prismahome
mkdir /usr/local/modules/litellm/prismahome
HOME=/usr/local/modules/litellm/prismahome prisma generate --schema schema.prisma
PATH=$PATHOLD
export PATH=$PATHOLD
echo "PATH restored: $PATH"
