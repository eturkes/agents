# GPU acceleration — NVIDIA MX150 (this CachyOS machine)

Machine-scoped, project-agnostic. Optimus laptop: Intel UHD 620 (iGPU, primary display) + NVIDIA GeForce MX150 (discrete, proprietary `nvidia-*-dkms` driver) → **prefer the discrete GPU for compute** where applicable.

- **Compute needs no wrapper**: CUDA/OpenCL address the MX150 directly (`nvidia-smi`, `clinfo -l` both see it with no prefix). `prime-run` sets GL/Vulkan render-offload env only → use it for *rendering* (visual QA, GUI apps), never as a CUDA prerequisite.
- **Budget the VRAM**: this card carries very little (`nvidia-smi --query-gpu=memory.total,memory.free --format=csv`) and it is the binding constraint. Small models, modest batches, quantized weights; re-check free memory before and during a run, and fall back to CPU past that ceiling rather than thrashing.
- **Pascal (sm_61) constrains the stack**: current CUDA has dropped Pascal, so a wheel built against it fails here. Check `nvidia-smi --query-gpu=compute_cap --format=csv` against the toolkit's supported arch list, and take the AUR's older Pascal-supporting `cuda-*` series when the repo toolkit is too new; repo `python-pytorch-cuda`/`python-onnxruntime-cuda` follow the repo `cuda`, so confirm sm_61 coverage before trusting them. No CUDA toolkit is installed yet — install on first real need, not speculatively.
- Fine for inference, light training, and CUDA/OpenCL kernels; a compute-heavy job still belongs on a real machine.
