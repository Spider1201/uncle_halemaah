export function isValidMobileRedirectUri(uri: string): boolean {
  return uri.startsWith("unclehalemaah://") || uri.startsWith("exp://");
}

export function buildMobileRedirectUrl(redirectUri: string, code: string, state?: string): string {
  const delimiter = redirectUri.includes("?") ? "&" : "?";
  let target = `${redirectUri}${delimiter}code=${encodeURIComponent(code)}`;
  if (state) {
    target += `&state=${encodeURIComponent(state)}`;
  }
  return target;
}
