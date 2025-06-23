import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const listFilesInputSchema = z.object({
  directoryPath: z.string().optional().default("."),
});

const readFileInputSchema = z.object({
  filePath: z.string(),
});

const listFilesRequestSchema = z.object({
  method: z.literal("list_files"),
  params: listFilesInputSchema,
});

const readFileRequestSchema = z.object({
  method: z.literal("read_file"),
  params: readFileInputSchema,
});

export function registerFileSystemTools(server: Server) {
    server.setRequestHandler(
        listFilesRequestSchema,
        async ({ params }: z.infer<typeof listFilesRequestSchema>) => {
            try {
                const files = await fs.readdir(params.directoryPath ?? ".");
                const fileDetails = await Promise.all(
                    files.map(async (file) => {
                        const fullPath = path.join(params.directoryPath ?? ".", file);
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
    );

    server.setRequestHandler(
        readFileRequestSchema,
        async ({ params }: z.infer<typeof readFileRequestSchema>) => {
            try {
                const content = await fs.readFile(params.filePath, "utf-8");
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
    );
} 