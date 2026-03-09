// File: frontend/src/types/circletype.d.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
 