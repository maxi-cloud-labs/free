#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset openclaw##################"
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
systemctl stop openclaw.service
rm -rf /disk/admin/modules/openclaw
mkdir /disk/admin/modules/openclaw
mkdir /disk/admin/modules/openclaw/agents
mkdir /disk/admin/modules/openclaw/workspace
cat > /disk/admin/modules/openclaw/openclaw.json << EOF
{
  "meta": {
    "lastTouchedVersion": "2026.2.6-3",
    "lastTouchedAt": "2026-02-08T11:20:51.218Z"
  },
  "agents": {
    "defaults": {
      "workspace": "/disk/admin/modules/openclaw/workspace",
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto"
  },
  "messages": {
    "ackReactionScope": "group-mentions"
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "authorizationisdoneautomaticallybybackend"
    },
    "port": 18789,
    "bind": "loopback",
    "trustedProxies": ["127.0.0.1", "::1"],
    "controlUi": {
        "dangerouslyDisableDeviceAuth": true,
        "allowedOrigins": [
            "https://openclaw.${PRIMARY}"
        ]
    },
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "wizard": {
    "lastRunAt": "2026-02-08T11:20:51.212Z",
    "lastRunVersion": "2026.2.6-3",
    "lastRunCommand": "onboard",
    "lastRunMode": "local"
  }
}
EOF
systemctl start openclaw.service
systemctl enable openclaw.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
