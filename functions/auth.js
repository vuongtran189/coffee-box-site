export async function onRequestGet(context) {
  const { request, env } = context;
  const siteUrl = new URL(request.url);
  const baseUrl = `${siteUrl.protocol}//${siteUrl.host}`;

  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID.", { status: 500 });
  }

  const state = crypto.randomUUID();
  const redirectUri = `${baseUrl}/callback`;
  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("scope", env.GITHUB_SCOPE || "repo");
  oauthUrl.searchParams.set("state", state);

  const headers = new Headers();
  headers.set("Location", oauthUrl.toString());
  headers.append(
    "Set-Cookie",
    `decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  return new Response(null, { status: 302, headers });
}
