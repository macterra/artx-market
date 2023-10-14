#!/bin/bash

# Absolute path to docker executable
DOCKER_PATH=/usr/bin/docker

# Get the directory of the currently executing script
DIR="$(dirname "$0")"

# Set DATA_PATH relative to the script location
DATA_PATH="$DIR/data"

# Run the docker command
$DOCKER_PATH exec artx-market-ipfs-1 ipfs add -r -Q /export/data > /tmp/CID

# Copy the CID to DATA_PATH
cp /tmp/CID $DATA_PATH/
