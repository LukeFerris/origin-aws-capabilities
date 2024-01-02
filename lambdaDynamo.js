import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "eu-central-1" });

const tableName = process.env.TABLE_NAME;

// handler
export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;

    if (httpMethod === "GET") {
      // get incubators for the given user
      const result = await dynamoClient.send(
        new ScanCommand({
          TableName: tableName,
          ProjectionExpression: "config",
        })
      );

      return JSON.stringify({
        username: username,
        incubators: incubators,
      });
    }
    ... continued for other httpMethods
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to process request",
      }),
    };
  }
}
