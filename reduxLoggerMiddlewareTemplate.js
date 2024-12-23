import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Generate a unique GUID for the session
const sessionId = uuidv4();

// Function to send logs to your API (Lambda endpoint, etc.)
export const sendLogToAPI = (logEntry, "[SOLUTION_ID]", sessionId) => {
  // endpoint added via mapping
  const apiEndpoint = `[SESSION_TRACKING_URL]/usertracking/[SOLUTION_ID]/${sessionId}`;

  axios
    .post(apiEndpoint, { ...logEntry }, { skipLogging: true }) // Add the skipLogging flag here
    .then((response) => {})
    .catch((error) => {});
};

// Wrap console methods to track logs
const wrapConsoleMethod = (methodName, "[SOLUTION_ID]") => {
  const originalMethod = console[methodName];

  console[methodName] = (...args) => {
    const logEntry = {
      content: args,
      sessionId,
      "[SOLUTION_ID]",
      createdDate: new Date().toISOString(),
      nanoDate: Date.now(),
      itemType: "consoleLog",
      title: methodName,
      source: "frontend",
    };

    // Prevent infinite loop by avoiding logging from this method
    if (!args.some((arg) => arg?.preventTracking)) {
      sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);
    }

    // Call the original console method
    originalMethod.apply(console, args);
  };
};

// Function to set up tracking for console logs
export const setupConsoleLogTracking = ("[SOLUTION_ID]") => {
  ["log", "error", "warn", "info", "debug"].forEach((method) =>
    wrapConsoleMethod(method, "[SOLUTION_ID]")
  );
};

// Middleware for Redux actions
const actionLoggerMiddleware = (store) => (next) => (action) => {

  const logEntry = {
    content: action,
    sessionId,
    "[SOLUTION_ID]",
    createdDate: new Date().toISOString(),
    nanoDate: Date.now(),
    itemType: "reduxAction",
    title: action.type,
    source: "frontend",
  };

  // Send action name to an external API
  sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);

  // Continue with the next middleware or reducer
  return next(action);
};

// Set up Axios interceptors for logging network requests and responses
// Set up Axios interceptors for logging network requests and responses
export const setupAxiosInterceptors = ("[SOLUTION_ID]") => {
  console.log("Setting up Axios interceptors");

  axios.defaults.headers.common["X-Correlation-ID"] = uuidv4();
  axios.defaults.headers.common["X-Solution-ID"] = "[SOLUTION_ID]";
  axios.defaults.headers.common["X-Session-ID"] = sessionId;

  console.log("Adding request interceptor");

  // Add a request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Skip logging for requests with the `skipLogging` flag
      if (config.skipLogging) {
        return config;
      }

      const logEntry = {
        sessionId,
        "[SOLUTION_ID]",
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosRequest",
        title: "Axios Request",
        source: "frontend",
        content: JSON.stringify({
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: config.data,
        }),
      };

      sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);

      return config; // Proceed with the request
    },
    (error) => {
      const logEntry = {
        sessionId,
        "[SOLUTION_ID]",
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosError",
        title: "Axios Request Error",
        source: "frontend",
        content: JSON.stringify({
          message: error.message,
          stack: error.stack,
        }),
      };

      sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);

      return Promise.reject(error); // Reject the request
    }
  );

  console.log("Adding response interceptor");

  // Add a response interceptor
  axios.interceptors.response.use(
    (response) => {
      // Skip logging for requests with the `skipLogging` flag
      if (response.config.skipLogging) {
        return response;
      }

      const logEntry = {
        sessionId,
        "[SOLUTION_ID]",
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosResponse",
        title: "Axios Response",
        source: "frontend",
        content: JSON.stringify({
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          headers: response.headers,
          data: response.data,
        }),
      };

      sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);

      return response; // Proceed with the response
    },
    (error) => {
      // Skip logging for requests with the `skipLogging` flag
      if (error.config && error.config.skipLogging) {
        return Promise.reject(error);
      }

      const logEntry = {
        sessionId,
        "[SOLUTION_ID]",
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosError",
        title: "Axios Response Error",
        source: "frontend",
        content: JSON.stringify({
          message: error.message,
          stack: error.stack,
          response: error.response
            ? {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data,
              }
            : null,
        }),
      };

      sendLogToAPI(logEntry, "[SOLUTION_ID]", sessionId);

      return Promise.reject(error); // Reject the response
    }
  );
};

// Default export for Redux logger setup
export default actionLoggerMiddleware;
