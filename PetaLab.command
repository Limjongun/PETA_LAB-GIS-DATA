#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
export PYTHONPATH="$(pwd)/backend"
echo "==================================================="
echo "  Menyalakan PetaLab Local Server..."
echo "  Buka http://127.0.0.1:8765 di browser Anda"
echo "==================================================="
python3 -m petalab.main --open-browser
