# OpenVINO acceleration on Intel Lunar Lake

This document expands the OpenVINO guidance in `CLAUDE.local.md`. In the container, `$HOME` is `/var/home/eturkes/debian`. Therefore, `~/.local` differs from the installation paths below.

## Hardware

- The GPU is an Intel Arc 140V iGPU. It uses the `xe` driver and `/dev/dri/renderD128`.
- The NPU is Intel AI Boost NPU 4. It uses `intel_vpu` and `/dev/accel/accel0`.
- The device nodes use `nobody:nogroup` with mode 0660. User ID 1000 accesses them through `CAP_DAC_OVERRIDE`.

## OpenVINO runtime

The host and the container use separate OpenVINO builds. Each build matches the C library of its own side. Both builds include GenAI.

- The host build is at `/var/home/eturkes/.local/app/openvino_genai`. It needs glibc 2.43. Use it on the host.
- The container build is at `/var/home/eturkes/.local/app/openvino_genai_container`. It needs glibc 2.38. The container provides glibc 2.41.
- The compiled bindings support Python 3.10 through 3.13. Use a Python version in this range.

The host profile sources the host `setupvars.sh`, and container shells inherit that environment. `env.sh` prepends the container build to `PYTHONPATH` and `LD_LIBRARY_PATH`. The first match wins, so the inherited host entries stay inert.

To install or replace the container build, download an archive that needs the container glibc or a lower version. The `ubuntu24` archive meets this condition.

```bash
curl -sSLO https://storage.openvinotoolkit.org/repositories/openvino_genai/packages/2026.3/linux/openvino_genai_ubuntu24_2026.3.0.0_x86_64.tar.gz
mkdir -p /var/home/eturkes/.local/app/openvino_genai_container
tar xzf openvino_genai_ubuntu24_2026.3.0.0_x86_64.tar.gz \
    -C /var/home/eturkes/.local/app/openvino_genai_container --strip-components=1
```

Replace both version strings with the target release.

## Enable the runtime

Before you start Python, run:

```bash
source /var/home/eturkes/.local/app/intel-accel/env.sh
```

The script does two jobs. It selects the container OpenVINO build with `PYTHONPATH` and `LD_LIBRARY_PATH`. It also exposes the GPU and NPU drivers with `LD_LIBRARY_PATH`, `OCL_ICD_VENDORS`, and `ZE_ENABLE_ALT_DRIVERS`. Because the loader reads `LD_LIBRARY_PATH` at process startup, source the environment first.

Use the exact device strings `"NPU"`, `"GPU"`, and `"CPU"`. See `CLAUDE.local.md` for device preference and `AUTO:` or `HETERO:` selection.

## Dynamic output shapes

The static-shape rule covers inputs. An output dimension can stay dynamic, and compilation still succeeds. The plugin allocates the maximum-size buffer and pads the unused rows.

- CPU returns the true shape.
- GPU pads with zeros.
- NPU pads with uninitialized memory. Those values fall outside the valid range of the tensor.

An NPU pad row passes a threshold filter, so it enters the data as a real row. Select rows by their own values, such as a score or a label sentinel. A row count is an unsafe selector.

To qualify a model on a device, compile it and infer a zero tensor. Compare the output shape and the value range against the CPU result.

## Create a Python environment

OpenVINO imports NumPy at startup, while the container Python omits it. Create a project virtual environment with Python 3.10 through 3.13 and NumPy 2.x.

```bash
uv venv --python 3.13 .venv
uv pip install numpy
```

Source the acceleration environment before you run the virtual-environment Python. Activate the environment, or invoke `.venv/bin/python` directly.

Preserve the `PYTHONPATH` that `env.sh` sets. Isolated Python modes such as `-E`, `-I`, and some `uv run` modes remove it. For those modes, install the `openvino` and `openvino-genai` pip wheels in the virtual environment. The wheels carry an RPATH to their own libraries, so they stay independent of `LD_LIBRARY_PATH`.

## Test and maintain

Run the device self-test:

```bash
source /var/home/eturkes/.local/app/intel-accel/env.sh
<venv-python> /var/home/eturkes/.local/app/intel-accel/selftest.py
```

The self-test names each device, then runs a real compile and inference. Expect `CPU`, `GPU`, and `NPU`.

After a host Intel driver update, rebuild the symlink farm:

```bash
python3 /var/home/eturkes/.local/app/intel-accel/make_farm.py
```

Keep the pinned IGC on the host IGC major line. Compare `intel-accel/igc/libigc.so.2` with `/run/host/usr/lib64/libigc.so.2`. If the host version is higher, download the matching release from `github.com/intel/intel-graphics-compiler`. Extract the `intel-igc-core-2` and `intel-igc-opencl-2` packages with `dpkg-deb -x`, replace the contents of `intel-accel/igc/`, then rebuild the farm.

Update the container OpenVINO build separately. A host OpenVINO update leaves the container build unchanged.

## `intel-accel` architecture

- The driver farm combines host Intel drivers with a container-compatible pinned IGC. The host IGC requires a newer glibc than the container provides.
- Generic libraries, including `libc` and `libtbb`, resolve from the container to preserve ABI isolation.
- `libstdc++` is the one exception. The farm links the host copy, because the GPU driver requires `GLIBCXX_3.4.35` and the container provides 3.4.33. The host copy stays backward compatible and needs only glibc 2.38.
- The farm binds the name `libnpu_driver_compiler.so` to `libopenvino_intel_npu_compiler_loader.so`. The NPU Level Zero driver opens that name and calls the `vcl*` API. The host symlink of that name targets the monolithic compiler, which exports `CreateNPUCompiler` alone.
- OpenCL registration uses the `OCL_ICD_VENDORS` directory. `OCL_ICD_FILENAMES` alone produces error `-1001`.
- Level Zero registration uses `ZE_ENABLE_ALT_DRIVERS`.
- The GPU plugin uses OpenCL, ICD, and IGC. The NPU plugin uses Level Zero and its compiler.
- The installation is user-local and leaves system packages unchanged.

To remove the acceleration environment, run `rm -rf /var/home/eturkes/.local/app/intel-accel`.

## Caveats

- The host-shared `intel-accel/farm` symlinks target `/run/host/...`. They work in the container and remain inert on the host.
- Git tracks only this reference documentation. The host-and-container-coupled `intel-accel` artifacts remain outside project repositories.
- An IGC that is older than the GPU driver aborts the whole process, including its CPU and NPU work. The abort message names `command_stream_receiver.cpp`. To see the cause, set `NEOReadDebugKeys=1` and `PrintDebugMessages=1`. The driver then prints `Installed Compiler Library libigc.so.2 is incompatible`.
