#!/bin/sh

mkdir /usr/local/modules/llamacpp
wget -q --show-progress --progress=bar:force:noscroll -O /usr/local/modules/llamacpp/nomic-embed-text-v1.5.Q8_0.gguf https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf
