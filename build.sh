#!/bin/sh
DENO_VERSION="v1.34.2"
DENOFLARE_VERSION="v0.6.0"
curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=./deno-v1.40.2 sh -s v1.40.2
NO_COLOR=1 DENO_VERSION=v1.40.2 DENOFLARE_VERSION=${DENOFLARE_VERSION} \
    ./deno-v1.40.2/bin/deno run --allow-all \
    https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/cli/cli.ts \
    site generate . ./output --verbose