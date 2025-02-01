#!/bin/bash

# Get cloudfront distribution id from AWS
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stack-resource --region=eu-central-1 --stack-name=o-[SOLUTION_ID_SHORT]-[USERNAME_LOWER]-prod --logical-resource-id=SiteCdn --output=text --query=StackResourceDetail.PhysicalResourceId)

cd ../../react-website/

vite build --mode prod

cd prod/

aws s3 sync . s3://[SOLUTION_ID_SHORT]-[LOWER_CASE_CELL_ID]s3/
aws cloudfront create-invalidation --distribution-id=$CLOUDFRONT_DISTRIBUTION_ID --paths="/"
