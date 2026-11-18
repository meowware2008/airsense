# Entrypoint for Render / Gunicorn / PaaS deployments
from backend.wsgi import app

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
