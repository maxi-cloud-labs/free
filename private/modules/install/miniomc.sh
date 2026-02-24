#!/bin/sh

cd /usr/local/modules/miniomc
make
cp mc /usr/local/bin/
cd /home/ai
rm -rf /usr/local/modules/miniomc
