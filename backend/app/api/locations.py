from flask import Blueprint, request, jsonify
from backend.app.database import db_session
from backend.app.models import Location

locations_bp = Blueprint("locations", __name__, url_prefix="/api/v1/locations")

DEFAULT_CITIES = [
    {"name": "Delhi", "region": "Delhi", "country": "India", "latitude": 28.6139, "longitude": 77.2090},
    {"name": "Mumbai", "region": "Maharashtra", "country": "India", "latitude": 19.0760, "longitude": 72.8777},
    {"name": "Bengaluru", "region": "Karnataka", "country": "India", "latitude": 12.9716, "longitude": 77.5946},
    {"name": "Kolkata", "region": "West Bengal", "country": "India", "latitude": 22.5726, "longitude": 88.3639},
    {"name": "Chennai", "region": "Tamil Nadu", "country": "India", "latitude": 13.0827, "longitude": 80.2707},
    {"name": "Hyderabad", "region": "Telangana", "country": "India", "latitude": 17.3850, "longitude": 78.4867},
    {"name": "Ahmedabad", "region": "Gujarat", "country": "India", "latitude": 23.0225, "longitude": 72.5714},
    {"name": "Pune", "region": "Maharashtra", "country": "India", "latitude": 18.5204, "longitude": 73.8567},
    {"name": "Jaipur", "region": "Rajasthan", "country": "India", "latitude": 26.9124, "longitude": 75.7873},
    {"name": "Lucknow", "region": "Uttar Pradesh", "country": "India", "latitude": 26.8467, "longitude": 80.9462},
    {"name": "Kanpur", "region": "Uttar Pradesh", "country": "India", "latitude": 26.4499, "longitude": 80.3319},
    {"name": "Patna", "region": "Bihar", "country": "India", "latitude": 25.5941, "longitude": 85.1376},
    {"name": "Varanasi", "region": "Uttar Pradesh", "country": "India", "latitude": 25.3176, "longitude": 82.9739},
    {"name": "Chandigarh", "region": "Punjab & Haryana", "country": "India", "latitude": 30.7333, "longitude": 76.7794},
    {"name": "Bhopal", "region": "Madhya Pradesh", "country": "India", "latitude": 23.2599, "longitude": 77.4126},
    {"name": "Indore", "region": "Madhya Pradesh", "country": "India", "latitude": 22.7196, "longitude": 75.8577},
    {"name": "Kochi", "region": "Kerala", "country": "India", "latitude": 9.9312, "longitude": 76.2673},
    {"name": "Surat", "region": "Gujarat", "country": "India", "latitude": 21.1702, "longitude": 72.8311},
    {"name": "Visakhapatnam", "region": "Andhra Pradesh", "country": "India", "latitude": 17.6868, "longitude": 83.2185},
    {"name": "Agra", "region": "Uttar Pradesh", "country": "India", "latitude": 27.1767, "longitude": 78.0081},
    {"name": "Ludhiana", "region": "Punjab", "country": "India", "latitude": 30.9010, "longitude": 75.8573},
    {"name": "Gurugram", "region": "Haryana", "country": "India", "latitude": 28.4595, "longitude": 77.0266},
    {"name": "Noida", "region": "Uttar Pradesh", "country": "India", "latitude": 28.5355, "longitude": 77.3910},
    {"name": "Ghaziabad", "region": "Uttar Pradesh", "country": "India", "latitude": 28.6692, "longitude": 77.4538},
    {"name": "Faridabad", "region": "Haryana", "country": "India", "latitude": 28.4089, "longitude": 77.3178},
    {"name": "Coimbatore", "region": "Tamil Nadu", "country": "India", "latitude": 11.0168, "longitude": 76.9558},
    {"name": "Nagpur", "region": "Maharashtra", "country": "India", "latitude": 21.1458, "longitude": 79.0882},
    {"name": "Dehradun", "region": "Uttarakhand", "country": "India", "latitude": 30.3165, "longitude": 78.0322},
    {"name": "Guwahati", "region": "Assam", "country": "India", "latitude": 26.1445, "longitude": 91.7362},
    {"name": "Amritsar", "region": "Punjab", "country": "India", "latitude": 31.6340, "longitude": 74.8723},
    {"name": "Srinagar", "region": "Jammu & Kashmir", "country": "India", "latitude": 34.0837, "longitude": 74.7973},
]


def seed_default_locations():
    """Ensure comprehensive coverage of major Indian cities exist in the database."""
    try:
        existing = {loc.name.lower() for loc in db_session.query(Location.name).all()}
    except Exception:
        existing = set()

    added = False
    for c in DEFAULT_CITIES:
        if c["name"].lower() not in existing:
            loc = Location(
                name=c["name"],
                region=c["region"],
                country=c["country"],
                latitude=c["latitude"],
                longitude=c["longitude"],
            )
            db_session.add(loc)
            existing.add(c["name"].lower())
            added = True

    if added:
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()


@locations_bp.route("", methods=["GET"])
def list_locations():
    seed_default_locations()
    search = request.args.get("search", "").strip()
    query = db_session.query(Location)
    if search:
        query = query.filter(Location.name.ilike(f"%{search}%") | Location.region.ilike(f"%{search}%"))

    locations = query.order_by(Location.name.asc()).all()
    return jsonify({"locations": [loc.to_dict() for loc in locations]}), 200


@locations_bp.route("/<int:location_id>", methods=["GET"])
def get_location(location_id: int):
    loc = db_session.query(Location).filter(Location.id == location_id).first()
    if not loc:
        return jsonify({"error": "Location not found"}), 404
    return jsonify({"location": loc.to_dict()}), 200


@locations_bp.route("", methods=["POST"])
def create_location():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    region = (data.get("region") or "").strip()
    country = (data.get("country") or "India").strip()
    lat = data.get("latitude")
    lon = data.get("longitude")

    if not name or not region or lat is None or lon is None:
        return jsonify({"error": "Name, region, latitude, and longitude are required"}), 400

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return jsonify({"error": "Latitude and longitude must be valid floating point numbers"}), 400

    if not (-90.0 <= lat <= 90.0):
        return jsonify({"error": "Latitude must be between -90 and 90"}), 400

    if not (-180.0 <= lon <= 180.0):
        return jsonify({"error": "Longitude must be between -180 and 180"}), 400

    loc = Location(name=name, region=region, country=country, latitude=lat, longitude=lon)
    db_session.add(loc)
    db_session.commit()

    return jsonify({"message": "Location created successfully", "location": loc.to_dict()}), 201
