import os
import shutil
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGE_DIR = os.path.join(PROJECT_ROOT, "asar_stage")
APP_ASAR = os.path.join(PROJECT_ROOT, "release", "win-unpacked", "resources", "app.asar")
CORE_SRC = os.path.join(PROJECT_ROOT, "core", "publish")
CORE_DEST = os.path.join(PROJECT_ROOT, "release", "win-unpacked", "resources", "core")

print("[1/4] Preparing asar staging folder...")
if os.path.exists(STAGE_DIR):
    shutil.rmtree(STAGE_DIR)
os.makedirs(STAGE_DIR, exist_ok=True)

# Copy dist
shutil.copytree(os.path.join(PROJECT_ROOT, "dist"), os.path.join(STAGE_DIR, "dist"))

# Copy electron
def ignore_bak(src, names):
    return [n for n in names if n.endswith(".bak")]

shutil.copytree(os.path.join(PROJECT_ROOT, "electron"), os.path.join(STAGE_DIR, "electron"), ignore=ignore_bak)

# Copy package.json
shutil.copy(os.path.join(PROJECT_ROOT, "package.json"), os.path.join(STAGE_DIR, "package.json"))

print("[2/4] Packing app.asar...")
asar_cli = os.path.join(PROJECT_ROOT, "node_modules", "@electron", "asar", "bin", "asar.js")
res = subprocess.run(["node", asar_cli, "pack", STAGE_DIR, APP_ASAR], capture_output=True, text=True)
if res.returncode != 0:
    print(f"Error packing asar: {res.stderr}")
    exit(1)
print(f"Packed {APP_ASAR} successfully.")

print("[3/4] Updating DynislCore in release...")
os.makedirs(CORE_DEST, exist_ok=True)
for item in os.listdir(CORE_SRC):
    s = os.path.join(CORE_SRC, item)
    d = os.path.join(CORE_DEST, item)
    if os.path.isfile(s):
        shutil.copy2(s, d)
print(f"Copied {CORE_SRC} -> {CORE_DEST}")

print("[4/4] Cleaning staging folder...")
shutil.rmtree(STAGE_DIR, ignore_errors=True)
print("ALL DONE SUCCESS!")
