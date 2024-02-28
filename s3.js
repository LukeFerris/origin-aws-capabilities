import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize the S3 client
const s3Client = new S3Client({ region: "eu-central-1" }); // Replace 'YOUR_REGION' with your S3 bucket's region
const bucketName = process.env.BUCKET_NAME;

const handler = async (event, context) => {
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
