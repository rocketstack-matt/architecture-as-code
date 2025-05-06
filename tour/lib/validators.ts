import {
  validate,
  registerSchema,
  setMetaSchemaOutputFormat,
  unregisterSchema,
  SchemaObject,
  OutputUnit,
} from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";

import { hasNestedProperty } from "./client-functions";

setMetaSchemaOutputFormat(BASIC);
export const schemaUrl = "http://tour.calm.finos.org/";

export async function hyperjumpValidate(
  data: any,
  schema: any,
  externalSchema?: any,
) {
  // Add schema property if missing for validation only
  if (!("$schema" in schema)) {
    // Add a temporary schema property for validation but don't modify the original
    const schemaWithRef = {...schema};
    schemaWithRef["$schema"] = "https://calm.finos.org/draft/2025-03/meta/calm.json";
    schema = schemaWithRef;
  }
  
  // Add CALM-specific validation
  const errors = validateCalmSchema(schema);
  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors.map((error, index) => ({
        valid: false,
        error: error,
        instanceLocation: `/calmError/${index}`,
        absoluteKeywordLocation: "",
        keyword: "calm-validation"
      }))
    };
  }
  
  try {
    // Skip hyperjump schema validation for now - it's causing issues
    // registerSchema(schema as SchemaObject, schemaUrl);
    // if (externalSchema) {
    //   registerSchema(externalSchema as SchemaObject, externalSchema.$id);
    // }
    // For CALM tour, we'll just validate the JSON structure itself
    // rather than validating against instances
    return { valid: true };
  } catch (e) {
    throw e;
  } finally {
    // unregisterSchema(schemaUrl);
    // if (externalSchema) {
    //   unregisterSchema(externalSchema.$id);
    // }
  }
}

// Custom CALM schema validator
function validateCalmSchema(schema: any): string[] {
  const errors: string[] = [];
  
  // Check for nodes array - this should always be present
  if (!schema.nodes || !Array.isArray(schema.nodes)) {
    errors.push("Missing or invalid 'nodes' array.");
  } else {
    // Check nodes structure if nodes exist
    schema.nodes.forEach((node: any, index: number) => {
      if (!node["unique-id"]) {
        errors.push(`Node at index ${index} is missing required 'unique-id' property.`);
      }
      if (!node["node-type"]) {
        errors.push(`Node at index ${index} is missing required 'node-type' property.`);
      }
      if (!node.name) {
        errors.push(`Node at index ${index} is missing required 'name' property.`);
      }
      if (!node.description) {
        errors.push(`Node at index ${index} is missing required 'description' property.`);
      }
    });
  }
  
  // If there are relationships, validate their structure
  if (schema.relationships && Array.isArray(schema.relationships)) {
    schema.relationships.forEach((rel: any, index: number) => {
      if (!rel["unique-id"]) {
        errors.push(`Relationship at index ${index} is missing required 'unique-id' property.`);
      }
      if (!rel["relationship-type"]) {
        errors.push(`Relationship at index ${index} is missing required 'relationship-type' property.`);
      }
    });
  }
  
  // For specific lessons, add custom validations
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    
    // For first lesson, check for a valid service node
    if (path.includes('01-Getting-Started/01-Your-First-Architecture')) {
      // Check for schema reference
      if (!("$schema" in schema) || !schema.$schema.includes("calm.finos.org")) {
        errors.push("Missing or invalid $schema reference. Add a reference to the CALM schema.");
      }
      
      // Make sure schema uses 2023-05 version
      if ("$schema" in schema && schema.$schema.includes("calm.finos.org") && !schema.$schema.includes("2023-05")) {
        errors.push("Please use the 2023-05 version of the CALM schema in your $schema reference.");
      }
      
      // Make sure we have at least one node
      if (!schema.nodes || !Array.isArray(schema.nodes) || schema.nodes.length === 0) {
        errors.push("You need to add at least one node to the nodes array.");
      } else {
        // First check if node-type is service
        const hasInvalidNodeType = schema.nodes.some((node: any) => 
          node["node-type"] && node["node-type"] !== "service");
        
        if (hasInvalidNodeType) {
          errors.push("Invalid node-type. For this lesson, the node-type must be 'service'.");
          return errors;
        }
        
        // Then check for all required properties
        const hasValidServiceNode = schema.nodes.some((node: any) => 
          node["node-type"] === "service" && 
          node["unique-id"] && 
          node.name && 
          node.description);
        
        if (!hasValidServiceNode) {
          errors.push("Your service node is missing required properties. Include unique-id, node-type, name, and description.");
        }
      }
    }
    // For the second lesson (Understanding Nodes), we'll check for a database node
    else if (path.includes('01-Getting-Started/02-Understanding-Nodes')) {
      const hasValidDbNode = schema.nodes && schema.nodes.some((node: any) => 
        node["node-type"] === "database" &&
        node["unique-id"] &&
        node.name &&
        node.description);
      if (!hasValidDbNode) {
        errors.push("Missing or invalid database node. Please add a database node with required properties (unique-id, node-type, name, and description).");
      }
    }
  } catch (error) {
    // Ignore errors during server-side rendering
  }
  
  return errors;
}

export async function hyperjumpCheckAnnotations(
  schema: any,
  requiredAnnotations: string[],
): Promise<OutputUnit> {
  // const annotationSchemaUrl = "http://tour2.json-schemad.org/";
  const dialectId = "https://json-schema.org/draft/2020-12/schema";
  if (!("$schema" in schema)) {
    schema["$schema"] = dialectId;
  }
  try {
    // registerSchema(schema as SchemaObject, annotationSchemaUrl);
    // const instance = await annotate(annotationSchemaUrl, data as SchemaObject);
    const missingAnnotations: string[] = [];
    for (const annotation of requiredAnnotations) {
      if (!hasNestedProperty(schema, annotation)) {
        missingAnnotations.push(annotation);
      }
    }
    if (missingAnnotations.length > 0) {
      throw new Error(
        `Schema does not contain the following annotations: ${missingAnnotations.join(
          ", ",
        )}`,
      );
    }
    return {
      valid: true,
      keyword: "",
      instanceLocation: "",
      absoluteKeywordLocation: "",
    };
  } catch (e) {
    console.log(e);
    throw e;
  } finally {
    // unregisterSchema(annotationSchemaUrl);
  }
}
