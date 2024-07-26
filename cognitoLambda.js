/**
 * AWS Cognito User Management Lambda Function
 *
 * This Lambda function provides CRUD operations for managing users in AWS Cognito.
 * It allows creating, reading, updating, and deleting users, as well as managing their group memberships.
 *
 * userData Structure:
 * For POST (create) and PUT (update) operations, the userData should be structured as follows:
 *
 * {
 *   "username": "string",  // Required for POST, not used for PUT (derived from path)
 *   "password": "string",  // Required for POST, optional for PUT
 *   "email": "string",     // Required for POST, optional for PUT
 *   "groups": ["string"]   // Optional. Array of group names the user should belong to
 * }
 *
 * Notes:
 * - For POST (create user):
 *   - 'username', 'password' and 'email' are required
 *   - 'groups' is optional
 * - For PUT (update user):
 *   - 'password' is optional. If provided, it will update the user's password
 *   - 'groups' is optional. If provided, it will update the user's group memberships
 *  - 'email' is optional. If provided, it will update the user's email
 * - This implementation does not allow setting or updating other user attributes but can be extended to do so
 * - Group management is handled by adding/removing the user from specified groups
 *
 * Environment Variables:
 * - USER_POOL_ID: The ID of the Cognito User Pool to operate on
 *
 * API Endpoints:
 * - GET /users : List all users
 * - GET /users/{username} : Get details of a specific user
 * - POST /users : Create a new user
 * - PUT /users/{username} : Update an existing user
 * - DELETE /users/{username} : Delete a user
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "eu-central-1",
});

const userPoolId = process.env.USER_POOL_ID;

export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const userId = path.split("/").pop();
    const userData = JSON.parse(event.body || "{}");

    switch (httpMethod) {
      case "GET":
        if (userId === "users") {
          return await listUsers();
        } else {
          return await getUser(userId);
        }
      case "POST":
        return await createUser(userData);
      case "PUT":
        return await updateUser(userId, userData);
      case "DELETE":
        return await deleteUser(userId);
      default:
        return methodNotAllowed();
    }
  } catch (error) {
    console.error(error);
    return serverError(error);
  }
}

async function listUsers() {
  const params = {
    UserPoolId: userPoolId,
  };

  const command = new ListUsersCommand(params);
  const response = await cognitoClient.send(command);

  const users = await Promise.all(
    response.Users.map(async (user) => ({
      username: user.Username,
      groups: await getUserGroups(user.Username),
    }))
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(users),
  };
}

async function getUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
  };

  const command = new AdminGetUserCommand(params);
  const user = await cognitoClient.send(command);

  const groups = await getUserGroups(username);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user.Username,
      groups: groups,
    }),
  };
}

async function createUser(userData) {
  const { username, password, email, groups } = userData;

  if (!username || !password || !email) {
    return badRequest("Username, password and email are required");
  }

  const params = {
    UserPoolId: userPoolId,
    Username: username,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
    MessageAction: "SUPPRESS",
  };

  await cognitoClient.send(new AdminCreateUserCommand(params));

  // Set the user's password and mark the user as confirmed
  await setUserPassword(username, password);

  if (groups && groups.length > 0) {
    await updateUserGroups(username, groups);
  }

  return success(`User ${username} created and confirmed successfully`);
}

async function setUserPassword(username, password) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    Password: password,
    Permanent: true,
  };

  await cognitoClient.send(new AdminSetUserPasswordCommand(params));
}

async function updateUser(username, userData) {
  const { password, groups } = userData;

  if (password) {
    await resetPassword(username, password);
  }

  if (groups) {
    await updateUserGroups(username, groups);
  }

  return success(`User ${username} updated successfully`);
}

async function deleteUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
  };

  await cognitoClient.send(new AdminDeleteUserCommand(params));
  return success(`User ${username} deleted successfully`);
}

async function resetPassword(username, newPassword) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    Password: newPassword,
    Permanent: true,
  };

  await cognitoClient.send(new AdminSetUserPasswordCommand(params));
}

async function updateUserGroups(username, newGroups) {
  const currentGroups = await getUserGroups(username);

  const groupsToAdd = newGroups.filter(
    (group) => !currentGroups.includes(group)
  );
  const groupsToRemove = currentGroups.filter(
    (group) => !newGroups.includes(group)
  );

  for (const group of groupsToAdd) {
    await addUserToGroup(username, group);
  }

  for (const group of groupsToRemove) {
    await removeUserFromGroup(username, group);
  }
}

async function getUserGroups(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
  };

  const command = new AdminListGroupsForUserCommand(params);
  const response = await cognitoClient.send(command);

  return response.Groups.map((group) => group.GroupName);
}

async function addUserToGroup(username, groupName) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    GroupName: groupName,
  };

  await cognitoClient.send(new AdminAddUserToGroupCommand(params));
}

async function removeUserFromGroup(username, groupName) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    GroupName: groupName,
  };

  await cognitoClient.send(new AdminRemoveUserFromGroupCommand(params));
}

function success(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
}

function badRequest(message) {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
}

function methodNotAllowed() {
  return {
    statusCode: 405,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Method not allowed" }),
  };
}

function serverError(error) {
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Failed to process request",
      error: error.toString(),
    }),
  };
}
