import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { Tool, CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const listFilesInputSchema = z.object({
  directoryPath: z.string().optional().default("."),
});

const readFileInputSchema = z.object({
  filePath: z.string(),
});


export function getFileSystemTools(): Tool[] {
    return [
        {
            name: "list_files",
            description: "List files and directories in a given path",
            inputSchema: {
                type: "object",
                properties: {
                    directoryPath: { type: "string", description: "The path to the directory to list." },
                },
            }
        },
        {
            name: "read_file",
            description: "Read the content of a file",
            inputSchema: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "The path to the file to read." },
                },
                required: ["filePath"],
            }
        }
    ];
}

export async function handleFileSystemTool(request: CallToolRequest): Promise<CallToolResult | undefined> {
    switch (request.params.name) {
        case "list_files": {
            const args = listFilesInputSchema.parse(request.params.arguments);
            try {
                const files = await fs.readdir(args.directoryPath ?? ".");
                const fileDetails = await Promise.all(
                  files.map(async (file) => {
                    const fullPath = path.join(args.directoryPath ?? ".", file);
                    const stats = await fs.stat(fullPath);
                    return {
                      name: file,
                      isDirectory: stats.isDirectory(),
                      size: stats.size,
                    };
                  })
                );
        
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(fileDetails, null, 2),
                    },
                  ],
                };
              } catch (error: any) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `Error listing files: ${error.message}`,
                    },
                  ],
                  isError: true,
                };
              }
        }
        case "read_file": {
            const args = readFileInputSchema.parse(request.params.arguments);
            try {
                const content = await fs.readFile(args.filePath, "utf-8");
                return {
                  content: [
                    {
                      type: "text",
                      text: content,
                    },
                  ],
                };
              } catch (error: any) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `Error reading file: ${error.message}`,
                    },
                  ],
                  isError: true,
                };
              }
        }
    }
    return undefined;
} 