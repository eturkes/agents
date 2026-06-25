# OpenVINO GPU+NPU — Intel Lunar Lake (this Debian container)

Container-scoped capability, project-agnostic. OpenVINO inference on **iGPU + NPU + CPU**, enabled + verified
(real compile+infer correct on each). Paths absolute: `$HOME=/var/home/eturkes/debian` so `~/.local` ≠ the install root below.

## HW — Intel Core Ultra 7 268V (Lunar Lake)
- GPU = Arc 140V iGPU · PCI `8086:64a0` · drv `xe` · `/dev/dri/renderD128`
- NPU = AI Boost (NPU 4) · PCI `8086:643e` · drv `intel_vpu` · `/dev/accel/accel0`
- CPU = always present
- nodes `nobody:nogroup 0660` → uid 1000 opens them via CAP_DAC_OVERRIDE (no group fix needed)

## OpenVINO runtime
- v2026.2.1 @ `/var/home/eturkes/.local/app/openvino_genai` (prebuilt, incl. GenAI)
- reaches python via `PYTHONPATH` set in login profile, NOT pip-installed → never `pip install openvino` (a plugin-less wheel would shadow it)
- compiled bindings = cpython-{310,311,312,313} → python MUST ∈ {3.10–3.13}, else `_pyopenvino` load fails

## Enable (per shell, BEFORE launching python)
```
source /var/home/eturkes/.local/app/intel-accel/env.sh
```
→ sets `LD_LIBRARY_PATH` (driver farm) + `OCL_ICD_VENDORS` (GPU OpenCL ICD) + `ZE_ENABLE_ALT_DRIVERS` (GPU+NPU Level Zero).
`LD_LIBRARY_PATH` read at exec → source first, then run python (mutating `os.environ` mid-process = too late).
Device strings: `"NPU"` | `"GPU"` | `"CPU"`. **Run preference = NPU > GPU > CPU** → encode via `"AUTO:NPU,GPU,CPU"` (AUTO compiles on the first device that supports the model, in that priority).
- NPU first = dedicated AI silicon, best perf/W → default target
- GPU = more throughput + fallback for ops/models the NPU lacks
- CPU = universal fallback (correctness, unsupported ops)
- split one model across devices = `"HETERO:NPU,GPU,CPU"`

## Python deps (numpy) — use a project venv
- container python has NO numpy; OpenVINO imports it eagerly → bare `import openvino` fails without it
- pattern = per-project `.venv` (py 3.10–3.13) + `numpy` (2.x ok). OpenVINO still resolves from `PYTHONPATH` inside the venv (PYTHONPATH augments venv `sys.path`) → only numpy (+ pure deps) go in the venv, not openvino
- no venv yet → `uv venv --python 3.13 .venv && uv pip install numpy`
- run = `source env.sh` → the venv's python (activate, or call `.venv/bin/python` directly)
- avoid isolated python (`-E` / `-I`, some `uv run` modes) → strips `PYTHONPATH` → OpenVINO disappears

## Verify / maintain
- self-test → `source env.sh && <venv-python> /var/home/eturkes/.local/app/intel-accel/selftest.py` (names each device + runs an infer)
- after a host Intel driver update → `python3 /var/home/eturkes/.local/app/intel-accel/make_farm.py` (rebuilds the symlink farm; pinned IGC untouched)

## How it works (why intel-accel/ exists)
- host Intel drivers reused as-is EXCEPT IGC (Graphics Compiler): host IGC needs glibc 2.43 > container 2.41 → load fail → GPU can't JIT kernels
- fix = pinned Ubuntu IGC 2.30.1 (glibc ≤2.39) dropped into an isolated symlink "farm" of host driver libs; generic libs (libc/libstdc++/libtbb/…) deliberately NOT linked → resolve from container → no ABI clash
- non-standard driver dir → explicit registration: OpenCL via ICD vendor file (`OCL_ICD_FILENAMES` alone = `-1001`; vendor dir works) · Level Zero via `ZE_ENABLE_ALT_DRIVERS`
- GPU plugin = OpenCL-based (needs ICD + IGC) · NPU plugin = Level Zero + own compiler (no IGC) → why NPU worked pre-fix, GPU did not
- zero system install · reversible = `rm -rf` the `intel-accel/` dir

## Caveats
- `intel-accel/` sits under the host-shared home → `farm/` symlinks target `/run/host/...` → valid IN-CONTAINER ONLY (dangle when viewed from the host; inert)
- host+container-coupled → keep `intel-accel/` artifacts OUT of project git repos (this memo is safe to commit)
