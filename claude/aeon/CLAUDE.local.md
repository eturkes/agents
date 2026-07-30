# OpenVINO acceleration — Intel Lunar Lake

iGPU + NPU + CPU = enabled → **prefer OpenVINO for applicable local inference**.

- **Run preference NPU > GPU > CPU** → `"AUTO:NPU,GPU,CPU"` (AUTO compiles on first listed device supporting the model). NPU = dedicated AI silicon, best perf/W (default) · GPU = throughput + op/model fallback · CPU = universal correctness fallback. Split one model across devices = `"HETERO:NPU,GPU,CPU"`.
- Before use: source accel env, then run Python from a NumPy venv (3.10–3.13). Enablement, paths, devices, self-test/maintenance, `intel-accel` detailed ref → **`~/agents/docs/openvino.md`**.
- Container-scoped, project-agnostic guidance: update this file + ref as needed.
