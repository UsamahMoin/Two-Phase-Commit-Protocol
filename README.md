# Two-Phase Commit Protocol

This repository contains a Python socket demo of the two-phase commit protocol and a GitHub Pages visualization that explains how the protocol reaches a commit or abort decision.

## Live Visualization

```text
https://usamahmoin.github.io/two-phase-commit-protocol/
```

The page lets you step through:

- a successful commit where Process A and Process B both vote `ACK`
- a participant failure where Process A votes `NO`
- a timeout path where the coordinator aborts because not every participant ACKs

## Python Demo

The original demo lives in `2PC/`.

Run each script in a separate terminal:

```bash
cd 2PC
python3 Process_A.py
python3 Process_B.py
python3 Coordinator.py
```

The coordinator connects to:

- Process A on `127.0.0.1:1233`
- Process B on `127.0.0.1:1234`

Then it sends `PREPARE`, waits for `ACK`, and broadcasts either `COMMIT` or `ABORT`.

## GitHub Pages

This is a static site with no build step. GitHub Pages should deploy from:

- branch: `main`
- folder: `/root`
