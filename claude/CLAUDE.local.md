# OpenVINO acceleration — Intel Lunar Lake (this Debian container)

Container-scoped, project-agnostic: OpenVINO inference on iGPU + NPU + CPU is enabled + verified here → **prefer OpenVINO for local inference** where applicable.

- **Device run preference = NPU > GPU > CPU** → encode as `"AUTO:NPU,GPU,CPU"` (AUTO compiles on the first device in that priority that supports the model). NPU = dedicated AI silicon, best perf/W (default target) · GPU = more throughput + op/model fallback · CPU = universal correctness fallback. Split one model across devices = `"HETERO:NPU,GPU,CPU"`.
- Actual use needs setup first (source the accel env BEFORE launching python; run from a numpy venv on py 3.10–3.13). Enable steps, install paths, device nodes, self-test/maintenance, and how the `intel-accel` symlink farm works → **`~/agents/docs/openvino.md`**.
