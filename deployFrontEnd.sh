#!/bin/bash

# Set AWS region and dynamic stack name
REGION="eu-central-1"
PARENT_STACK="o[SOLUTION_ID_SHORT]-[USERNAME_LOWER_LAST3]-p"

# Find the nested stack that contains the SiteCdn resource
NESTED_STACK=$(aws cloudformation list-stack-resources \
    --region "$REGION" \
    --stack-name "$PARENT_STACK" \
    --query "StackResourceSummaries[?LogicalResourceId=='SiteCdn'].PhysicalResourceId" \
    --output text)

# Ensure the nested stack was found
if [[ -z "$NESTED_STACK" ]]; then
    echo "Error: Could not find the nested stack containing SiteCdn. Exiting."
    exit 1
fi

echo "Found nested stack: $NESTED_STACK"

# Now find CloudFront Distribution ID from the nested stack
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stack-resources \
    --region "$REGION" \
    --stack-name "$NESTED_STACK" \
    --query "StackResources[?LogicalResourceId=='SiteCdn'].PhysicalResourceId" \
    --output text)

# Ensure the CloudFront distribution ID was found before proceeding
if [[ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    echo "Error: Could not retrieve CloudFront distribution ID. Exiting."
    exit 1
fi

echo "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"

# Navigate to the React project directory
cd ../../react-website/ || exit

# Build the React project using Vite
vite build --mode prod

# Change to the production directory
cd prod/ || exit

# Sync built files to the S3 bucket
aws s3 sync . s3://[SOLUTION_ID_SHORT]-productioncloudfronts3/

# Invalidate the CloudFront cache
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"

echo "Deployment complete!"
