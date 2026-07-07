# OpenVINO GPU+NPU — Intel Lunar Lake (this Debian container)

Detail ref for the OpenVINO stub (`CLAUDE.local.md`). Container-scoped, project-agnostic. OpenVINO on **iGPU + NPU + CPU**, enabled + verified (real compile+infer correct on each). Paths absolute: `$HOME=/var/home/eturkes/debian` → `~/.local` ≠ the install root below.

## HW — Intel Core Ultra 7 268V (Lunar Lake)
- GPU = Arc 140V iGPU · PCI `8086:64a0` · drv `xe` · `/dev/dri/renderD128`
- NPU = AI Boost (NPU 4) · PCI `8086:643e` · drv `intel_vpu` · `/dev/accel/accel0`
- CPU = always present
- nodes `nobody:nogroup 0660` → uid 1000 opens via CAP_DAC_OVERRIDE (no group fix)

## OpenVINO runtime
- v2026.2.1 @ `/var/home/eturkes/.local/app/openvino_genai` (prebuilt, incl. GenAI)
- reaches python via `PYTHONPATH` (host `~/.profile` sources OpenVINO `setupvars.sh`; container shells inherit it). A pip `openvino` wheel = unneeded but harmless: `PYTHONPATH` precedes venv site-packages in `sys.path` → `import openvino` resolves to THIS accel build (no shadowing; modern wheels ship plugins too). Device access = gated by sourcing the accel env alone → both packages enumerate the same devices. Keep `PYTHONPATH` intact (isolated python `-E`/`-I`/some `uv run` modes strip it → fall back to the wheel)
- compiled bindings = cpython-{310,311,312,313} → python MUST ∈ {3.10–3.13}, else `_pyopenvino` load fails

## Enable (per shell, BEFORE launching python)
```
source /var/home/eturkes/.local/app/intel-accel/env.sh
```
→ sets `LD_LIBRARY_PATH` (driver farm) + `OCL_ICD_VENDORS` (GPU OpenCL ICD) + `ZE_ENABLE_ALT_DRIVERS` (GPU+NPU Level Zero). `LD_LIBRARY_PATH` read at exec → source first, then run python (mutating `os.environ` mid-process = too late). Device strings `"NPU"` | `"GPU"` | `"CPU"`; run preference + `AUTO:`/`HETERO:` selection → the stub.

## Python deps (numpy) — use a project venv
- container python lacks numpy; OpenVINO imports it eagerly → bare `import openvino` fails without it
- pattern = per-project `.venv` (py 3.10–3.13) + `numpy` (2.x ok). OpenVINO still resolves from `PYTHONPATH` inside the venv (augments venv `sys.path`) → only numpy (+ pure deps) in the venv
- no venv yet → `uv venv --python 3.13 .venv && uv pip install numpy`
- run = `source env.sh` → the venv's python (activate, or `.venv/bin/python` directly)
- isolated python (`-E`/`-I`, some `uv run` modes) strips `PYTHONPATH` → OpenVINO disappears

## Verify / maintain
- self-test → `source env.sh && <venv-python> /var/home/eturkes/.local/app/intel-accel/selftest.py` (names each device + runs an infer)
- after host Intel driver update → `python3 /var/home/eturkes/.local/app/intel-accel/make_farm.py` (rebuilds the symlink farm; pinned IGC untouched)

## How it works (why intel-accel/ exists)
- host Intel drivers reused as-is EXCEPT IGC (Graphics Compiler): host IGC needs glibc 2.43 > container 2.41 → load fail → GPU can't JIT kernels
- fix = pinned Ubuntu IGC 2.30.1 (glibc ≤2.39) dropped into an isolated symlink "farm" of host driver libs; generic libs (libc/libstdc++/libtbb/…) left unlinked → resolve from container → zero ABI clash
- non-standard driver dir → explicit registration: OpenCL via ICD vendor file (`OCL_ICD_FILENAMES` alone = `-1001`; vendor dir works) · Level Zero via `ZE_ENABLE_ALT_DRIVERS`
- GPU plugin = OpenCL-based (needs ICD + IGC) · NPU plugin = Level Zero + own compiler (no IGC) → why NPU worked pre-fix, GPU did not
- zero system install · reversible = `rm -rf` the `intel-accel/` dir

## Caveats
- `intel-accel/` under the host-shared home → `farm/` symlinks target `/run/host/...` → valid IN-CONTAINER ONLY (dangle from host; inert)
- host+container-coupled → keep `intel-accel/` artifacts OUT of project git repos (this doc is safe to commit)
