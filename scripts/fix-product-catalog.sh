#!/bin/bash

# Script to run the update-product-catalog.ts script with the correct parameters

# Check if arguments are provided
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <productId> <catalogId> [fixImages]"
  echo "Example: $0 34 1 true"
  exit 1
fi

PRODUCT_ID=$1
CATALOG_ID=$2
FIX_IMAGES=${3:-false}

echo "Updating product $PRODUCT_ID with catalog $CATALOG_ID (fixImages=$FIX_IMAGES)"

# Execute the TypeScript script with the provided arguments
npx tsx scripts/update-product-catalog.ts $PRODUCT_ID $CATALOG_ID $FIX_IMAGES