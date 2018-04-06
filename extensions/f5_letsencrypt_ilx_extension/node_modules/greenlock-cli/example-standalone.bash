#!/bin/bash

node bin/letsencrypt certonly \
  --agree-tos --email 'john.doe@gmail.com' \
  --standalone \
  --domains example.com,www.example.com \
  --server https://acme-staging.api.letsencrypt.org/directory \
  --config-dir ~/letsencrypt.test/etc
