# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os
import shutil

target = r'c:\Users\aljabareen\Desktop\AI NetLink\NetLink Enterprise DB\[03_SYSTEM_CORE]\Archive_Project_History\AI_Master_Context\دليل اجهزة يوبي كوتي'
if os.path.exists(target):
    shutil.rmtree(target)
    print(f"SUCCESS: Deleted {target}")
else:
    print(f"FAILED: Path {target} not found")
