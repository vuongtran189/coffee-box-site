function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : "";
}

function resultHtml(type, payload) {
  const payloadJson = JSON.stringify(payload || {});
  const message = `authorization:github:${type}:${payloadJson}`;
  return `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        var msg = ${JSON.stringify(message)};
        if (window.opener) {
          window.opener.postMessage(msg, "*");
          window.close();
        } else {
          try {
            localStorage.setItem("decap_oauth_result", msg);
          } catch (e) {}
          window.location.replace("/admin/");
        }
      })();
    </script>
  </body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieState = getCookieValue(request.headers.get("Cookie") || "", "decap_oauth_state");

  const clearStateCookie =
    "decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

  if (error) {
    return new Response(resultHtml("error", { error }), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    });
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response(resultHtml("error", { error: "Invalid OAuth state." }), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response(resultHtml("error", { error: "Missing OAuth environment variables." }), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    });
  }

  const baseUrl = `${url.protocol}//${url.host}`;
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
      redirect_uri: `${baseUrl}/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return new Response(resultHtml("error", { error: "Token exchange failed." }), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    });
  }

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    return new Response(resultHtml("error", tokenJson), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    });
  }

  return new Response(
    resultHtml("success", {
      token: tokenJson.access_token,
      access_token: tokenJson.access_token,
      provider: "github",
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearStateCookie },
    }
  );
}
