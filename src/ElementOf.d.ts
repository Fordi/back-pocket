export type ElementOf<ArrayType extends any> = 
  ArrayType extends (infer ElementType)[] ? ElementType : never;
