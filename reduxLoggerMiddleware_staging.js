import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Generate a unique GUID for the session
const sessionId = uuidv4();

// Function to send logs to your API (Lambda endpoint, etc.)
export const sendLogToAPI = (logEntry, solutionId, sessionId) => {
  const apiBaseUrl = import.meta.env.VITE_OPENAPI_URL; // Environment variable for the base API URL

  if (!apiBaseUrl) {
    console.error("API base URL is not defined in environment variables.");
    return;
  }

  // hard coded staging user tracking endpoint
  const apiEndpoint = `https://f7mbowkmv3.execute-api.eu-central-1.amazonaws.com/usertracking/${solutionId}/${sessionId}`;

  axios
    .post(apiEndpoint, { ...logEntry })
    .then((response) => {})
    .catch((error) => {});
};

// Wrap console methods to track logs
const wrapConsoleMethod = (methodName, solutionId) => {
  const originalMethod = console[methodName];

  console[methodName] = (...args) => {
    const logEntry = {
      content: args,
      sessionId,
      solutionId,
      createdDate: new Date().toISOString(),
      nanoDate: Date.now(),
      itemType: "consoleLog",
      title: methodName,
      source: "frontend",
    };

    // Prevent infinite loop by avoiding logging from this method
    if (!args.some((arg) => arg?.preventTracking)) {
      sendLogToAPI(logEntry, solutionId, sessionId);
    }

    // Call the original console method
    originalMethod.apply(console, args);
  };
};

// Function to set up tracking for console logs
export const setupConsoleLogTracking = (solutionId) => {
  ["log", "error", "warn", "info", "debug"].forEach((method) =>
    wrapConsoleMethod(method, solutionId)
  );
};

// Middleware for Redux actions
const actionLoggerMiddleware = (store) => (next) => (action) => {
  const solutionId = store.getState().solutionId;

  const logEntry = {
    content: action,
    sessionId,
    solutionId,
    createdDate: new Date().toISOString(),
    nanoDate: Date.now(),
    itemType: "reduxAction",
    title: action.type,
    source: "frontend",
  };

  // Send action name to an external API
  sendLogToAPI(logEntry, solutionId, sessionId);

  // Continue with the next middleware or reducer
  return next(action);
};

// Set up Axios interceptors for logging network requests and responses
export const setupAxiosInterceptors = (solutionId) => {
  console.log("Setting up Axios interceptors");

  axios.defaults.headers.common["X-Correlation-ID"] = uuidv4();
  axios.defaults.headers.common["X-Solution-ID"] = solutionId;
  axios.defaults.headers.common["X-Session-ID"] = sessionId;
};

// Default export for Redux logger setup
export default actionLoggerMiddleware;
