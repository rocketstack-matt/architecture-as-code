const code: any = {
  allOf: [
    {
      type: "object",
      properties: {
        street_address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
      },
      required: ["street_address", "city", "state"],
    },
  ],
  properties: {
    type: { enum: ["residential", "business"] },
  },
  required: ["type"],
};

let solution = structuredClone(code);
solution.unevaluatedProperties = {
  type: "number",
};

const testCases = [
  {
    input: {
      street_address: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      type: "business",
    },
    expected: true,
  },
  {
    input: {
      street_address: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      type: "business",
      zip: 20500,
    },
    expected: true,
  },
  {
    input: {
      street_address: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      type: "business",
      zip: "20500",
    },
    expected: false,
  },
  {
    input: {
      street_address: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      type: "business",
      zip: null,
    },
    expected: false,
  },
];

module.exports = {
  code,
  solution,
  testCases,
};
