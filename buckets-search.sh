#!/usr/bin/env bash

for i in `aws s3 ls  | awk '{print $3}'`; do
  echo $i
  aws s3 ls s3://$i --recursive | grep $1
done
