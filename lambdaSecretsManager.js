import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import { initStructuredLoggingContext } from "/opt/nodejs/src/responsible_for/logging/loggingUtility.js"; // IMPORTANT: Do not remove this

// all code should use eu-central-1 region
const secretsManagerClient = new SecretsManagerClient({
  region: "eu-central-1",
}); // do not change the region from eu-central-1

const secretName = "[SOLUTION_ID]-[CELL_ID]";

// handler
export async function handler(event, context) {
  // Initialize structured logging with headers
  initStructuredLoggingContext(event.headers); // IMPORTANT DO NOT REMOVE THIS

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

      await createOrUpdate(secretValue);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Secret ${secretName} created/updated successfully`,
          secretValue,
        }),
      };
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

      await createOrUpdate(secretValue);

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
      try {
        // Check if the secret exists
        await secretsManagerClient.send(
          new DescribeSecretCommand({
            SecretId: secretName,
          })
        );

        // If DescribeSecretCommand succeeds, the secret exists
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secretExists: true, // Secret found
          }),
        };
      } catch (error) {
        if (error.name === "ResourceNotFoundException") {
          // If secret is not found, return false
          return {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              secretExists: false, // Secret not found
            }),
          };
        } else {
          throw error;
        }
      }
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

async function createOrUpdate(secretValue) {
  let secretExists = false;

  try {
    // Check if the secret exists
    await secretsManagerClient.send(
      new DescribeSecretCommand({
        SecretId: secretName,
      })
    );
    secretExists = true;
  } catch (error) {
    if (error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  if (secretExists) {
    console.log("Secret already exists, so updating.");
    // Update the secret if it exists
    await secretsManagerClient.send(
      new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: secretValue,
      })
    );
  } else {
    console.log("Secret does not exist, so creating.");
    // Create a new secret if it does not exist
    await secretsManagerClient.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
      })
    );
  }

  return;
}
