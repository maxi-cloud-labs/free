#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
#	exit 0
fi

echo "#Reset tabby##################"
TIMEOUT=10
echo "10 seconds to watch for llam.cpp..."
while [ $TIMEOUT -gt 0 ]; do
	sleep 1
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout waiting for llamacpp" && break
	nc -z localhost 8099 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done

systemctl stop tabby.service
rm -rf /disk/admin/modules/tabby
rm -rf /disk/admin/.tabby
mkdir /disk/admin/modules/tabby
cat > /disk/admin/modules/tabby/config.toml << EOF
[model.embedding.http]
kind = "llama.cpp/embedding"
api_endpoint = "http://localhost:8099"

[model.completion.http]
kind = "openai/completion"
api_endpoint = "http://localhost:8091/auth/ai/tabby/v1"
model_name = "_codecompletion_"

[model.chat.http]
kind = "openai/chat"
api_endpoint = "http://localhost:8091/auth/ai/tabby/v1"
model_name = "_codechat_"

[anonymousUsageTracking]
disable = true
EOF
ln -sf /disk/admin/modules/tabby /disk/admin/.tabby
systemctl start tabby.service
systemctl enable tabby.service

/usr/local/modules/_core_/reset/tabby-user.sh &
