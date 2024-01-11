#!/bin/bash

counter=0

while true
do
    docker exec artx-market-ipfs-1 ipfs add -r -Q /export/data > /tmp/CID
    CID=$(cat /tmp/CID)
    current_date=$(date)

    if [[ -n "$CID" ]]; then
        cp /tmp/CID /data
        echo "$current_date: $CID"
        echo "$current_date: $CID" >> /var/log/CID.log
    fi

    if (( counter % 60 == 0 )); then
        echo "$current_date: running repo gc..."
        docker exec artx-market-ipfs-1 ipfs repo gc
    fi

    ((counter++))

    sleep 60
done
