// Browser-safe shim for @protobufjs/inquire.
// The original module uses direct eval() to resolve optional dependencies.
// In this app we don't need those optional Node-only modules in the browser.

export type Inquire = (moduleName: string) => unknown;

const inquire: Inquire = () => null;

export default inquire;
