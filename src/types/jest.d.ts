declare namespace jest {
  interface Mock<T = any, Y extends any[] = any> {
    (...args: Y): T;
    mockImplementation(fn: (...args: Y) => T): this;
    mockResolvedValue(value: T): this;
    mockRejectedValue(value: any): this;
  }
} 