
for i in `aws logs   describe-log-groups | jq  '.[] | .[].logGroupName' | sed 's:"::g'`
do
  echo "aws logs delete-log-group --log-group-name $i"
  aws logs delete-log-group --log-group-name "$i"
  sleep 1
done

