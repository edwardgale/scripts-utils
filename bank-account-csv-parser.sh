#echo "Download csv file(s) from Lloyds online banking"
#echo "Pass file(s) to the script"
#echo "This assumes a USA locale set in File->Spreadsheet settings"

cat $1 | grep -v "Transaction Description" | awk -F "," '{x=$1;split(x, a, "/") ;print a[2]"-"a[1]"-"a[3]","$5","$2","$7","$6","$8 }' | sort -n -t"-" -k3 -k1 -k2 -r
