// This CALM document is missing several required properties
// Add them to make it valid
{
  // Missing schema reference
  
  // nodes array is present but contains an incomplete node
  "nodes": [
    {
      // Missing unique-id
      "node-type": "system",
      "name": "My Architecture"
      // description is recommended but not strictly required
    }
  ],
  
  // relationships array contains an incomplete relationship
  "relationships": [
    {
      "unique-id": "user-to-system",
      // Missing relationship-type
      "description": "User interacts with the system"
    }
  ]
}