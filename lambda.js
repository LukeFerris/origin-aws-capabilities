// An example is shown below for a lambda function

// handler
export async function handler(event, context) {
  try {
    // Validate Content-Type header
    const contentType =
      event.headers["Content-Type"] || event.headers["content-type"];
    if (contentType !== "application/json") {
      return {
        statusCode: 415, // Unsupported Media Type
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Invalid Content-Type. Expected 'application/json'.",
        }),
      };
    }

    const httpMethod = event.requestContext.http.method;

    if (httpMethod === "POST") {
      return {
        headers: {
          "Content-Type": "application/json",
        },
        statusCode: 200,
      };
    } else {
      return {
        headers: {
          "Content-Type": "application/json",
        },
        statusCode: 405,
        body: JSON.stringify({
          message: "Method not allowed",
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to process request. Error was: " + error.toString(),
      }),
    };
  }
}
