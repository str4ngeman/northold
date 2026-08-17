#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose pull app
docker compose up -d --remove-orphans
docker image prune -f
