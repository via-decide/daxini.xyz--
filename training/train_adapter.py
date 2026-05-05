# training/train_adapter.py
# Incremental LoRA training for Zayvora (Phi-3) using MLX.

import os
import subprocess

MODEL_NAME = "mlx-community/Meta-Llama-3-8B-Instruct-4bit"

def run_training():
    DATA_PATH = "data/zayvora_v1.1_final_dataset.jsonl"
    ADAPTER_PATH = "adapters/zayvora-v1.1"
    
    print(f"[TRAINER] Targeted Model: {MODEL_NAME}")
    print(f"[TRAINER] Dataset: {DATA_PATH}")
    
    # MLX lora training command
    command = [
        "python3", "-m", "mlx_lm.lora",
        "--model", MODEL_NAME,
        "--train",
        "--data", "data", # dataset folder must contain train.jsonl, valid.jsonl
        "--iters", "300",
        "--batch-size", "1",
        "--learning-rate", "1e-5",
        "--steps-per-report", "10",
        "--steps-per-eval", "50",
        "--adapter-path", ADAPTER_PATH
    ]

    # Note: MLX expects train.jsonl in the data folder.
    train_jsonl = "data/train.jsonl"
    if os.path.exists(train_jsonl):
        os.remove(train_jsonl)
    
    os.symlink(os.path.basename(DATA_PATH), train_jsonl)

    print(f"[TRAINER] Executing: {' '.join(command)}")
    
    try:
        subprocess.run(command, check=True)
        print(f"[SUCCESS] Adapter saved to {ADAPTER_PATH}")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Training failed: {e}")

if __name__ == "__main__":
    run_training()
