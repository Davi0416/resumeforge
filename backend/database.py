import aiosqlite, json, uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "resumeforge.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                resume_text TEXT NOT NULL,
                job_text TEXT,
                mode TEXT NOT NULL,
                step1_result TEXT,
                step2_result TEXT,
                geral REAL
            )
        """)
        await db.commit()

def _row_to_dict(row, cursor) -> dict:
    cols = [d[0] for d in cursor.description]
    d = dict(zip(cols, row))
    # parse JSON fields
    for f in ("step1_result", "step2_result"):
        if d.get(f):
            try:
                d[f] = json.loads(d[f])
            except Exception:
                pass
    # camelCase for frontend
    return {
        "id": d["id"],
        "date": d["date"],
        "resumeText": d["resume_text"],
        "jobText": d["job_text"],
        "mode": d["mode"],
        "step1Result": d.get("step1_result"),
        "step2Result": d.get("step2_result"),
        "geral": d.get("geral"),
    }

async def save_analysis(resume_text: str, job_text: str, mode: str,
                        step1_result: dict | None, step2_result: dict | None):
    entry_id = str(uuid.uuid4())
    date = datetime.now(timezone.utc).isoformat()
    geral = step1_result.get("scores", {}).get("geral") if step1_result else None
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO analyses VALUES (?,?,?,?,?,?,?,?)",
            (entry_id, date, resume_text, job_text or "", mode,
             json.dumps(step1_result) if step1_result else None,
             json.dumps(step2_result) if step2_result else None,
             geral)
        )
        await db.commit()
    return entry_id

async def get_all() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM analyses ORDER BY date DESC") as cur:
            rows = await cur.fetchall()
            if not rows:
                return []
            # rebuild with description
            async with db.execute("SELECT * FROM analyses ORDER BY date DESC") as cur2:
                cur2_rows = await cur2.fetchall()
                result = []
                for row in cur2_rows:
                    cols = [d[0] for d in cur2.description]
                    d = dict(zip(cols, row))
                    for f in ("step1_result", "step2_result"):
                        if d.get(f):
                            try: d[f] = json.loads(d[f])
                            except: pass
                    result.append({
                        "id": d["id"], "date": d["date"],
                        "resumeText": d["resume_text"], "jobText": d["job_text"],
                        "mode": d["mode"], "step1Result": d.get("step1_result"),
                        "step2Result": d.get("step2_result"), "geral": d.get("geral"),
                    })
                return result

async def _get_by_score(order: str, limit: int = 1) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            f"SELECT * FROM analyses WHERE geral IS NOT NULL ORDER BY geral {order} LIMIT ?",
            (limit,)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            cols = [d[0] for d in cur.description]
            d = dict(zip(cols, row))
            for f in ("step1_result", "step2_result"):
                if d.get(f):
                    try: d[f] = json.loads(d[f])
                    except: pass
            return {"resumeText": d["resume_text"], "step1Result": d.get("step1_result"), "geral": d.get("geral")}

async def get_best() -> dict | None:
    return await _get_by_score("DESC")

async def get_worst() -> dict | None:
    return await _get_by_score("ASC")

async def delete_analysis(entry_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM analyses WHERE id = ?", (entry_id,))
        await db.commit()
