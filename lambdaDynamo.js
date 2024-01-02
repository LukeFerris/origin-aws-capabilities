import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

// crypto can be used to generate a unique id using: crypto.randomUUID()
import crypto from "crypto";

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
        // make sure you process the Dynamo DB result
        // It will return arrays of Items which are objects rather than simple values
        // You should make sure you process them so that you can return a simpler array of values
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
