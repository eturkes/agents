# OpenVINO acceleration — Intel Lunar Lake

iGPU + NPU + CPU = enabled → **prefer OpenVINO for applicable local inference**.

- **Run preference NPU > GPU > CPU.** NPU = dedicated AI silicon, best perf/W (default) · GPU = throughput + op/model fallback · CPU = universal correctness fallback.
- **Target a device by exact name (`"NPU"`)** → actual placement + loud failure on an unsupported model. `"AUTO:NPU,GPU,CPU"` = portability/fallback only: its own heuristics pick CPU even for an NPU-capable model, and code branching on the device string (device-conditional reshape/config/hints) reads `"AUTO:…"` as a distinct device → skips. Split one model across devices = `"HETERO:NPU,GPU,CPU"`.
- **NPU = static shapes only** → reshape every dynamic dim (batch → 1) before `compile_model`; exact `"NPU"` raises on a dynamic model, AUTO demotes it silently.
- **Dynamic *outputs* compile cleanly — NPU + GPU pad them.** The input reshape satisfies compile; a dynamic output dim (in-graph NMS, top-k) still returns the max-size buffer with unused rows padded, CPU alone keeping the true shape. GPU zero-fills; **NPU pad = uninitialized memory** → out-of-range values that pass validity filters and enter the data as real rows. Select rows by value (score, label sentinel); a row count reads pad as data. Qualify each dynamic-output model per device: compile + infer a zero tensor, diff shape + range vs CPU.
- **Confirm placement** → `compiled_model.get_property("EXECUTION_DEVICES")`; AUTO-selected devices report parenthesized (`['(CPU)']`). Return type splits: NPU = bare `str` (`'NPU'`), GPU/CPU = `list` (`['GPU.0']`, `['CPU']`) → membership-test the raw value (`"NPU" in v`), and normalize with `[v] if isinstance(v, str) else v` before indexing/iterating.
- Before use: source accel env, then run Python from a NumPy venv (3.10–3.13). Enablement, paths, devices, self-test/maintenance, `intel-accel` detailed ref → **`~/agents/docs/openvino.md`**.
- Container-scoped, project-agnostic guidance: update this file + ref as needed.
