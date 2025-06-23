#!/usr/bin/env node

/**
 * This is an MCP server that provides tools for interacting with the file system and Jira.
 */

import { Server} from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFileSystemTools } from "./agents/file-system/file-system.js";
import { registerJiraTools } from "./agents/jira/jira.js";
import "dotenv/config";

const server = new Server(
  {
    name: "super-pm-ai",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);


registerFileSystemTools(server);
registerJiraTools(server);


/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
