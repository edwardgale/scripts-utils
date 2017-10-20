#!/usr/bin/env bash

## Export private key from keystore
#jkskeystore=ls | grep *identity*jks

keystore=XXXXXX
password=XXXXXX

alias=$(keytool -list -keystore $keystore -storepass $password| grep PrivateKeyEntry | cut -d" " -f1 | sed s/,//)
keytool -importkeystore -srckeystore $keystore -destkeystore keystore.p12 -deststoretype PKCS12 \
          -srcalias $alias -srcstorepass $password -deststorepass $password -destkeypass $password

#export private key. !! cut and paste and run this on its own
openssl  pkcs12 -in keystore.p12  -nocerts -out key.pem

#export public cert. !! cut and paste and run this on its own
openssl pkcs12 -in keystore.p12 -nokeys -out cert.pem
