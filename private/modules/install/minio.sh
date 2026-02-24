#!/bin/sh

cd /usr/local/modules/minio
make
cp minio /usr/local/bin/
cd /home/ai
rm -rf /usr/local/modules/minio
