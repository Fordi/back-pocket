export declare function winnow<I>(
  array: I[],
  rule: (
    item: I,
    index: number,
    array: I[]
  ) => number | boolean | undefined | string | null,
  context?: any
): Array<Array<I>> & {
  matched: I[];
  unknown: I[];
};
