#!/usr/bin/env bash

# Calculates your hourly EC2 costs - ***assumes ***
# ASSUMES:
# all instances use RHEL enterprise
# all instances are dedicated instances
# jq is installed https://stedolan.github.io/jq/download/

# Set this line to what profile you want to use.
AWS_PROFILE=""
# Set this line to what region you want to check instances for
AWS_REGION=eu-west-1

[ -z "$AWS_REGION" ] && AWS_REGION="eu-west-1"
[ -z "$AWS_PROFILE" ] && AWS_PROFILE="default"

echo "**STEP 1 downloading latest pricing info for $AWS_REGION"
[ ! -d ec2-json ] && mkdir ec2-json
url="https://pricing.us-east-1.amazonaws.com"$(curl https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/region_index.json \
   | jq -r ".regions[] | select(.regionCode==\"${AWS_REGION}\")| .currentVersionUrl")

region=`echo $url | awk -F"/"  '{print $9}'`
curl $url > ec2-json/${region}-ec2-price

echo "**STEP 2 downloading instance information for profile $AWS_PROFILE"
count=total=0
declare -A prices
tenancy="\"Shared\""
typeset -i count
for instance in $(aws ec2 describe-instances --profile $AWS_PROFILE --region $AWS_REGION --filters Name=instance-state-name,Values=running \
--query 'Reservations[].Instances[].[{t:Tags[?Key==`Name`].Value|[0],i:InstanceType}]|[][t,i]' | jq -r '.[]|@csv'); do

  instanceType=`echo $instance | cut -d"," -f2`
  instanceName=`echo $instance | cut -d"," -f1`
  echo "$instance"
  # t2.nanos only have Linux as OS
  [ "$instanceType" == "\"t2.nano\"" ] && os="\"Linux\"" || os="\"RHEL\""
  # check to see if we have searched for this instance type already
  if [ ${prices[$instanceType]}  ]; then
    price=${prices[$instanceType]}
  else
    sku=`jq ".products[] | select(.attributes.instanceType==$instanceType and .attributes.operatingSystem==$os and .attributes.tenancy==$tenancy) \
    | .sku" ec2-json/${region}-ec2-price`
        price=`jq -r ".terms.OnDemand[][] | select(.sku==$sku)  | .priceDimensions[] | .pricePerUnit | .USD" ec2-json/${region}-ec2-price`
   # We add the price to a lookup associative array to speed up processing
    prices[$instanceType]=$price
  fi
  price=`printf "%-7.4f\n" $price`
  total=`awk "BEGIN {print $total+$price}"`
  echo "$instanceName, $instanceType, $price, $total" | sed 's:"::g'
  count=$count+1
done

echo;echo;
echo "** NOTE This calc assumes RHEL for the OS and Shared tenancy for all instances!"
echo
echo "***Hourly burn for $count instances is: $total USD per hour"
echo