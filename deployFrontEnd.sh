#!/bin/bash

# Get cloudfront distribution id from AWS
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stack-resource --region=eu-central-1 --stack-name=o-[SOLUTION_ID_SHORT]-prod --logical-resource-id=SiteCdn --output=text --query=StackResourceDetail.PhysicalResourceId)

# make a copy of the current react-website folder and all of its contents
cp -r react-website/ react-website-deploy/

cd react-website-deploy/

vite build

cd dist/

aws s3 sync . s3://o-[SOLUTION_ID_SHORT]-prod-origin-public-site/
aws cloudfront create-invalidation --distribution-id=$CLOUDFRONT_DISTRIBUTION_ID --paths="/"
