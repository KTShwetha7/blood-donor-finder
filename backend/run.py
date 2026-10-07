"""
Server Runner Script
--------------------
Convenience script to start the FastAPI server using Uvicorn.
Run with:
    python run.py
or:
    uvicorn app.main:app --reload --port 8000
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.PROJECT_NAME} on http://127.0.0.1:8000 ...")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
