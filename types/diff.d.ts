declare module "diff" {
  // Minimal typing shim to satisfy Next.js typecheck under moduleResolution=bundler.
  // @types/diff currently doesn't expose declarations compatible with this import path.
  export function diffJson(
    oldObj: unknown,
    newObj: unknown,
    options?: Record<string, unknown>
  ): any;
}
