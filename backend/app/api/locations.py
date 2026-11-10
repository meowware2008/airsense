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
]


def seed_default_locations():
    """Ensure baseline Indian cities exist in the database."""
    count = db_session.query(Location).count()
    if count == 0:
        for c in DEFAULT_CITIES:
            loc = Location(
                name=c["name"],
                region=c["region"],
                country=c["country"],
                latitude=c["latitude"],
                longitude=c["longitude"],
            )
            db_session.add(loc)
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
