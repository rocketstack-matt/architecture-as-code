"use client";

import styles from "./CodeEditor.module.css";
import ctx from "classnames";
import { GeistMono } from "geist/font/mono";
import Editor, { Monaco } from "@monaco-editor/react";
import { Flex, useColorMode } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import MyBtn from "../MyBtn";
import { tryFormattingCode, validateCode } from "@/lib/client-functions";
import FiChevronRight from "@/app/styles/icons/HiChevronRightGreen";
import { useRouter } from "next/navigation";
import { useUserSolutionStore, useEditorStore } from "@/lib/stores";
import { sendGAEvent } from "@next/third-parties/google";
import { CodeFile, OutputResult } from "@/lib/types";
import { OutputReducerAction } from "@/lib/reducers";

// Custom hook for editor theme setup
const useEditorTheme = (monaco: Monaco, colorMode: "dark" | "light") => {
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("my-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#1f1f1f",
        },
      });
      monaco.editor.setTheme(colorMode === "light" ? "light" : "my-theme");
    }
  }, [monaco, colorMode]);
};

// Custom hook for keyboard shortcuts
const useValidationShortcut = (
  handleValidate: () => void,
  codeString: string,
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && event.shiftKey) {
        sendGAEvent("event", "buttonClicked", {
          value: "Validate (through shortcut)",
        });
        event.preventDefault();
        handleValidate();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleValidate, codeString]);
};

// Custom hook for code persistence
const useCodePersistence = (
  chapterIndex: number,
  stepIndex: number,
  codeString: string,
  setCodeString: (value: string) => void,
  codeFile: CodeFile,
) => {
  const userSolutionStore = useUserSolutionStore();

  // Load saved code
  useEffect(() => {
    const savedCode = userSolutionStore.getSavedUserSolutionByLesson(
      chapterIndex,
      stepIndex,
    );
    if (savedCode && savedCode !== codeString) {
      setCodeString(savedCode);
    }
  }, [chapterIndex, stepIndex]);

  // Save code changes
  useEffect(() => {
    userSolutionStore.saveUserSolutionForLesson(
      chapterIndex,
      stepIndex,
      codeString,
    );
  }, [codeString, chapterIndex, stepIndex]);

  // Initialize code if no saved solutions
  useEffect(() => {
    if (Object.keys(userSolutionStore.userSolutionsByLesson).length === 0) {
      setCodeString(JSON.stringify(codeFile.code, null, 2));
    }
  }, [userSolutionStore]);
};

// EditorControls component for the buttons section
const EditorControls = ({
  handleValidate,
  isValidating,
  resetCode,
  nextStepPath,
  outputResult,
}: {
  handleValidate: () => void;
  isValidating: boolean;
  resetCode: () => void;
  nextStepPath: string | undefined;
  outputResult: OutputResult;
}) => {
  const router = useRouter();

  return (
    <div className={styles.buttonsWrapper}>
      <Flex dir="row" gap="8px" alignItems="end">
        <MyBtn
          onClick={handleValidate}
          variant={
            outputResult.validityStatus === "valid" ? "success" : "default"
          }
          isDisabled={isValidating}
          tooltip="Shift + Enter"
        >
          {isValidating ? "Validating ..." : "Validate"}
        </MyBtn>

        <MyBtn onClick={resetCode} variant="error">
          Reset
        </MyBtn>
      </Flex>
      <MyBtn
        onClick={() => {
          if (nextStepPath) router.push("/" + nextStepPath);
        }}
        variant={
          outputResult.validityStatus === "valid" ? "default" : "success"
        }
        isDisabled={!nextStepPath}
        size={outputResult.validityStatus === "valid" ? "sm" : "xs"}
      >
        Next <span style={{ marginLeft: "4px" }}></span>
        <FiChevronRight
          color={
            outputResult.validityStatus === "valid"
              ? "white"
              : "hsl(var(--success))"
          }
        />
      </MyBtn>
    </div>
  );
};

export default function CodeEditor({
  codeString,
  setCodeString,
  codeFile,
  dispatchOutput,
  nextStepPath,
  stepIndex,
  chapterIndex,
  outputResult,
}: {
  codeString: string;
  setCodeString: (codeString: string) => void;
  codeFile: CodeFile;
  dispatchOutput: React.Dispatch<OutputReducerAction>;
  nextStepPath: string | undefined;
  stepIndex: number;
  chapterIndex: number;
  outputResult: OutputResult;
}) {
  const { colorMode } = useColorMode();
  const [monaco, setMonaco] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const editorStore = useEditorStore();
  const editorRef = useRef<any>(null);

  // Apply custom hooks
  useEditorTheme(monaco, colorMode);

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      tryFormattingCode(editorRef, setCodeString);
      validateCode(
        codeString,
        codeFile,
        dispatchOutput,
        stepIndex,
        chapterIndex,
      );
      setIsValidating(false);
    }, 500);
  };

  useValidationShortcut(handleValidate, codeString);
  useCodePersistence(
    chapterIndex,
    stepIndex,
    codeString,
    setCodeString,
    codeFile,
  );

  const resetCode = () => {
    setCodeString(JSON.stringify(codeFile.code, null, 2));
    dispatchOutput({ type: "RESET" });
  };

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    setMonaco(monaco);

    // Configure Monaco for CALM schema
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: "https://calm.finos.org/draft/2025-03/meta/calm.json",
          fileMatch: ["*"],
          schema: {
            type: "object",
            properties: {
              "$schema": { type: "string" },
              "nodes": { 
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    "unique-id": { type: "string", description: "Unique identifier for the node" },
                    "node-type": { 
                      type: "string", 
                      description: "Type of node (service, database, system, etc.)",
                      enum: ["service", "database", "system", "actor", "network", "ui", "component"]
                    },
                    "name": { type: "string", description: "Human-readable name for the node" },
                    "description": { type: "string", description: "Description of the node's purpose" },
                    "version": { type: "string", description: "Optional version information" },
                    "tags": { type: "array", description: "Optional tags for categorization" }
                  },
                  required: ["unique-id", "node-type", "name", "description"]
                }
              },
              "relationships": { 
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    "unique-id": { type: "string", description: "Unique identifier for the relationship" },
                    "relationship-type": { 
                      type: "string", 
                      description: "Type of relationship",
                      enum: ["connects", "deployed-in", "composed-of", "interacts"]
                    },
                    "source": { type: "string", description: "Source node unique-id" },
                    "target": { type: "string", description: "Target node unique-id" },
                    "description": { type: "string", description: "Description of the relationship" }
                  },
                  required: ["unique-id", "relationship-type", "source", "target"]
                }
              }
            }
          }
        }
      ]
    });

    editorRef.current = editor;
    editorStore.setEditor(editor);
    editorStore.setMonaco(monaco);
  };

  return (
    <>
      <div className={ctx(styles.codeEditor, GeistMono.className)}>
        <Editor
          language="json"
          defaultValue={codeString}
          theme={colorMode === "light" ? "light" : "my-theme"}
          value={codeString}
          height="100%"
          onChange={(codeString) => setCodeString(codeString ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            formatOnPaste: true,
            formatOnType: true,
          }}
          onMount={handleEditorMount}
        />
      </div>
      <EditorControls
        handleValidate={handleValidate}
        isValidating={isValidating}
        resetCode={resetCode}
        nextStepPath={nextStepPath}
        outputResult={outputResult}
      />
    </>
  );
}
