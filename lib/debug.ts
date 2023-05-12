interface GlobalDebugInfo {
  __debug__?: boolean;
  __enableAsserts__?: boolean;
}

export const DEBUG = !!(globalThis as GlobalDebugInfo).__debug__;
export const ENABLE_ASSERTS = !!(globalThis as GlobalDebugInfo).__enableAsserts__ || DEBUG;
