#!/bin/bash

# Function to recursively find the UserPool in nested stacks
find_user_pool_id() {
  local stack_name=$1
  local logical_resource_id="[CELL_ID]UserPool"
  local region="eu-central-1"

  echo "Searching for UserPool in stack: $stack_name"

  # Attempt to retrieve the UserPool in the current stack
  USER_POOL_ID=$(aws cloudformation describe-stack-resource \
    --region "$region" \
    --stack-name "$stack_name" \
    --logical-resource-id "$logical_resource_id" \
    --output text \
    --query "StackResourceDetail.PhysicalResourceId" 2>/dev/null)

  if [[ -n $USER_POOL_ID ]]; then
    echo "Found UserPool ID: $USER_POOL_ID"
    return 0
  fi

  # Retrieve all nested stacks
  nested_stacks=$(aws cloudformation describe-stack-resources \
    --region "$region" \
    --stack-name "$stack_name" \
    --query "StackResources[?ResourceType=='AWS::CloudFormation::Stack'].PhysicalResourceId" \
    --output text)

  # Iterate through nested stacks and search for the UserPool
  for nested_stack in $nested_stacks; do
    echo "Checking nested stack: $nested_stack"
    find_user_pool_id "$nested_stack" && return 0
  done

  return 1
}

# Main Script
PARENT_STACK_NAME="o-[SOLUTION_ID_SHORT]-[USERNAME_LOWER]-[MODE]"

# Find UserPool ID
if find_user_pool_id "$PARENT_STACK_NAME"; then
  echo "UserPool ID found: $USER_POOL_ID"

  # Create Admin user
  aws cognito-idp admin-create-user \
    --region "eu-central-1" \
    --user-pool-id "$USER_POOL_ID" \
    --username "Admin" \
    --user-attributes Name=email,Value=admin@theorigin.ai \
    --message-action SUPPRESS \
    --output text

  # Set Admin user password
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "Admin" \
    --password "Admin2024!" \
    --permanent

  # Add Admin user to Admin group
  aws cognito-idp admin-add-user-to-group \
    --region "eu-central-1" \
    --user-pool-id "$USER_POOL_ID" \
    --username "Admin" \
    --group-name "Admin"

  echo "Admin user created and added to Admin group successfully."

else
  echo "UserPool ID not found in the stack or its nested stacks."
  exit 1
fi