const { app } = require("@azure/functions");

const BACKEND_ORIGIN =
  "https://intex-backend-fvgedfcwcxf8cnc9.australiaeast-01.azurewebsites.net";

// Headers that must NOT be forwarded from the incoming request to the backend.
const BLOCKED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
]);

// Headers that must NOT be forwarded from the backend response to the client.
const BLOCKED_RESPONSE_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "content-length",
  "content-encoding",
]);

app.http("proxy", {
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  authLevel: "anonymous",
  route: "{*restOfPath}",
  handler: async (request, context) => {
    const path = request.params.restOfPath || "";

    // Build target URL preserving query string
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`/api/${path}`, BACKEND_ORIGIN);
    incomingUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    // Forward request headers
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    // Add proxy headers so the backend knows the real client
    headers["x-forwarded-for"] =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-client-ip") ||
      "unknown";
    headers["x-forwarded-host"] = request.headers.get("host") || "";
    headers["x-forwarded-proto"] = "https";

    // Build fetch options
    const fetchOptions = {
      method: request.method,
      headers,
      redirect: "manual", // Pass 3xx responses through (critical for OAuth)
    };

    // Forward body for methods that have one
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
      const bodyBuffer = await request.arrayBuffer();
      if (bodyBuffer.byteLength > 0) {
        fetchOptions.body = bodyBuffer;
      }
    }

    try {
      const backendResponse = await fetch(targetUrl.toString(), fetchOptions);

      // Build response headers
      const responseHeaders = {};
      for (const [key, value] of backendResponse.headers.entries()) {
        const lower = key.toLowerCase();
        if (BLOCKED_RESPONSE_HEADERS.has(lower)) continue;
        if (lower === "set-cookie") continue; // handled separately below
        responseHeaders[key] = value;
      }

      // Extract Set-Cookie headers (Node 18.14+ has getSetCookie)
      const setCookies = [];
      if (typeof backendResponse.headers.getSetCookie === "function") {
        setCookies.push(...backendResponse.headers.getSetCookie());
      } else {
        const raw = backendResponse.headers.get("set-cookie");
        if (raw) setCookies.push(raw);
      }

      // Read response body
      const body = backendResponse.body
        ? Buffer.from(await backendResponse.arrayBuffer())
        : undefined;

      const response = {
        status: backendResponse.status,
        headers: responseHeaders,
        body,
      };

      // Parse and attach cookies using Azure Functions cookie format
      if (setCookies.length > 0) {
        response.cookies = setCookies.map(parseCookieString);
      }

      return response;
    } catch (error) {
      context.error("Proxy error:", error.message);
      return {
        status: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: "Bad Gateway",
          message: "The backend service is unavailable.",
        }),
      };
    }
  },
});

/**
 * Parse a raw Set-Cookie string into Azure Functions v4 cookie object.
 * Example: ".AspNetCore.Identity.Application=CfD...; path=/; secure; httponly; samesite=lax"
 */
function parseCookieString(raw) {
  const parts = raw.split(";").map((s) => s.trim());
  const [nameValue, ...attrs] = parts;

  const eqIdx = nameValue.indexOf("=");
  const name = eqIdx > -1 ? nameValue.substring(0, eqIdx) : nameValue;
  const value = eqIdx > -1 ? nameValue.substring(eqIdx + 1) : "";

  const cookie = { name, value };

  for (const attr of attrs) {
    const [attrName, ...attrValParts] = attr.split("=");
    const attrLower = attrName.trim().toLowerCase();
    const attrValue = attrValParts.join("=").trim();

    switch (attrLower) {
      case "path":
        cookie.path = attrValue || "/";
        break;
      case "domain":
        cookie.domain = attrValue;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "samesite":
        cookie.sameSite =
          attrValue.charAt(0).toUpperCase() +
          attrValue.slice(1).toLowerCase();
        break;
      case "expires":
        cookie.expires = new Date(attrValue);
        break;
      case "max-age":
        cookie.maxAge = parseInt(attrValue, 10);
        break;
    }
  }

  // Remove explicit domain so the browser scopes the cookie to the SWA domain
  delete cookie.domain;

  return cookie;
}
