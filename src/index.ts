import { Agent } from "loom-agents";
import prompts from "prompts";
import fs from "fs";
import { execSync } from "child_process";
import { glob } from "glob";
import { dirname } from "path";
import ora from "ora";
import { Runner } from "loom-agents";

/***********************
 * Tool Definitions
 ***********************/

const BashTool = {
  name: "BashTool",
  description: "Executes shell commands in your environment",
  parameters: { command: { type: "string" } },
  callback: ({ command }: { command: string }) => {
    try {
      return execSync(command).toString();
    } catch (error: Error | any) {
      return `Error executing command: ${error.message}`;
    }
  },
};

const GlobTool = {
  name: "GlobTool",
  description: "Finds files based on pattern matching",
  parameters: { pattern: { type: "string" } },
  callback: ({ pattern }: { pattern: string }) => {
    try {
      const formattedPattern = pattern
        .split(" ")
        .map((part: string) => part.trim())
        .join("");
      const results = glob.sync(formattedPattern);
      return results.length > 0 ? results : "No files matching pattern found";
    } catch (error: Error | any) {
      return `Error in pattern matching: ${error.message}`;
    }
  },
};

const GrepTool = {
  name: "GrepTool",
  description: "Searches for patterns in file contents",
  parameters: { pattern: { type: "string" }, file: { type: "string" } },
  callback: ({ pattern, file }: { pattern: string; file: string }) => {
    try {
      if (!fs.existsSync(file)) {
        return `File ${file} does not exist`;
      }
      const fileContents = fs.readFileSync(file, "utf8");
      const matches = fileContents
        .split("\n")
        .filter((line) => line.includes(pattern));
      return matches.length > 0
        ? matches
        : `No matches found for pattern "${pattern}" in ${file}`;
    } catch (error: Error | any) {
      return `Error searching file: ${error.message}`;
    }
  },
};

const LSTool = {
  name: "LSTool",
  description: "Lists files and directories",
  parameters: { path: { type: "string" } },
  callback: ({ path }: { path: string }) => {
    try {
      const dirPath = path.trim() === "" ? "." : path;
      if (!fs.existsSync(dirPath)) {
        return `Directory ${dirPath} does not exist`;
      }
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      if (items.length === 0) {
        return `Directory ${dirPath} is empty`;
      }
      return items.map(
        (dirent) => `${dirent.name}${dirent.isDirectory() ? "/" : ""}`
      );
    } catch (error: Error | any) {
      return `Error listing directory: ${error.message}`;
    }
  },
};

const FileReadTool = {
  name: "FileReadTool",
  description: "Reads the contents of files",
  parameters: { file: { type: "string" } },
  callback: ({ file }: { file: string }) => {
    try {
      if (!fs.existsSync(file)) {
        return `File ${file} does not exist`;
      }
      const content = fs.readFileSync(file, "utf8");
      return content.length > 0 ? content : `File ${file} is empty`;
    } catch (error: Error | any) {
      return `Error reading file: ${error.message}`;
    }
  },
};

const FileEditTool = {
  name: "FileEditTool",
  description: "Makes targeted edits to specific files or creates new files",
  parameters: {
    file: { type: "string" },
    content: { type: "string" },
  },
  callback: ({ file, content }: { file: string; content: string }) => {
    try {
      const action = fs.existsSync(file) ? "updated" : "created";
      const dir = dirname(file);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file, content);
      return `File ${file} successfully ${action}`;
    } catch (error: Error | any) {
      return `Error editing file: ${error.message}`;
    }
  },
};

/***********************
 * Agent Definitions
 ***********************/
const CodeWritingAgent = new Agent({
  name: "CodeWritingAgent",
  purpose: `You're a highly capable, expert code writer. Write clean, well-documented code based on a given plan.
    When given a file to create or modify:
    1. Generate complete, production-ready code for the specific file
    2. Include all necessary imports, functions, and styling
    3. Ensure the code is well-commented and follows best practices
    4. Return ONLY the complete code for this specific file
    5. Handle dependencies between files by communicating what other files need to contain
  `,
  model: "o3-mini-2025-01-31",
});

const CodeReviewAgent = new Agent({
  name: "CodeReviewAgent",
  purpose: `Review code for quality, style, and potential issues. Provide clear feedback and suggestions for improvements.
    When reviewing code:
    1. Check for bugs, edge cases, and potential improvements
    2. Verify that the code meets the requirements specified in the plan
    3. Suggest specific changes with code examples
    4. Focus on both functionality and user experience
    5. Consider cross-file dependencies and integration points
    
    Return your review as:
    - ISSUES: List of problems found (if any)
    - SUGGESTIONS: Specific code improvements
    - APPROVAL: Yes/No with reasoning
  `,
  model: "o3-mini-2025-01-31",
});

const PlanValidationAgent = new Agent({
  name: "PlanValidationAgent",
  purpose: `Validate project plans for feasibility, completeness, and clarity. Improve the plan if necessary.
    When validating a plan:
    1. Check if the plan covers all requirements specified in the task
    2. Verify that the file structure is appropriate for the project type
    3. Ensure dependencies between files are clearly defined
    4. Check that the plan includes all necessary components (e.g., HTML, CSS, JS for web apps)
    5. Suggest improvements to make the plan more concrete and actionable
    
    Return:
    - VALIDATION: Pass/Fail with reasoning
    - IMPROVED PLAN: If necessary, provide a more detailed plan with file structure and component responsibilities
  `,
  model: "o3-mini-2025-01-31",
});

const ProgrammingAgent = new Agent({
  name: "ProgrammingAgent",
  purpose: `
    You are an autonomous orchestrator that brings tasks to completion without unnecessary user interaction.
    
    Your workflow:
    1. ANALYSIS: Interpret the user's task and break it down into concrete requirements
    2. PLANNING: Create a detailed plan including file structure and implementation steps
    3. VALIDATION: Use PlanValidationAgent to verify and improve the plan
    4. IMPLEMENTATION: Execute the plan by:
       a. Creating necessary directories using BashTool (mkdir -p)
       b. For each file in the plan:
          - Use CodeWritingAgent to generate the file content
          - Use FileEditTool to write the content to the file
          - Use CodeReviewAgent to review the file
          - Address any critical issues raised in the review
    5. TESTING: Verify the implementation works as expected
    6. DELIVERY: Provide a summary of what was created with file paths
    
    IMPORTANT:
    - Take full ownership of the task from start to finish
    - Use available tools (Bash, FileEdit, etc.) to actually create and modify files
    - Focus on one file at a time but maintain awareness of the entire project
    - Only ask for user input if absolutely necessary (e.g., ambiguous requirements)
    - Verify that each step is completed successfully before moving to the next
    - Keep track of what files have been created and their status
    - For web applications, ensure all component files are properly linked (e.g., HTML references CSS and JS)
  `,
  tools: [BashTool, GlobTool, GrepTool, LSTool, FileReadTool, FileEditTool],
  web_search: { enabled: true },
  sub_agents: [PlanValidationAgent, CodeWritingAgent, CodeReviewAgent],
});

async function main() {
  const runner = new Runner(ProgrammingAgent);

  let result: any = undefined;

  while (true) {
    const response = await prompts({
      type: "text",
      name: "task",
      message: "> What should we work on? (Press enter to exit)",
    });

    if (!response.task) break;
    if (response.task === "exit") break;
    if (response.task === "quit") break;

    // Start the spinner with an initial message
    const spinner = ora("Starting task execution...").start();

    result = await runner.run(
      result
        ? {
            context: [
              ...result.context,
              { role: "user", content: response.task },
            ],
          }
        : `Perform the following task: ${response.task}. 
    For multi-file projects, create all necessary files and ensure they work together.
    Use the available tools to create directories and files as needed.
    Provide a complete implementation that fulfills all requirements.`
    );

    spinner.succeed("Task completed!");

    console.log(result.final_message);
  }
}

main().catch(console.error);
