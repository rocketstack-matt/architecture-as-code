declare module 'fetch-mock' {
  type ResponseType = string | object | Response | (() => unknown) | number;
  type OptionsType = Record<string, unknown>;
  type MatcherType = string | RegExp;
  
  const fetchMock: {
    // v10 methods
    route: (matcher: MatcherType, response: ResponseType, options?: OptionsType) => unknown;
    reset: () => unknown;
    mockGlobal: (matcher: MatcherType, response: ResponseType, options?: OptionsType) => unknown;
    resetBehavior: () => unknown;
    resetHistory: () => unknown;
    called: (name?: string) => boolean;
    
    // v9 methods for backward compatibility
    mock: (matcher: MatcherType, response: ResponseType, options?: OptionsType) => unknown;
    restore: () => unknown;
    
    // Add other methods as needed
  };
  export default fetchMock;
}
