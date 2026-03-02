export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");

  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID.", { status: 500 });
  }

  const repoScope = env.GITHUB_SCOPE || "repo,user";
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/callback?provider=github`;
  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("scope", repoScope);
  oauthUrl.searchParams.set("state", state);

  const headers = new Headers();
  headers.set("Location", oauthUrl.toString());
  headers.append(
    "Set-Cookie",
    `decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  return new Response(null, { status: 302, headers });
}
