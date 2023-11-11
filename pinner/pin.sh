#!/bin/bash

while true
do
    docker exec artx-market-ipfs-1 ipfs add -r -Q /export/data > /tmp/CID
    CID=$(cat /tmp/CID)

    if [[ -n "$CID" ]]; then
        cp /tmp/CID /data
        current_date=$(date)
        echo "$current_date: $CID"
        echo "$current_date: $CID" >> /var/log/CID.log
    fi

    sleep 60
done
