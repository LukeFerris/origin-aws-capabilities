// An example is shown below for a lambda function that interacts with AWS Secrets Manager to manage secrets
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

// handler
export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;

    // checking the method is sufficient as this comes from API Gateway which has already confirmed the path
    // as such, never do any further validation checks on the path
    if (httpMethod == "POST") {
      const { secretName, secretValue } = JSON.parse(event.body);

      // Check if secretName and secretValue are provided
      if (!secretName || !secretValue) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Secret name and value are required",
          }),
        };
      }

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
          message: "Secret created successfully",
          secretName,
          secretValue,
        }),
      };
    } else if (httpMethod == "PUT") {
      const { secretName, secretValue } = JSON.parse(event.body);

      // Check if secretName and secretValue are provided
      if (!secretName || !secretValue) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Secret name and value are required",
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
          message: "Secret updated successfully",
          secretName,
          secretValue,
        }),
      };
    } else if (httpMethod == "DELETE") {
      const { secretName } = JSON.parse(event.body);

      // Check if secretName is provided
      if (!secretName) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Secret name is required",
          }),
        };
      }

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
    } else if (httpMethod == "GET") {
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
