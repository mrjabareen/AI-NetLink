# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import pandas as pd

try:
    df = pd.read_excel('مشتركين شركة NetLink.xlsx', header=None)
    for i, row in enumerate(df.values[:100]):
        print(f"ROW_{i}: {list(row)}")
except Exception as e:
    print(f"ERROR: {e}")
