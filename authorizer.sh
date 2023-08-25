#!/bin/bash

docker run -e BTC_CONNECT=$BTC_CONNECT -v $PWD/data:/app/data macterra/artx-authorizer $1
