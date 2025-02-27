declare module 'junit-report-builder' {
  export interface TestCase {
    name(name: string): TestCase;
    failure(): TestCase;
  }

  export interface TestSuite {
    name(name: string): TestSuite;
    testCase(): TestCase;
  }

  interface JUnitReportBuilder {
    testSuite(): TestSuite;
    build(): string;
  }

  const junitReportBuilder: JUnitReportBuilder;
  export default junitReportBuilder;
}
