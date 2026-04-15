python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt
uvicorn app.main:app --reload --host localhost --port 4533 --app-dir .\backend
