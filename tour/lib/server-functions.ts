import { CustomMDX } from "@/app/components/Mdx";
import matter from "gray-matter";
import fs from "fs";
import typescript from "typescript";
import { contentManager } from "./contentManager";

import { CodeFileExports, Metadata } from "./types";

export function parseLessonFolder(fullFilePath: string, codePath: string) {
  const file = fs.readFileSync(fullFilePath, "utf-8");

  const { content, data } = matter(file);
  const Page = () => CustomMDX({ source: content });

  const codeFile = getCodeFileExports(codePath);

  return { Page, metadata: data as Metadata, codeFile };
}

function transpileTypeScriptToJavaScript(tsCode: string) {
  const result = typescript.transpileModule(tsCode, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
  });
  return result.outputText;
}

export function getCodeFileExports(fullFilePath: string) {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(fullFilePath, "utf-8");
    
    // Make a best effort to parse as pure JSON, which is what's being edited in the UI
    let code;
    try {
      // First try parsing directly
      code = JSON.parse(fileContent);
    } catch (jsonError) {
      // If direct parsing fails, try removing comments
      const contentWithoutComments = fileContent
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();
      code = JSON.parse(contentWithoutComments);
    }
    
    // Ensure $schema exists for CALM documents
    if (!code.$schema && fullFilePath.includes('01-Getting-Started/01-Your-First-Architecture')) {
      code.$schema = "https://calm.finos.org/draft/2025-03/meta/calm.json";
    }
    
    // Add test cases based on the lesson
    const testCases = generateTestCasesForLesson(fullFilePath, code);
    
    return {
      code,
      testCases
    };
  } catch (error) {
    console.error(`Error processing code file ${fullFilePath}:`, error);
    // Return a default object with schema reference if there's an error
    return {
      code: { 
        "$schema": "https://calm.finos.org/draft/2025-03/meta/calm.json", 
        "nodes": [] 
      },
      testCases: []
    };
  }
}

// Generate test cases based on the lesson path
function generateTestCasesForLesson(filePath: string, code: any) {
  // Get the lesson path components
  const pathParts = filePath.split('/');
  const chapterDir = pathParts[pathParts.length - 3]; // e.g., 01-Getting-Started
  const lessonDir = pathParts[pathParts.length - 2];  // e.g., 01-Your-First-Architecture
  
  // Different test cases for different lessons
  if (chapterDir === '01-Getting-Started' && lessonDir === '01-Your-First-Architecture') {
    return [
      {
        input: code,
        expected: true,
        description: "Valid CALM document"
      }
    ];
  }
  
  // Default case - validate the code as it is
  return [
    {
      input: code,
      expected: true,
      description: "Valid CALM document"
    }
  ];
}
