#!/bin/bash

# Get CloudFront distribution ID from AWS, searching in nested stacks
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stack-resources \
    --region eu-central-1 \
    --stack-name o-[SOLUTION_ID_SHORT]-[USERNAME_LOWER]-prod \
    --query "StackResources[?LogicalResourceId=='SiteCdn'].PhysicalResourceId" \
    --output text)

# Ensure the CloudFront distribution ID was found before proceeding
if [[ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    echo "Error: Could not retrieve CloudFront distribution ID. Exiting."
    exit 1
fi

# Navigate to the React project directory
cd ../../react-website/

# Build the React project using Vite
vite build --mode prod

# Change to the production directory
cd prod/

# Sync built files to the S3 bucket
aws s3 sync . s3://[SOLUTION_ID_SHORT]-[LOWER_CASE_CELL_ID]s3/

# Invalidate the CloudFront cache
aws cloudfront create-invalidation --distribution-id="$CLOUDFRONT_DISTRIBUTION_ID" --paths "/"
