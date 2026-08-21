import subprocess
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

backend_runner = BACKEND / "node_modules" / "nodemon" / "bin" / "nodemon.js"
frontend_runner = FRONTEND / "node_modules" / "vite" / "bin" / "vite.js"

backend_proc = None
frontend_proc = None

def clear_screen():
    subprocess.run("cls" if os.name == "nt" else "clear", shell=True)

def stop_process(proc, name):
    print(f"[WARN] Stopping {name}...")
    time.sleep(1)

    if proc is None or proc.poll() is not None:
        return

    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        proc.terminate()

def stop_all():
    stop_process(frontend_proc, "frontend")
    stop_process(backend_proc, "backend")
    print("[OK] Dev servers stopped.")
    time.sleep(0.5)

clear_screen()

print("---------- The APPLE Project ------------------------------------------\n")
print("[INIT] Detecting source...")
time.sleep(1)
print(f"[INFO] Source detected at \"{ROOT}\"")
time.sleep(0.5)
print("[py] Initiating The Apple Project...")
time.sleep(1)
print("[ps] Press CTRL + C to stop...\n")
time.sleep(0.5)

if not backend_runner.exists():
    print("[ERROR] Backend nodemon not found.")
    print("[FIX] Run: cd backend && npm install")
    raise SystemExit(1)

if not frontend_runner.exists():
    print("[ERROR] Frontend vite not found.")
    print("[FIX] Run: cd frontend && npm install")
    raise SystemExit(1)

try:
    backend_proc = subprocess.Popen(
        ["node", str(backend_runner), "src/server.js"],
        cwd=BACKEND,
    )

    frontend_proc = subprocess.Popen(
        ["node", str(frontend_runner)],
        cwd=FRONTEND,
    )

    while True:
        backend_done = backend_proc.poll() is not None
        frontend_done = frontend_proc.poll() is not None

        if backend_done or frontend_done:
            print("\n[FATAL] One dev server stopped unexpectedly.")
            break

        time.sleep(0.5)

except KeyboardInterrupt:
    print()

finally:
    stop_all()