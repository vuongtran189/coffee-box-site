export async function onRequestGet(context) {
  const { env } = context;
  return Response.json({
    hasClientId: Boolean(env.GITHUB_CLIENT_ID),
    hasClientSecret: Boolean(env.GITHUB_CLIENT_SECRET),
    hasScope: Boolean(env.GITHUB_SCOPE),
  });
}
