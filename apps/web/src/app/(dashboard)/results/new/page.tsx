// Re-export the results page for the /results/new route
// The AnalysisStepper navigates here after submission; the page reads
// currentCase from analysisStore and streams scenarios if not yet loaded.
export { default } from "../[id]/page"
