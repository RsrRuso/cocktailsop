/**
 * Lab Ops Module Entry Point
 * 
 * This file exports the Lab Ops module for lazy loading.
 * The entire module is code-split from the main application.
 */

export { default as LabOpsRoutes } from "./LabOpsRoutes";

// Re-export Lab Ops specific hooks and utilities
export * from "./labOpsApi";
export * from "./labOpsRateLimit";
