// An example is shown below for a javascript lambda function
// import crypto from "crypto"; // use ES6 notation

// handler
export async function handler(event, context) {
  try {
    const httpMethod = event.requestContext.http.method;

    // checking the method is sufficient as this comes from API Gateway which has already confirmed the path
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
