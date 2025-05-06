import React, { useState } from "react";
import styles from "./Output.module.css";
import classnames from "classnames";
import { OutputResult } from "@/lib/types";
import FailedTestCasesWindow from "../TestCaseWindow/TestCaseWindow";
import MyBtn from "../MyBtn";
import { InvalidSchemaError } from "@hyperjump/json-schema/draft-2020-12";
import { schemaUrl } from "@/lib/validators";
import KeyBindings from "../KeyBindings/KeyBindings";
import { Flex, ListItem, UnorderedList } from "@chakra-ui/react";
import CodeSnippet from "../CodeSnippet/CodeSnippet";
import Link from "next/link";
import { sendGAEvent } from "@next/third-parties/google";

const SchemaError = ({ schemaPath, errorMessage }: { schemaPath: string, errorMessage?: string }) => {
  // If we have a CALM-specific error message, use that
  if (errorMessage && schemaPath.includes('calmError')) {
    return (
      <div className={styles.schemaErrorContainer}>
        <div className={styles.invalid}>
          <b>CALM Validation Error</b>
        </div>
        <div className={styles.schemaErrorDetails}>
          <b>Details:</b> {errorMessage}
        </div>
        <div style={{ marginTop: "10px" }}>
          <div>Possible Fixes:</div>
          <UnorderedList>
            <ListItem>Make sure your CALM document follows the required structure</ListItem>
            <ListItem>Add the $schema reference to the CALM schema</ListItem>
            <ListItem>Ensure all required properties are included for nodes and relationships</ListItem>
          </UnorderedList>
        </div>
      </div>
    );
  }
  
  // Default JSON Schema error handling
  const errorTitle = "Invalid Type or Keyword";
  const CALMNodeTypes = [
    "service",
    "database",
    "system",
    "actor",
    "network",
    "webclient",
    "ldap"
  ];
  const errorDetails = (
    <>
      You are using invalid values in your CALM document. For node-type, common values include:{" "}
      {CALMNodeTypes.map((t) => (
        <React.Fragment key={t}>
          <CodeSnippet>{t}</CodeSnippet>
          {", "}
        </React.Fragment>
      ))}
    </>
  );
  const possibleFixes = [
    "Check that your node types are valid CALM node types",
    "Make sure all required properties are included",
    <>
      Ensure you are using valid CALM schema structure. You can view the CALM documentation{" "}
      <Link
        href={"https://architecture-as-code.github.io/"}
        target="_blank"
        style={{
          color: "hsl(var(--link-color))",
          textDecoration: "underline",
        }}
      >
        here
      </Link>
    </>,
  ];

  return (
    <div className={styles.schemaErrorContainer}>
      <div className={styles.invalid}>
        <b>Error: {errorTitle}</b>
      </div>
      <div>
        <b>Path:</b>{" "}
        <span style={{ color: "hsl(var(--link-color))" }}>{schemaPath}</span>
      </div>
      <div className={styles.schemaErrorDetails}>
        <b>Details:</b> {errorDetails}
      </div>
      <div style={{ marginTop: "10px" }}>
        <div>Possible Fixes:</div>
        <UnorderedList>
          {possibleFixes.map((fix, index) => (
            <ListItem key={index}>{fix}</ListItem>
          ))}
        </UnorderedList>
      </div>
    </div>
  );
};

function Output({
  outputResult,
  showSolution,
}: {
  outputResult: OutputResult;
  showSolution: () => void;
}) {
  let outputBodyContent;

  if (outputResult.validityStatus == "neutral") {
    outputBodyContent = (
      <Flex dir="row" gap={1} paddingTop={2}>
        {" "}
        Please click the{" "}
        <MyBtn variant="default" onClick={() => {}}>
          validate
        </MyBtn>{" "}
        button or use <KeyBindings keys={["Shift", "Enter"]} /> to view the
        output
      </Flex>
    );
  } else if (outputResult.validityStatus == "valid") {
    outputBodyContent = (
      <div className={styles.valid}>
        <b className={styles.validMessage}>Valid Schema!</b>
        <span className={styles.validSmallMessage}>
          Let&apos;s move on to the next step
        </span>
      </div>
    );
  } else if (outputResult.validityStatus == "syntaxError") {
    outputBodyContent = (
      <div className={styles.invalid}>
        <b>Syntax Error:</b> <code>{outputResult.errors as string}</code>
      </div>
    );
  } else if (outputResult.validityStatus == "invalidSchema") {
    const errors = outputResult.errors as any;
    let errorMessage: string | undefined;
    let errorPath: string = "/";
    
    // Handle our custom CALM validation errors
    if (errors.errors && Array.isArray(errors.errors)) {
      errorMessage = errors.errors[0]?.error || "Invalid CALM structure";
      errorPath = errors.errors[0]?.instanceLocation || "/calmError/0";
    } 
    // Handle standard JSON Schema errors
    else if (errors.output && errors.output.errors) {
      errorPath = errors.output.errors[0].instanceLocation.replace(schemaUrl, "");
    }
    
    outputBodyContent = (
      <div>
        <SchemaError
          schemaPath={errorPath}
          errorMessage={errorMessage}
        />
      </div>
    );
  } else {
    outputBodyContent = (
      <FailedTestCasesWindow
        testCaseResult={outputResult.testCaseResults!}
        totalTestCases={outputResult.totalTestCases!}
      />
    );
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.title}>Output </div>
      </div>

      <div className={classnames(styles.outputBody)}>
        {outputBodyContent}
        {outputResult.validityStatus !== "neutral" &&
          outputResult.validityStatus !== "valid" && (
            <div className={styles.footer}>
              Stuck?{" "}
              <button
                onClick={() => {
                  showSolution();
                  sendGAEvent("event", "buttonClicked", {
                    value: "View Solution",
                  });
                }}
                style={{
                  color: "hsl(var(--link-color))",
                  textDecoration: "underline",
                }}
              >
                View Solution
              </button>
            </div>
          )}
      </div>
    </>
  );
}

export default Output;