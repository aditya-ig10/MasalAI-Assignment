"""Single-service entrypoint for Render.

Runs the FastAPI backend and the Next.js frontend side by side in one
container: the frontend serves public traffic on $PORT, the backend listens
on an internal port, and Next.js rewrites /live/* to it. If either process
dies, the other is stopped so Render restarts a clean pair.
"""

import os
import shutil
import signal
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = os.environ.get("PORT", "10000")
BACKEND_PORT = os.environ.get("BACKEND_PORT", "8000")


def node_bin() -> str:
    found = shutil.which("node")
    if found:
        return found
    for candidate in (
        os.path.expanduser("~/.nodejs/bin/node"),
        "/tmp/nodejs/bin/node",
    ):
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return "node"


def spawn(args: list[str], cwd: str, extra_env: dict | None = None) -> subprocess.Popen:
    env = dict(os.environ)
    if extra_env:
        env.update(extra_env)
    return subprocess.Popen(
        args,
        cwd=cwd,
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )


def main() -> int:
    node_dir = os.path.dirname(node_bin())
    if node_dir and node_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = node_dir + os.pathsep + os.environ.get("PATH", "")
    backend = spawn(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            BACKEND_PORT,
        ],
        cwd=os.path.join(ROOT, "backend"),
        extra_env={"PYTHONPATH": os.path.join(ROOT, "backend")},
    )
    frontend = spawn(
        ["node", "node_modules/next/dist/bin/next", "start", "-p", PORT],
        cwd=os.path.join(ROOT, "frontend"),
    )
    children = {"backend": backend, "frontend": frontend}

    stop = False

    def handle_signal(signum, _frame):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    exit_code = 0
    while True:
        if stop:
            break
        for name, proc in children.items():
            if proc.poll() is not None:
                print(f"[server] {name} exited with code {proc.returncode}, stopping.", flush=True)
                exit_code = proc.returncode or 1
                stop = True
                break
        if stop:
            break
        time.sleep(1)

    for proc in children.values():
        if proc.poll() is None:
            proc.terminate()
    deadline = time.time() + 10
    for proc in children.values():
        remaining = max(0, deadline - time.time())
        try:
            proc.wait(timeout=remaining if remaining else None)
        except subprocess.TimeoutExpired:
            proc.kill()
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
