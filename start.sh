#!/usr/bin/env bash

cd "$(dirname "$0")"

set -xe

cd server
cargo build --release
cd -

cd client
npm run build
cd -

exec server/target/release/hexhavoc-server
