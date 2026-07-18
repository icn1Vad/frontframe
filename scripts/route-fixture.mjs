import { createServer } from "node:http";

const [portValue, label] = process.argv.slice(2);
const port = Number.parseInt(portValue ?? "", 10);
if (!Number.isFinite(port) || !label) {
  throw new Error("Usage: node scripts/route-fixture.mjs <port> <label>");
}

createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(`${label}:${request.url}`);
}).listen(port, "127.0.0.1");
