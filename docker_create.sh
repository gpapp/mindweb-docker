#!/bin/bash
## This snippet is used by the build script to create container specific to the project

docker create -P --name mw-session-manager-1 \
  --link mw-db-1:db \
  mindweb/session-manager
