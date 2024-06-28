import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
} from "@aws-sdk/client-secrets-manager";

// all code should use eu-central-1 region
const secretsManagerClient = new SecretsManagerClient({
  region: "eu-central-1",
}); // do not change the region from eu-central-1

const secretName = "[SOLUTION_ID]-[CELL_ID]";

// handler
export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;

    // checking the method is sufficient as this comes from API Gateway which has already confirmed the path
    // as such, never do any further validation checks on the path
    if (httpMethod === "POST") {
      const { secretValue } = JSON.parse(event.body);

      // Check if secretValue is provided
      if (!secretValue) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Secret value is required",
          }),
        };
      }

      // Check if the secret already exists
      const result = await secretsManagerClient.send(
        new ListSecretsCommand({})
      );
      const secretExists = result.SecretList.some(
        (secret) => secret.Name === secretName
      );

      if (secretExists) {
        // Update the secret if it exists
        await secretsManagerClient.send(
          new PutSecretValueCommand({
            SecretId: secretName,
            SecretString: secretValue,
          })
        );

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Secret ${secretName} updated successfully`,
            secretValue,
          }),
        };
      } else {
        // Create a new secret if it does not exist
        await secretsManagerClient.send(
          new CreateSecretCommand({
            Name: secretName,
            SecretString: secretValue,
          })
        );

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Secret ${secretName} created successfully`,
            secretValue,
          }),
        };
      }
    } else if (httpMethod === "PUT") {
      const { secretValue } = JSON.parse(event.body);

      // Check if secretValue is provided
      if (!secretValue) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Secret value is required",
          }),
        };
      }

      await secretsManagerClient.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: secretValue,
        })
      );

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Secret ${secretName} updated successfully`,
          secretValue,
        }),
      };
    } else if (httpMethod === "DELETE") {
      await secretsManagerClient.send(
        new DeleteSecretCommand({
          SecretId: secretName,
        })
      );

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Secret ${secretName} deleted successfully`,
        }),
      };
    } else if (httpMethod === "GET") {
      const result = await secretsManagerClient.send(
        new ListSecretsCommand({})
      );

      const secretNames = result.SecretList.map((secret) => secret.Name);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(secretNames),
      };
    } else {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Method not allowed",
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to process request. Error was: " + error.toString(),
      }),
    };
  }
}
