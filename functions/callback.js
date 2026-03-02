function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : "";
}

function callbackScriptResponse(status, payload) {
  const payloadJson = JSON.stringify(payload || {});
  const message = `authorization:github:${status}:${payloadJson}`;
  return new Response(
    `<!doctype html>
<html>
  <head>
    <script>
      (function () {
        var msg = ${JSON.stringify(message)};
        function sendResult() {
          if (window.opener) {
            window.opener.postMessage(msg, "*");
            window.removeEventListener("message", receiveMessage, false);
            window.close();
            return;
          }
          try { localStorage.setItem("decap_oauth_result", msg); } catch (e) {}
          window.location.replace("/admin/");
        }
        function receiveMessage() { sendResult(); }
        window.addEventListener("message", receiveMessage, false);
        if (window.opener) {
          window.opener.postMessage("authorizing:github", "*");
        } else {
          sendResult();
        }
      })();
    </script>
  </head>
  <body>
    <p>Authorizing Decap...</p>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }

  if (error) {
    return callbackScriptResponse("error", { error });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing OAuth env vars.", { status: 500 });
  }

  const cookieState = getCookieValue(request.headers.get("Cookie") || "", "decap_oauth_state");
  const clearCookie =
    "decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
  const stateValid = Boolean(state && cookieState && state === cookieState);
  if (!code || !stateValid) {
    return new Response(callbackScriptResponse("error", { error: "Invalid OAuth state." }).body, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie },
    });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "decap-cms-cloudflare-oauth",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback?provider=github`,
    }),
  });

  if (!tokenRes.ok) {
    return new Response(callbackScriptResponse("error", { error: "Token exchange failed." }).body, {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie },
    });
  }

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    return new Response(callbackScriptResponse("error", tokenJson).body, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie },
    });
  }

  return new Response(
    callbackScriptResponse("success", { token: tokenJson.access_token }).body,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie },
    }
  );
}
