import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { initStructuredLoggingContext } from "/opt/nodejs/src/responsible_for/logging/loggingUtility.js"; // IMPORTANT: Do not remove this

// Initialize the S3 client
const s3Client = new S3Client({ region: "eu-central-1" }); // do not change the region from eu-central-1
const bucketName = process.env.BUCKET_NAME;

const handler = async (event, context) => {
  // Initialize structured logging with headers
  initStructuredLoggingContext(event.headers); // IMPORTANT DO NOT REMOVE THIS

  // IMPORTANT: THERE IS NO NEED TO CHECK FOR HTTP METHOD, AS WE ARE USING API GATEWAY TO TRIGGER THE LAMBDA FUNCTION
  // AND ANY METHOD WOULD WORK ANYWAY

  // Extracting the filename from the query string parameters
  const fileType = event.queryStringParameters?.fileType || "jpg";

  // use the aws requestId as the filename
  const objectKey = context.awsRequestId + "." + fileType;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // URL expiry time in seconds
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Presigned URL generated successfully",
        uploadUrl: url,
        fileName: objectKey,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Error generating presigned URL",
        error: err.message,
      }),
    };
  }
};

export { handler };
