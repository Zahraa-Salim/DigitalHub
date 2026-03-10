// File: frontend/src/types/circletype.d.ts
// Purpose: Defines shared TypeScript types for circletype.
// It extends or declares frontend typings used by the app code.

declare module 'circletype' {
   export default class CircleType {
     constructor(element: HTMLElement, splitter?: (text: string) => string[]);
 
     radius(value: number): CircleType;
     radius(): number;
 
     dir(value: number): CircleType;
     dir(): number;
 
     forceWidth(value: boolean): CircleType;
     forceWidth(): boolean;
 
     forceHeight(value: boolean): CircleType;
     forceHeight(): boolean;
 
     refresh(): CircleType;
     destroy(): CircleType;
   }
 }

