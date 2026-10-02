
#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset agentzero##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

rm -rf /disk/admin/modules/agentzero
mkdir /disk/admin/modules/agentzero

EXISTING_CONTAINERS=$(docker ps -a --filter "label=ai.agent0.managed=true" --format "{{.ID}}")
if [ -n "$EXISTING_CONTAINERS" ]; then
	docker stop $EXISTING_CONTAINERS
	docker rm $EXISTING_CONTAINERS
fi

INTERNALIP=` hostname -I | cut -d ' ' -f 1`
export chat_model_provider="ollama"
export chat_model_name="qwen3-coder:30b"
export chat_model_api_base="http://$INTERNALIP:11434"
export utility_model_provider="ollama"
export utility_model_name="qwen2.5:0.5b"
export utility_model_api_base="http://$INTERNALIP:11434"
export embedding_model_provider="ollama"
export embedding_model_name="nomic-embed-text"
export embedding_model_api_base="http://$INTERNALIP:11434"
mkdir -p /disk/admin/modules/agentzero/data
#cat > "$PP/data/settings.json" << EOF
#{ "mcp_servers": "{\n  \"mcpServers\": {\n    \"fli\": {\n      \"command\": \"python3\",\n      \"args\": [\"/tmp/test/bin/fli-mcp\"],\n      \"env\": {\n        \"PYTHONPATH\": \"/tmp/test/lib/python3.13/site-packages\",\n        \"PATH\": \"/tmp/test/bin:/usr/bin:/bin\"\n      }\n    }\n  }\n}" }
#EOF

mkdir -p /disk/admin/modules/agentzero/data/plugins/_model_config
cat > /disk/admin/modules/agentzero/data/plugins/_model_config/presets.yaml << EOF
- name: Default
  chat:
    provider: $chat_model_provider
    name: $chat_model_name
    api_base: $chat_model_api_base
    ctx_length: 200000
    ctx_history: 0.7
    vision: true
    max_embeds: 10
    rl_requests: 0
    rl_input: 0
    rl_output: 0
  utility:
    provider: $chat_model_provider
    name: $utility_model_name
    api_base: $chat_model_api_base
    ctx_length: 128000
    ctx_input: 0.7
    rl_requests: 0
    rl_input: 0
    rl_output: 0
  embedding:
    provider: $embedding_model_provider
    name: $embedding_model_name
    api_base: $embedding_model_api_base
    rl_requests: 0
    rl_input: 0
- name: Efficiency
  chat:
    provider: openrouter
    name: z-ai/glm-5.2
    api_base: ''
    ctx_length: 128000
    ctx_history: 0.7
    vision: false
    max_embeds: 10
    rl_requests: 0
    rl_input: 0
    rl_output: 0
  utility:
    provider: openrouter
    name: deepseek/deepseek-v4-flash
    api_base: ''
  embedding:
    provider: huggingface
    name: sentence-transformers/all-MiniLM-L6-v2
    api_base: ''
- name: Power
  chat:
    provider: openrouter
    name: openai/gpt-5.6-sol
    api_base: ''
    ctx_length: 200000
    ctx_history: 0.7
    vision: true
    max_embeds: 10
    rl_requests: 0
    rl_input: 0
    rl_output: 0
  utility:
    provider: openrouter
    name: openai/gpt-5.6-luna
    api_base: ''
  embedding:
    provider: huggingface
    name: sentence-transformers/all-MiniLM-L6-v2
    api_base: ''
EOF

chown -R admin:admin /disk/admin/modules/agentzero/data
docker run -d --name agent-zero-container --label ai.agent0.managed=true --restart unless-stopped -p 9553:80 -v "/disk/admin/modules/agentzero/data:/a0/usr" -e AUTH_LOGIN="$CLOUDNAME" -e AUTH_PASSWORD="$PASSWD" agent0ai/agent-zero:ready

echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/agentzero.json
chown admin:admin /disk/admin/modules/_config_/agentzero.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
