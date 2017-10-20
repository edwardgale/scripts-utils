#!/usr/bin/env bash

oldpassword="XXXXXXX"
jkskeystore="XXXXXXX"
jkstruststore="XXXXXXX"


alias=`keytool -list -keystore $jkskeystore -storepass $oldpassword | egrep "PrivateKeyEntry|keyEntry" | cut -d" " -f1 | sed s/,//`
randompassword=`< /dev/urandom tr -dc A-Za-z0-9 | head -c${1:-10};echo;`

# put the password out to a password.txt file (Store this securely / remove!)
echo $randompassword > password.txt

keytool -keypasswd  -alias $alias -keystore $jkskeystore -new $randompassword -storepass $oldpassword
keytool -storepasswd -keystore $jkskeystore -new $randompassword -storepass $oldpassword
# end change keystore password.

# change the trust store password here.
keytool -storepasswd -keystore $jkskeystore -new $randompassword -storepass $oldpassword
# end change truststore password.
