declare module 'reading-time' {
  interface ReadingTimeResult {
    minutes: number;
    words: number;
  }
  function readingTime(text: string): ReadingTimeResult;
  export = readingTime;
}
