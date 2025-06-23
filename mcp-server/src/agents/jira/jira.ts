import { z } from "zod";
import { Tool, Prompt, CallToolRequest, CallToolResult, GetPromptRequest, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

const createJiraEpicSchema = z.object({
    projectName: z.string(),
    epicName: z.string(),
    description: z.string(),
});

const jiraIssuePromptSchema = z.object({
    issueTitle: z.string(),
    userStory: z.string(),
    acceptanceCriteria: z.string(),
});

export function getJiraTools(): Tool[] {
    return [
        {
            name: "create_jira_epic",
            description: "Create a new epic in Jira",
            inputSchema: {
                type: "object",
                properties: {
                    projectName: { type: "string" },
                    epicName: { type: "string" },
                    description: { type: "string" },
                },
                required: ["projectName", "epicName", "description"],
            }
        }
    ];
}

export async function handleJiraTool(request: CallToolRequest): Promise<CallToolResult | undefined> {
    if (request.params.name === 'create_jira_epic') {
        const args = createJiraEpicSchema.parse(request.params.arguments);
        return {
            content: [
                {
                    type: "text",
                    text: `(Placeholder) Created Jira epic "${args.epicName}" in project "${args.projectName}".`,
                },
            ],
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