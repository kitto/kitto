# NOTICE

metal-fx
Copyright (c) Jakub Antalik

Ported to Svelte for Kitto from metal-fx 2.0.11 (MIT). See ../LICENSE.md.

This product includes software developed by Paper Design, Inc.

    Paper Shaders (https://github.com/paper-design/shaders)
    Copyright (c) Paper Design, Inc.
    Licensed under the Apache License, Version 2.0
    http://www.apache.org/licenses/LICENSE-2.0

Specifically:

- The `liquidMetal` fragment shader (`liquidMetalFragmentShader`) and the GLSL
  helper chunks it interpolates (`declarePI`, `rotation2`, `simplexNoise`,
  `colorBandingFix`) are vendored unmodified, byte-for-byte, from the
  `@paper-design/shaders` npm package @ 0.0.80 (`dist/shaders/liquid-metal.js`
  and `dist/shader-utils.js`) into `engine/shaders.ts`. Upstream metal-fx
  consumed it from npm at build time; Kitto has no runtime dependencies and
  svelte-package does not bundle, so the source is inlined instead.

- The sizing vertex shader in `engine/shaders.ts` (`VERT_SHADER_SRC`) is
  copied verbatim from `packages/shaders/src/vertex-shader.ts` @ 0.0.80.
  It is vendored rather than imported because the package exposes it only
  through `ShaderMount`, which owns its own canvas and animation loop.

No changes were made to either shader's source.
