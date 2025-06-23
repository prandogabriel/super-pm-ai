import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

const listJiraBoardsRequestSchema = z.object({
    method: z.literal("list_jira_boards"),
    params: z.object({}),
});

const listJiraIssuesRequestSchema = z.object({
    method: z.literal("list_jira_issues"),
    params: listIssuesSchema,
});

const createJiraIssueRequestSchema = z.object({
    method: z.literal("create_jira_issue"),
    params: createIssueSchema,
});

const jiraIssuePromptRequestSchema = z.object({
    method: z.literal("get_jira_issue_prompt"),
    params: jiraIssuePromptSchema,
});

export function registerJiraTools(server: Server) {
    server.setRequestHandler(
        listJiraBoardsRequestSchema,
        async () => {
            const boards = await jira.getAllBoards();
            return {
                content: [{ type: "text", text: JSON.stringify(boards, null, 2) }]
            };
        }
    );

    server.setRequestHandler(
        listJiraIssuesRequestSchema,
        async ({ params }: z.infer<typeof listJiraIssuesRequestSchema>) => {
            const issues = await jira.getIssuesForBoard(String(params.boardId));
            return {
                content: [{ type: "text", text: JSON.stringify(issues, null, 2) }]
            };
        }
    );

    server.setRequestHandler(
        createJiraIssueRequestSchema,
        async ({ params }: z.infer<typeof createJiraIssueRequestSchema>) => {
            const issue = await jira.addNewIssue({
                fields: {
                    project: {
                        id: params.projectId
                    },
                    summary: params.summary,
                    description: params.description,
                    issuetype: {
                        name: params.issueType
                    }
                }
            });
            return {
                content: [{ type: "text", text: JSON.stringify(issue, null, 2) }]
            };
        }
    );

    server.setRequestHandler(
        jiraIssuePromptRequestSchema,
        ({ params }: z.infer<typeof jiraIssuePromptRequestSchema>) => {
            return {
                messages: [{
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `
As a user, I want to ${params.userStory} so that I can achieve a certain goal.

**Acceptance Criteria:**
${params.acceptanceCriteria}

Please write a great Jira issue description based on the title "${params.issueTitle}" and the information above.
`
                    }
                }]
            }
        }
    );
} 