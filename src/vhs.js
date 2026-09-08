/* Camcorder look: the picture is treated as worn VHS tape shot on a handheld
   camera. Everything here is generated in-shader, so file:// launch still
   needs no assets and no network. */
(function () {
  "use strict";
  const B = window.BABYLON;
  if (!B) return;

  B.Effect.ShadersStore["nightTapeFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution;
uniform float time;
uniform float amount;
uniform float dread;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
  vec2 uv = vUV;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);

  // Cheap lens barrel, the way a consumer camcorder bends its edges.
  uv = 0.5 + c * (1.0 + 0.055 * r2 * amount);

  // Tape wobble: per-scanline jitter plus a tear that drifts down the frame.
  float band = fract(uv.y - time * 0.06);
  float wob = hash(vec2(floor(uv.y * 240.0), floor(time * 20.0))) - 0.5;
  float jitter = wob * 0.0015 * amount;
  jitter += smoothstep(0.975, 1.0, band) * 0.007 * amount;
  jitter += dread * (hash(vec2(floor(uv.y * 90.0), floor(time * 34.0))) - 0.5) * 0.01;

  // Chroma separation grows toward the corners.
  float sep = (0.0016 + 0.0022 * r2) * amount;
  float rr = texture2D(textureSampler, vec2(uv.x + sep + jitter, uv.y)).r;
  float gg = texture2D(textureSampler, vec2(uv.x + jitter, uv.y)).g;
  float bb = texture2D(textureSampler, vec2(uv.x - sep + jitter, uv.y)).b;
  vec3 col = vec3(rr, gg, bb);

  // Washed, slightly cold stock.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.8);
  col *= vec3(0.975, 1.005, 0.985);
  col = pow(max(col, 0.0), vec3(1.06));

  // Scanlines and head noise.
  float sl = 0.93 + 0.07 * sin(uv.y * resolution.y * 3.14159);
  col *= mix(1.0, sl, amount);
  float n = hash(uv * resolution * 0.5 + time * 57.0);
  col += (n - 0.5) * (0.05 + dread * 0.09) * amount;

  // Occasional dropout streaks.
  float d = hash(vec2(floor(uv.y * 150.0), floor(time * 8.0)));
  col += step(0.9965, d) * 0.22 * amount;

  float v = smoothstep(1.5, 0.28, length(c) * 1.35);
  col *= mix(1.0, v, 0.6 * amount);
  col = max(col, vec3(0.010));

  // Outside the warped frame there is no tape.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  gl_FragColor = vec4(col, 1.0);
}`;

  window.NightLook = {
    // `cameras` are the ones the player actually looks through.
    install(scene, engine, cameras) {
      const look = { amount: 1, dread: 0, time: 0, passes: [], pipeline: null };

      const pipeline = new B.DefaultRenderingPipeline("night grade", false, scene, cameras);
      pipeline.samples = 1;
      pipeline.fxaaEnabled = false;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.8;
      pipeline.bloomWeight = 0.26;
      pipeline.bloomKernel = 42;
      pipeline.bloomScale = 0.5;
      pipeline.imageProcessingEnabled = true;
      const ip = pipeline.imageProcessing;
      ip.contrast = 1.16;
      ip.exposure = 1.18;
      ip.toneMappingEnabled = false;
      ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
      ip.vignetteEnabled = false;
      ip.vignetteWeight = 2.6;
      ip.vignetteStretch = 0.4;
      ip.vignetteColor = new B.Color4(0, 0.01, 0.012, 0);
      ip.vignetteBlendMode = B.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
      const curves = new B.ColorCurves();
      curves.globalSaturation = 74;
      curves.shadowsHue = 168;
      curves.shadowsDensity = 16;
      curves.shadowsExposure = -9;
      curves.highlightsHue = 44;
      curves.highlightsDensity = 10;
      curves.midtonesSaturation = 74;
      ip.colorCurves = curves;
      ip.colorCurvesEnabled = true;
      look.pipeline = pipeline;

      for (const camera of cameras) {
        const pass = new B.PostProcess(
          "night tape",
          "nightTape",
          ["resolution", "time", "amount", "dread"],
          null,
          1,
          camera,
          B.Texture.BILINEAR_SAMPLINGMODE,
          engine,
        );
        pass.onApply = (effect) => {
          effect.setFloat2("resolution", pass.width, pass.height);
          effect.setFloat("time", look.time);
          effect.setFloat("amount", look.amount);
          effect.setFloat("dread", look.dread);
        };
        look.passes.push(pass);
      }

      look.update = function (dt, dread) {
        look.time += dt;
        // The tape degrades while something is in the building with you.
        look.dread += (Math.min(1, dread || 0) - look.dread) * Math.min(1, dt * 1.5);
      };
      look.setEnabled = function (on) {
        look.amount = on ? 1 : 0;
        pipeline.bloomEnabled = on;
        ip.vignetteEnabled = false;
        ip.contrast = on ? 1.16 : 1.05;
        curves.globalSaturation = on ? 74 : 100;
      };
      return look;
    },
  };
})();
