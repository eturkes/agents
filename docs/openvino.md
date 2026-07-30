# OpenVINO GPU+NPU — Intel Lunar Lake (this Debian container)

Detail ref for the OpenVINO stub (`CLAUDE.local.md`; condensed Compute bullet in codex `AGENTS.md`). Container-scoped, project-agnostic. OpenVINO on **iGPU + NPU + CPU** = enabled. Paths absolute: `$HOME=/var/home/eturkes/debian` → `~/.local` ≠ the install root below.

## HW — Intel Core Ultra 7 268V (Lunar Lake)
- GPU = Arc 140V iGPU · PCI `8086:64a0` · drv `xe` · `/dev/dri/renderD128`
- NPU = AI Boost (NPU 4) · PCI `8086:643e` · drv `intel_vpu` · `/dev/accel/accel0`
- device nodes = `nobody:nogroup 0660` · uid 1000 access = `CAP_DAC_OVERRIDE`

## OpenVINO runtime
- v2026.2.1 @ `/var/home/eturkes/.local/app/openvino_genai` (prebuilt, incl. GenAI)
- python import = accel build via `PYTHONPATH` (host `~/.profile` sources OpenVINO `setupvars.sh`; container shells inherit it)
- pip `openvino` wheel = optional fallback: `PYTHONPATH` precedes venv site-packages in `sys.path` → accel build resolves first; wheel builds also ship plugins. Device enumeration with either package → source the accel env
- compiled bindings = cpython-{310,311,312,313} → python MUST ∈ {3.10–3.13}, else `_pyopenvino` load fails

## Enable (per shell, before python)
```bash
source /var/home/eturkes/.local/app/intel-accel/env.sh
```
→ sets `LD_LIBRARY_PATH` (driver farm) + `OCL_ICD_VENDORS` (GPU OpenCL ICD) + `ZE_ENABLE_ALT_DRIVERS` (GPU+NPU Level Zero). `LD_LIBRARY_PATH` read at exec → source the env before starting python. Device strings `"NPU"` | `"GPU"` | `"CPU"`; run preference + `AUTO:`/`HETERO:` selection → the stub.

## Python deps (numpy) — use a project venv
- OpenVINO imports numpy eagerly; container python lacks it → provide numpy through a project venv
- venv = python 3.10–3.13 + numpy 2.x; OpenVINO still resolves from `PYTHONPATH` → OpenVINO-specific venv deps = numpy (+ pure deps)
- bootstrap = `uv venv --python 3.13 .venv && uv pip install numpy`
- run = source the accel env → invoke the venv's python (activate, or `.venv/bin/python` directly)
- run with the inherited environment to preserve `PYTHONPATH`; isolated python (`-E`/`-I`, some `uv run` modes) strips it → requires the pip-wheel fallback

## Verify / maintain
- self-test → `source /var/home/eturkes/.local/app/intel-accel/env.sh && <venv-python> /var/home/eturkes/.local/app/intel-accel/selftest.py` (names each device + runs an infer)
- host Intel driver update → rebuild the symlink farm: `python3 /var/home/eturkes/.local/app/intel-accel/make_farm.py` (pinned IGC preserved)

## `intel-accel/` architecture
- driver farm = host Intel drivers + pinned Ubuntu IGC 2.30.1 (glibc ≤2.39). Host IGC requires glibc 2.43 > container 2.41 → load failure + unavailable GPU JIT
- generic libs (`libc`/`libstdc++`/`libtbb`/…) resolve from the container → ABI isolation
- non-standard driver registration: OpenCL = ICD vendor dir via `OCL_ICD_VENDORS` (`OCL_ICD_FILENAMES` alone yields `-1001`) · Level Zero = `ZE_ENABLE_ALT_DRIVERS`
- plugin dependencies: GPU = OpenCL + ICD + IGC · NPU = Level Zero + own compiler
- installation scope = user-local; system packages unchanged; removal = `rm -rf /var/home/eturkes/.local/app/intel-accel`

## Caveats
- `intel-accel/` under the host-shared home → `farm/` symlinks target `/run/host/...` → container-only; from the host they dangle + remain inert
- Git-tracked OpenVINO state = reference docs; host+container-coupled `intel-accel/` artifacts stay external to project repos
