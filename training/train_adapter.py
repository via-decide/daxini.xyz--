# training/train_adapter.py
# Incremental LoRA training for Zayvora (Phi-3) using MLX.

import os
import subprocess

MODEL_PATH = "/Users/dharamdaxini/Downloads/zayvora_engine"
DATA_PATH = "training/data/zayvora_v1.1_combined.jsonl"
ADAPTER_PATH = "training/adapters/zayvora-v1.1"

def run_training():
    print(f"[TRAINER] Targeted Model: {MODEL_PATH}")
    print(f"[TRAINER] Dataset: {DATA_PATH}")
    
    # MLX lora training command
    # We use a low iteration count for incremental updates (e.g. 100-200)
    # to avoid overfitting on the small PR dataset while capturing the new logic.
    
    command = [
        "python3", "-m", "mlx_lm.lora",
        "--model", MODEL_PATH,
        "--train",
        "--data", "training/data", # dataset folder must contain train.jsonl, valid.jsonl
        "--iters", "200",
        "--batch-size", "1",
        "--learning-rate", "1e-5",
        "--steps-per-report", "10",
        "--steps-per-eval", "50",
        "--adapter-path", ADAPTER_PATH
    ]

    # Note: MLX expects train.jsonl in the data folder.
    # I'll create a symlink to zayvora_update_dataset.jsonl -> train.jsonl
    
    train_jsonl = "training/data/train.jsonl"
    if os.path.exists(train_jsonl):
        os.remove(train_jsonl)
    
    # Use relative path for symlink to stay within the repo
    os.symlink(os.path.basename(DATA_PATH), train_jsonl)

    print(f"[TRAINER] Executing: {' '.join(command)}")
    
    try:
        subprocess.run(command, check=True)
        print(f"[SUCCESS] Adapter saved to {ADAPTER_PATH}")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Training failed: {e}")

if __name__ == "__main__":
    run_training()
