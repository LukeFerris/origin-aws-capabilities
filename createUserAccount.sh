#!/bin/bash

USER_POOL_ID=$(aws cloudformation describe-stack-resource --region=eu-central-1 --stack-name=o-[SOLUTION_ID_SHORT]-[MODE] --logical-resource-id=[CELL_ID]UserPool --output=text --query=StackResourceDetail.PhysicalResourceId)

aws cognito-idp  admin-create-user --region=eu-central-1 --user-pool-id=$USER_POOL_ID --username=Admin --user-attributes Name=email,Value=admin@theorigin.ai --message-action=SUPPRESS --output=text

aws cognito-idp admin-set-user-password --user-pool-id $USER_POOL_ID --username Admin --password Admin2024! --permanent