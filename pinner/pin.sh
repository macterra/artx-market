#!/bin/bash

while true
do
    docker exec artx-market-ipfs-1 ipfs add -r -Q /export/data > /tmp/CID
    cp /tmp/CID /data

    current_date=$(date)
    CID=$(cat /tmp/CID)
    echo "$current_date: $CID"
    echo "$current_date: $CID" >> /var/log/CID.log

    sleep 60
done
