#!/usr/bin/env bash

# delete the contents of a bucket and then the bucket itself.
# usage: ./bucket_delete.sh bucketname includenames
aws s3 ls s3://$1 --include "$2" --recursive
aws s3 rb $1
