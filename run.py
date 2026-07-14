"""
run.py  —  Project root entry point
-------------------------------------
Instead of typing "python backend/app.py" every time,
just run:   python run.py
from the disaster-risk-system folder.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from app import app

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  AI Disaster Risk Assessment & Early Warning System")
    print("="*55)
    print("  Open your browser at:  http://127.0.0.1:5000")
    print("  Press Ctrl+C to stop the server.")
    print("="*55 + "\n")
    app.run(debug=True, port=5000)
