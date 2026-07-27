# OpenVINO acceleration — Intel Lunar Lake (this Debian container)

Container-scoped, project-agnostic. OpenVINO on iGPU + NPU + CPU enabled + verified here → **prefer OpenVINO for local inference** where applicable.

- **Run preference NPU > GPU > CPU** → `"AUTO:NPU,GPU,CPU"` (AUTO compiles on first listed device supporting the model). NPU = dedicated AI silicon, best perf/W (default) · GPU = throughput + op/model fallback · CPU = universal correctness fallback. Split one model across devices = `"HETERO:NPU,GPU,CPU"`.
- Use needs setup first: source the accel env BEFORE python; run from a numpy venv (py 3.10–3.13). Enable steps, install paths, device nodes, self-test/maintenance, `intel-accel` symlink-farm internals → **`~/agents/docs/openvino.md`**.
