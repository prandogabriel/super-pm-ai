import { z } from "zod";
import { Tool, Prompt, CallToolRequest, CallToolResult, GetPromptRequest, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import JiraApi from "jira-client";
import "dotenv/config";

const jira = new JiraApi({
    protocol: 'https',
    host: process.env.JIRA_HOST!,
    username: process.env.JIRA_USERNAME!,
    password: process.env.JIRA_API_TOKEN!,
    apiVersion: '2',
    strictSSL: true
});

const listIssuesSchema = z.object({
    boardId: z.number(),
});
const createIssueSchema = z.object({
    projectId: z.string(),
    summary: z.string(),
    description: z.string(),
    issueType: z.string().default("Task"),
});

const jiraIssuePromptSchema = z.object({
    issueTitle: z.string(),
    userStory: z.string(),
    acceptanceCriteria: z.string(),
});

export function getJiraTools(): Tool[] {
    return [
        {
            name: "list_jira_boards",
            description: "List all boards in Jira",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "list_jira_issues",
            description: "List issues for a specific board in Jira",
            inputSchema: {
                type: "object",
                properties: {
                    boardId: { type: "number" }
                },
                required: ["boardId"]
            }
        },
        {
            name: "create_jira_issue",
            description: "Create a new issue in Jira",
            inputSchema: {
                type: "object",
                properties: {
                    projectId: { type: "string" },
                    summary: { type: "string" },
                    description: { type: "string" },
                    issueType: { type: "string" },
                },
                required: ["projectId", "summary", "description"],
            }
        }
    ];
}

export async function handleJiraTool(request: CallToolRequest): Promise<CallToolResult | undefined> {
    try {
        switch (request.params.name) {
            case "list_jira_boards": {
                const boards = await jira.getAllBoards();
                return {
                    content: [{ type: "text", text: JSON.stringify(boards, null, 2) }]
                };
            }
            case "list_jira_issues": {
                const args = listIssuesSchema.parse(request.params.arguments);
                const issues = await jira.getIssuesForBoard(String(args.boardId));
                return {
                    content: [{ type: "text", text: JSON.stringify(issues, null, 2) }]
                };
            }
            case "create_jira_issue": {
                const args = createIssueSchema.parse(request.params.arguments);
                const issue = await jira.addNewIssue({
                    fields: {
                        project: {
                            id: args.projectId
                        },
                        summary: args.summary,
                        description: args.description,
                        issuetype: {
                            name: args.issueType
                        }
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(issue, null, 2) }]
                };
            }
        }
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Jira API Error: ${error.message}` }],
            isError: true
        };
    }
    return undefined;
}

export function getJiraPrompts(): Prompt[] {
    return [
        {
            name: "jira_issue_prompt",
            description: "Get a prompt to create a great Jira issue",
            argsSchema: {
                type: "object",
                properties: {
                    issueTitle: { type: "string" },
                    userStory: { type: "string" },
                    acceptanceCriteria: { type: "string" },
                },
                required: ["issueTitle", "userStory", "acceptanceCriteria"],
            }
        }
    ];
}

export function handleJiraPrompt(request: GetPromptRequest): GetPromptResult | undefined {
    if (request.params.name === 'jira_issue_prompt') {
        const args = jiraIssuePromptSchema.parse(request.params.arguments);
        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `
As a user, I want to ${args.userStory} so that I can achieve a certain goal.

**Acceptance Criteria:**
${args.acceptanceCriteria}

Please write a great Jira issue description based on the title "${args.issueTitle}" and the information above.
`
                }
            }]
        }
    }
    return undefined;
} 