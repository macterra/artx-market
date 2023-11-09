#!/bin/bash
set -e

npm test
docker build -t macterra/artx-market .
docker compose down
docker compose up -d
docker compose logs -f -t
