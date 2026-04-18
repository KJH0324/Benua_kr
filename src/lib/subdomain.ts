export const isAdminSubdomain = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname.startsWith("admin.");
};

export const getBaseUrl = () => {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }
  // Remove any subdomain to get the base domain
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return `${protocol}//${parts.slice(-2).join(".")}`;
  }
  return `${protocol}//${hostname}`;
};
