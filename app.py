# Root alias for Render and PaaS hosting that defaults to 'app:app'
from backend.wsgi import app

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
