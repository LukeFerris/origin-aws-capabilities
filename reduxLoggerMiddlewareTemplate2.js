import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Generate a unique GUID for the session
const sessionId = uuidv4();

// Function to send logs to your API (Lambda endpoint, etc.)
export const sendLogToAPI = (logEntry, solutionId, sessionId) => {
  // endpoint added via mapping
  const apiEndpoint = `[SESSION_TRACKING_URL]/usertracking/${solutionId}/${sessionId}`;

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

  // Add a request interceptor
  axios.interceptors.request.use(
    (config) => {
      const logEntry = {
        sessionId,
        solutionId,
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosRequest",
        title: "Axios Request",
        source: "frontend",
        details: {
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: config.data,
        },
      };

      sendLogToAPI(logEntry, solutionId, sessionId);

      return config; // Proceed with the request
    },
    (error) => {
      const logEntry = {
        sessionId,
        solutionId,
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosError",
        title: "Axios Request Error",
        source: "frontend",
        details: {
          message: error.message,
          stack: error.stack,
        },
      };

      sendLogToAPI(logEntry, solutionId, sessionId);

      return Promise.reject(error); // Reject the request
    }
  );

  // Add a response interceptor
  axios.interceptors.response.use(
    (response) => {
      const logEntry = {
        sessionId,
        solutionId,
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosResponse",
        title: "Axios Response",
        source: "frontend",
        details: {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          headers: response.headers,
          data: response.data,
        },
      };

      sendLogToAPI(logEntry, solutionId, sessionId);

      return response; // Proceed with the response
    },
    (error) => {
      const logEntry = {
        sessionId,
        solutionId,
        createdDate: new Date().toISOString(),
        nanoDate: Date.now(),
        itemType: "axiosError",
        title: "Axios Response Error",
        source: "frontend",
        details: {
          message: error.message,
          stack: error.stack,
          response: error.response
            ? {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data,
              }
            : null,
        },
      };

      sendLogToAPI(logEntry, solutionId, sessionId);

      return Promise.reject(error); // Reject the response
    }
  );
};

// Default export for Redux logger setup
export default actionLoggerMiddleware;
