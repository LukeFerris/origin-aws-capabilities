// An example is shown below for a lambda function that interacts with DynamoDB to manage a company data entity
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { initStructuredLoggingContext } from "/opt/nodejs/src/responsible_for/logging/loggingUtility.js"; // IMPORTANT: Do not remove this

// crypto can be used to generate a unique id using: crypto.randomUUID()
import crypto from "crypto";

// all code should use eu-central-1 region
const dynamoClient = new DynamoDBClient({ region: "eu-central-1" }); // do not change the region from eu-central-1
const tableName = process.env.TABLE_NAME; // do not change the table name - it is imported from process.env

// handler
export async function handler(event, context) {
  // Initialize structured logging with headers
  initStructuredLoggingContext(event.headers); // IMPORTANT DO NOT REMOVE THIS

  try {
    // as this is an API Gateway event, this is the correct method to establish httpMethod.
    const httpMethod = event.requestContext.http.method;

    // checking the method is sufficient as this comes from API Gateway which has already confirmed the path
    // as such, never do any further validation checks on the path
    if (httpMethod == "POST") {
      const { companyName, address } = JSON.parse(event.body);

      // Check if companyName and address are provided and are not empty strings
      if (
        !companyName ||
        !address ||
        companyName.trim() === "" ||
        address.trim() === ""
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "CompanyName and address are required",
          }),
        };
      }

      const companyId = crypto.randomUUID();
      await dynamoClient.send(
        new PutItemCommand({
          TableName: tableName,
          Item: {
            companyId: { S: companyId },
            companyName: { S: companyName },
            address: { S: address },
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          companyName,
          address,
        }),
      };
    } else if (httpMethod == "DELETE") {
      // event.pathParameters can be null!
      const { id } = event.pathParameters || {};

      // check id is passed and is not an empty string
      if (!id && id !== "") {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "companyId is required as a path parameter",
          }),
        };
      }

      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: {
            companyId: { S: id },
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Company with ID ${id} deleted successfully`,
        }),
      };
    } else if (httpMethod == "GET") {
      // event.pathParameters can be undefined!
      const { id } = event.pathParameters || {};

      if (id && id !== "") {
        // Get individual item
        const result = await dynamoClient.send(
          new GetItemCommand({
            TableName: tableName,
            Key: {
              companyId: { S: id },
            },
          })
        );

        if (!result.Item) {
          return {
            statusCode: 404,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Company with ID ${id} not found`,
            }),
          };
        }

        // IMPORTANT: make sure we consider the possibility of a schema change. Some properties might be undefined and the code must be able to handle this
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: result.Item.companyId?.S || "N/A",
            companyName: result.Item.companyName?.S || "N/A",
            address: result.Item.address?.S || "N/A",
          }),
        };
      } else {
        // Get all items
        const result = await dynamoClient.send(
          new ScanCommand({
            TableName: tableName,
          })
        );

        const items = result.Items.map((item) => ({
          companyId: result.Item.companyId?.S || "N/A",
          companyName: result.Item.companyName?.S || "N/A",
          address: result.Item.address?.S || "N/A",
        }));

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(items),
        };
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
