// Reexport the native module. On web, it will be resolved to PolarEcgModule.web.ts
// and on native platforms to PolarEcgModule.ts
export { default } from './src/PolarEcgModule';
export { default as PolarEcgModuleView } from './src/PolarEcgModuleView';
export * from  './src/PolarEcgModule.types';
