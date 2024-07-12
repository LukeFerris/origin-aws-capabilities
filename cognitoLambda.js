import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "eu-central-1",
});

const userPoolId = "[SOLUTION_ID]-[CELL_ID]-UserPoolId";
const clientId = "[SOLUTION_ID]-[CELL_ID]-UserPoolClientId";

export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;
    const { action, username, ...userData } = JSON.parse(event.body || "{}");

    switch (httpMethod) {
      case "POST":
        switch (action) {
          case "createUser":
            return await createUser(username, userData);
          case "deleteUser":
            return await deleteUser(username);
          case "updateUser":
            return await updateUser(username, userData);
          case "resetPassword":
            return await resetPassword(username, userData.password);
          case "selfRegister":
            return await selfRegister(username, userData);
          default:
            return badRequest("Invalid action");
        }
      default:
        return methodNotAllowed();
    }
  } catch (error) {
    console.error(error);
    return serverError(error);
  }
}

// ... (keep the existing functions: createUser, deleteUser, updateUser, resetPassword)

async function selfRegister(username, userData) {
  const { password, ...attributes } = userData;

  // Step 1: Sign up the user
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

  // Step 2: Confirm the user (skip email verification)
  const confirmParams = {
    UserPoolId: userPoolId,
    Username: username,
  };

  await cognitoClient.send(new AdminConfirmSignUpCommand(confirmParams));

  return success(`User ${username} registered and confirmed successfully`);
}

async function createUser(username, userData) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    TemporaryPassword: userData.temporaryPassword,
    UserAttributes: Object.entries(userData)
      .filter(([key]) => key !== "temporaryPassword")
      .map(([Name, Value]) => ({ Name, Value })),
  };

  await cognitoClient.send(new AdminCreateUserCommand(params));
  return success(`User ${username} created successfully`);
}

async function deleteUser(username) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
  };

  await cognitoClient.send(new AdminDeleteUserCommand(params));
  return success(`User ${username} deleted successfully`);
}

async function updateUser(username, userData) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    UserAttributes: Object.entries(userData).map(([Name, Value]) => ({
      Name,
      Value,
    })),
  };

  await cognitoClient.send(new AdminUpdateUserAttributesCommand(params));
  return success(`User ${username} updated successfully`);
}

async function resetPassword(username, newPassword) {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    Password: newPassword,
    Permanent: true,
  };

  await cognitoClient.send(new AdminSetUserPasswordCommand(params));
  return success(`Password for user ${username} reset successfully`);
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
