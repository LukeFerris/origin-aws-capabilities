import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  ListUsersCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "eu-central-1",
});

const userPoolId = "[SOLUTION_ID]-[CELL_ID]-UserPoolId";
const clientId = "[SOLUTION_ID]-[CELL_ID]-UserPoolClientId";

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

  const users = response.Users.map((user) => ({
    username: user.Username,
    attributes: user.Attributes,
  }));

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

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user.Username,
      attributes: user.UserAttributes,
    }),
  };
}

async function createUser(userData) {
  const { username, password, ...attributes } = userData;

  if (password) {
    // Self-registration
    const signUpParams = {
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    };

    await cognitoClient.send(new SignUpCommand(signUpParams));

    const confirmParams = {
      UserPoolId: userPoolId,
      Username: username,
    };

    await cognitoClient.send(new AdminConfirmSignUpCommand(confirmParams));
  } else {
    // Admin creation
    const params = {
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: generateTemporaryPassword(),
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    };

    await cognitoClient.send(new AdminCreateUserCommand(params));
  }

  return success(`User ${username} created successfully`);
}

async function updateUser(username, userData) {
  const { password, ...attributes } = userData;

  if (password) {
    await resetPassword(username, password);
  }

  if (Object.keys(attributes).length > 0) {
    const params = {
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    };

    await cognitoClient.send(new AdminUpdateUserAttributesCommand(params));
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

function generateTemporaryPassword() {
  return Math.random().toString(36).slice(-8);
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
