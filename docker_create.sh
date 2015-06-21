#!/bin/bash
## This snippet is used by the build script to create container specific to the project

docker create -P --name mw-file-$TYPE \
  --link mw-freeplane-converter-$TYPE:freeplane-converter \
  --link mw-storage-$TYPE:storage \
  mindweb/file
