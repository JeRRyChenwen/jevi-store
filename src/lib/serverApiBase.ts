export function getServerApiBase(): string {
  return (
    process.env.API_PROXY ||
    process.env.API_BASE ||
    process.env.D1_WORKER_INTERNAL_BASE ||
    process.env.AUTH_UPSTREAM ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://host.docker.internal:8787"
  ).replace(/\/+$/, "");
}