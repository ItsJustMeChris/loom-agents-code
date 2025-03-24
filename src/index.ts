import { Agent } from "loom-agents";
import prompts from "prompts";
import fs from "fs";
import { execSync } from "child_process";
import { glob } from "glob";
import { dirname } from "path";

async function main() {
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
    purpose: `You're a highly capable, expert code writer. Write clean, well-documented code based on a given plan.`,
    model: "o3-mini-2025-01-31",
  });

  const CodeReviewAgent = new Agent({
    name: "CodeReviewAgent",
    purpose: `Review code for quality, style, and potential issues. Provide clear feedback and suggestions for improvements.`,
    model: "o3-mini-2025-01-31",
  });

  const PlanValidationAgent = new Agent({
    name: "PlanValidationAgent",
    purpose: `Validate project plans for feasibility, completeness, and clarity. Improve the plan if necessary.`,
    model: "o3-mini-2025-01-31",
  });

  const ProgrammingAgent = new Agent({
    name: "ProgrammingAgent",
    purpose: `
      You orchestrate the entire project lifecycle.
      When a task is provided, interpret it, draft a plan, validate it using PlanValidationAgent,
      generate code with CodeWritingAgent, review the code with CodeReviewAgent, and finally provide a consolidated result.
      Only interrupt the user when absolutely necessary.
      Use all tools available to you, so that you actually execute work and autonomously bring the task to completion.
      `,
    tools: [BashTool, GlobTool, GrepTool, LSTool, FileReadTool, FileEditTool],
    web_search: { enabled: true },
    sub_agents: [PlanValidationAgent, CodeWritingAgent, CodeReviewAgent],
  });

  while (true) {
    const response = await prompts({
      type: "text",
      name: "task",
      message: "> What should we work on? (Press enter to exit)",
    });

    if (!response.task) break;

    const finalResult = await ProgrammingAgent.run(
      `Perform the following task: ${response.task}. `
    );

    console.log("\nFinal Output:\n", finalResult);
  }
}

main().catch(console.error);
