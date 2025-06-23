#!/usr/bin/env node

/**
 * This is an MCP server that provides tools for interacting with the file system and Jira.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListPromptsRequestSchema,
	GetPromptRequestSchema,
	type CallToolRequest,
	type GetPromptRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
	getFileSystemTools,
	handleFileSystemTool,
} from "./services/file-system/file-system.js";
import {
	getJiraTools,
	handleJiraTool,
	getJiraPrompts,
	handleJiraPrompt,
} from "./services/jira/jira.js";
import "dotenv/config";

const server = new Server(
	{
		name: "super-pm-ai",
		version: "0.1.0",
	},
	{
		capabilities: {
			tools: {},
			prompts: {},
		},
	},
);

const allTools = [...getFileSystemTools(), ...getJiraTools()];

const allPrompts = [...getJiraPrompts()];

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return { tools: allTools };
});

server.setRequestHandler(
	CallToolRequestSchema,
	async (request: CallToolRequest) => {
		let result = await handleFileSystemTool(request);
		if (result) {
			return result;
		}

		result = await handleJiraTool(request);
		if (result) {
			return result;
		}

		throw new Error(`Unknown tool: ${request.params.name}`);
	},
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
	return { prompts: allPrompts };
});

server.setRequestHandler(
	GetPromptRequestSchema,
	async (request: GetPromptRequest) => {
		const result = handleJiraPrompt(request);
		if (result) {
			return result;
		}

		throw new Error(`Unknown prompt: ${request.params.name}`);
	},
);

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
