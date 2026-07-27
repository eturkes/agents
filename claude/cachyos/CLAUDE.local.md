# GPU acceleration — NVIDIA MX150 (this CachyOS machine)

Machine-scoped, project-agnostic. Optimus laptop: Intel UHD 620 (iGPU, primary display) + NVIDIA GeForce MX150 (discrete, proprietary `nvidia-*-dkms` driver) → **prefer the discrete GPU for compute** where applicable.

- **Compute runs directly**: CUDA/OpenCL address the MX150 (`nvidia-smi`, `clinfo -l`). `prime-run` = GL/Vulkan render offload for visual QA + GUI apps; CUDA uses direct invocation.
- **Budget VRAM**: it is the binding constraint (`nvidia-smi --query-gpu=memory.total,memory.free --format=csv`). Use small models, modest batches, quantized weights; re-check free memory before/during runs; past the ceiling → CPU fallback.
- **Pascal (sm_61) constrains the stack**: current CUDA dropped Pascal, so incompatible wheels fail. Compare `nvidia-smi --query-gpu=compute_cap --format=csv` with toolkit arch support; use the AUR's older Pascal-supporting `cuda-*` series when needed. Repo `python-pytorch-cuda`/`python-onnxruntime-cuda` follow repo `cuda` → confirm sm_61 coverage. Toolkit status = pending; install at first real need.
- Suitable for inference, light training, and CUDA/OpenCL kernels; route compute-heavy jobs to high-end hardware.
