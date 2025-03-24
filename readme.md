# Loom Agents Code

A powerful CLI application that provides an agent-based interface for automating programming and code development tasks.

## Overview

Loom Agents Code creates a conversational interface to AI agents that can:
- Write and edit code
- Execute shell commands
- Search for files
- Manipulate the file system
- Perform web searches for information

The application is built around two primary agents:
1. **ProgrammingAgent** - The main orchestrator that handles task planning, environment analysis, and task execution
2. **CodeWritingAgent** - A specialized agent focused exclusively on writing high-quality code

## Key Features

- **Interactive Shell** - Simple text-based interface for giving tasks to the agents
- **File System Operations** - Read, write, search, and manipulate files easily
- **Shell Command Execution** - Run commands directly from the agent interface
- **Pattern Matching** - Find files using glob patterns
- **Web Search Integration** - Search the internet for information when needed

## Available Tools

The system includes several built-in tools:

- **BashTool** - Executes shell commands in your environment
- **GlobTool** - Finds files based on pattern matching
- **GrepTool** - Searches for patterns in file contents
- **LSTool** - Lists files and directories
- **FileReadTool** - Reads the contents of files
- **FileEditTool** - Makes targeted edits to specific files or creates new files

## Usage

Simply run the application and type your task at the prompt:

```
> What should we work on?
```

Examples of tasks you might give:
- "Create a simple web server using Express"
- "Refactor the code in src/utils to use async/await"
- "Search for all TODO comments in the project"
- "Create a React component for a login form"

## Technical Details

The application is built with:
- TypeScript/JavaScript
- Node.js
- The loom-agents library for agent functionality
- Prompts package for the interactive CLI
- File system operations using the Node.js fs module

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Run the application with `npm run build && npm run start`

## Requirements

- Node.js (v20 (Build with `23.10.0`) or higher recommended)
- NPM or Yarn

## License

MIT
