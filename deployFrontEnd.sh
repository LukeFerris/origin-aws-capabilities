#!/bin/bash

# Set AWS region and dynamic stack name
REGION="eu-central-1"
PARENT_STACK="$PARENT_STACK_NAME"

# 1) Get all nested stacks (Physical IDs) from the parent
NESTED_STACKS=$(aws cloudformation list-stack-resources \
    --region "$REGION" \
    --stack-name "$PARENT_STACK" \
    --query "StackResourceSummaries[?ResourceType=='AWS::CloudFormation::Stack'].PhysicalResourceId" \
    --output text
)

if [[ -z "$NESTED_STACKS" ]]; then
    echo "Error: No nested stacks found in parent stack '$PARENT_STACK'."
    exit 1
fi

# 2) Iterate through each nested stack to find 'SiteCdn'
FOUND_STACK=""
SITECDN_PHYSICAL_ID=""

for STACK in $NESTED_STACKS; do
    # Check if this nested stack has a resource with LogicalResourceId == 'SiteCdn'
    RESULT=$(aws cloudformation list-stack-resources \
        --region "$REGION" \
        --stack-name "$STACK" \
        --query "StackResourceSummaries[?LogicalResourceId=='SiteCdn'].PhysicalResourceId" \
        --output text 2>/dev/null
    )

    # If RESULT is not "None" and not empty, we've found the right stack
    if [[ "$RESULT" != "None" && -n "$RESULT" ]]; then
        FOUND_STACK="$STACK"
        SITECDN_PHYSICAL_ID="$RESULT"
        break
    fi
done

BUCKET_PHYSICAL_ID=""
for STACK in $NESTED_STACKS; do
    # Check if this nested stack has a resource with LogicalResourceId == 'SiteCdn'
    RESULT=$(aws cloudformation list-stack-resources \
        --region "$REGION" \
        --stack-name "$STACK" \
        --query "StackResourceSummaries[?LogicalResourceId=='PublicSite'].PhysicalResourceId" \
        --output text 2>/dev/null
    )

    # If RESULT is not "None" and not empty, we've found the right stack
    if [[ "$RESULT" != "None" && -n "$RESULT" ]]; then
        FOUND_STACK="$STACK"
        BUCKET_PHYSICAL_ID="$RESULT"
        break
    fi
done

# 3) If not found, exit; else print info
if [[ -z "$FOUND_STACK" ]]; then
    echo "Error: Could not find any nested stack containing a resource with LogicalResourceId 'SiteCdn'."
    exit 1
else
    echo "Nested stack containing SiteCdn: $FOUND_STACK"
    echo "SiteCdn Physical Resource ID: $SITECDN_PHYSICAL_ID"
    echo "PublicSite Physical Resource ID: $SITECDN_PHYSICAL_ID"

    # Navigate to the React project directory
    cd ../../react-website/

    # Build the React project using Vite
    vite build --mode prod

    # Change to the production directory
    cd prod/

    # Sync built files to the S3 bucket
    aws s3 sync . s3://$BUCKET_PHYSICAL_ID/

    # Invalidate the CloudFront cache
    aws cloudfront create-invalidation --distribution-id="$SITECDN_PHYSICAL_ID" --paths "/"

    echo "Deployment complete!"

fi