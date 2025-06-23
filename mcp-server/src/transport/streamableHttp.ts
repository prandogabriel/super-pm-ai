import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import crypto from "node:crypto";

// Store active sessions
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

// Generate secure session ID
function generateSecureSessionId(): string {
	return crypto.randomUUID();
}

// Validate origin header for security
function validateOrigin(req: any): boolean {
	const origin = req.headers.origin;
	if (!origin) return true; // Allow requests without origin (local testing)
	
	// In production, validate against allowed origins
	const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://127.0.0.1:3000"];
	return allowedOrigins.includes(origin);
}

export function createStreamableHttpServer(server: Server, port: number = 3000) {
	const app = express();
	app.use(express.json());

	// Security middleware
	app.use((req: any, res: any, next: any) => {
		// Validate origin to prevent DNS rebinding attacks
		if (!validateOrigin(req)) {
			return res.status(403).json({ error: "Invalid origin" });
		}
		next();
	});

	// MCP endpoint handles both POST and GET
	app.post("/mcp", async (req: any, res: any) => {
		try {
			const sessionId = req.headers["mcp-session-id"] as string;
			
			// Handle initialization
			if (req.body.method === "initialize") {
				const newSessionId = generateSecureSessionId();
				const transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => newSessionId,
					enableJsonResponse: true,
				});
				
				// Store session
				sessions.set(newSessionId, { transport, server });
				
				// Set session ID header
				res.setHeader("Mcp-Session-Id", newSessionId);
				
				// Connect server to transport
				await server.connect(transport);
				
				// Return success response
				return res.json({ 
					jsonrpc: "2.0", 
					id: req.body.id, 
					result: { protocolVersion: "2024-11-05" } 
				});
			}

			// Handle existing session
			if (sessionId && sessions.has(sessionId)) {
				const session = sessions.get(sessionId)!;
				
				// For now, return a simple response
				// In a full implementation, you'd handle the request through the transport
				return res.json({ 
					jsonrpc: "2.0", 
					id: req.body.id, 
					result: { success: true } 
				});
			} else {
				return res.status(400).json({ error: "Invalid or missing session ID" });
			}
		} catch (error) {
			console.error("Error handling MCP POST request:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	});

	// GET endpoint for server-initiated SSE streams
	app.get("/mcp", (req: any, res: any) => {
		const sessionId = req.headers["mcp-session-id"] as string;
		
		if (!sessionId || !sessions.has(sessionId)) {
			return res.status(400).json({ error: "Invalid or missing session ID" });
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

		// Send initial connection event
		res.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

		// Keep connection alive and handle server notifications
		const interval = setInterval(() => {
			res.write(`: keepalive\n\n`);
		}, 30000); // Send keepalive every 30 seconds

		// Clean up on connection close
		req.on("close", () => {
			clearInterval(interval);
		});
	});

	// DELETE endpoint for session termination
	app.delete("/mcp", (req: any, res: any) => {
		const sessionId = req.headers["mcp-session-id"] as string;
		
		if (sessionId && sessions.has(sessionId)) {
			const session = sessions.get(sessionId)!;
			session.transport.close();
			sessions.delete(sessionId);
			res.json({ success: true, message: "Session terminated" });
		} else {
			res.status(404).json({ error: "Session not found" });
		}
	});

	// Health check endpoint
	app.get("/health", (req: any, res: any) => {
		res.json({ 
			status: "ok", 
			timestamp: new Date().toISOString(),
			activeSessions: sessions.size
		});
	});

	// Start the server (bind to localhost for security)
	const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
	app.listen(port, host, () => {
		console.log(`MCP Server running on http://${host}:${port}`);
		console.log(`MCP endpoint: http://${host}:${port}/mcp`);
		console.log(`Health check: http://${host}:${port}/health`);
		console.log(`Active sessions: ${sessions.size}`);
	});

	return app;
} 