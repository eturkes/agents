# OpenVINO acceleration on Intel Lunar Lake

This document expands the OpenVINO guidance in `CLAUDE.local.md`. In the container, `$HOME` is `/var/home/eturkes/debian`. Therefore, `~/.local` differs from the installation paths below.

## Hardware

- The GPU is an Intel Arc 140V iGPU. It uses the `xe` driver and `/dev/dri/renderD128`.
- The NPU is Intel AI Boost NPU 4. It uses `intel_vpu` and `/dev/accel/accel0`.
- The device nodes use `nobody:nogroup` with mode 0660. User ID 1000 accesses them through `CAP_DAC_OVERRIDE`.

## OpenVINO runtime

- The accelerated runtime, including GenAI, is at `/var/home/eturkes/.local/app/openvino_genai`.
- `PYTHONPATH` selects the accelerated Python build. The host profile sources OpenVINO `setupvars.sh`, and container shells inherit the environment.
- A pip `openvino` wheel is an optional fallback. `PYTHONPATH` precedes virtual-environment site packages, so the accelerated build resolves first.
- The compiled bindings support Python 3.10 through 3.13. Use a Python version in this range.

## Enable the runtime

Before you start Python, run:

```bash
source /var/home/eturkes/.local/app/intel-accel/env.sh
```

The script configures `LD_LIBRARY_PATH`, `OCL_ICD_VENDORS`, and `ZE_ENABLE_ALT_DRIVERS`. These variables expose the GPU and NPU drivers. Because the loader reads `LD_LIBRARY_PATH` at process startup, source the environment first.

Use the exact device strings `"NPU"`, `"GPU"`, and `"CPU"`. See `CLAUDE.local.md` for device preference and `AUTO:` or `HETERO:` selection.

## Create a Python environment

OpenVINO imports NumPy at startup, while the container Python omits it. Create a project virtual environment with Python 3.10 through 3.13 and NumPy 2.x.

```bash
uv venv --python 3.13 .venv
uv pip install numpy
```

Source the acceleration environment before you run the virtual-environment Python. Activate the environment, or invoke `.venv/bin/python` directly.

Preserve the inherited `PYTHONPATH`. Isolated Python modes such as `-E`, `-I`, and some `uv run` modes remove it. Use the pip-wheel fallback with those modes.

## Test and maintain

Run the device self-test:

```bash
source /var/home/eturkes/.local/app/intel-accel/env.sh
<venv-python> /var/home/eturkes/.local/app/intel-accel/selftest.py
```

After a host Intel driver update, rebuild the symlink farm:

```bash
python3 /var/home/eturkes/.local/app/intel-accel/make_farm.py
```

## `intel-accel` architecture

- The driver farm combines host Intel drivers with a container-compatible pinned IGC. The host IGC requires a newer glibc than the container provides.
- Generic libraries, including `libc`, `libstdc++`, and `libtbb`, resolve from the container to preserve ABI isolation.
- OpenCL registration uses the `OCL_ICD_VENDORS` directory. `OCL_ICD_FILENAMES` alone produces error `-1001`.
- Level Zero registration uses `ZE_ENABLE_ALT_DRIVERS`.
- The GPU plugin uses OpenCL, ICD, and IGC. The NPU plugin uses Level Zero and its compiler.
- The installation is user-local and leaves system packages unchanged.

To remove the acceleration environment, run `rm -rf /var/home/eturkes/.local/app/intel-accel`.

## Caveats

- The host-shared `intel-accel/farm` symlinks target `/run/host/...`. They work in the container and remain inert on the host.
- Git tracks only this reference documentation. The host-and-container-coupled `intel-accel` artifacts remain outside project repositories.
