#!/bin/bash

cd ./ngclient;

npm i;

cd ..;

npm run release --prefix ./ngclient

rm -r ./server/wwwroot/

mv ./output/ ./server/wwwroot

dotnet restore ./server/server.csproj

dotnet publish ./server/server.csproj -o ./koko

powershell Compress-Archive -Path '.\koko\*'  -DestinationPath server.zip

rm -rf ./koko

curl -X POST -u EuvsCI:k0k0_1234 --data-binary @"./server.zip" https://couchtraveller.scm.azurewebsites.net/api/zipdeploy

rm -r ./server/wwwroot/

rm ./server.zip

echo 'probably done!!'