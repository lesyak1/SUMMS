import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../lib/api';
import { getErrorMessage } from '../lib/apiError';
import { useAuth } from '../features/auth/context/useAuth';
import {
    getPaymentStorageKey,
    isRentalPaymentDataValid,
    parseStoredPaymentData
} from '../features/rentals/rentalHelpers';

// Fix for Leaflet default icon issues in React/Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type ParkingSpot = {
    id: string;
    location: string;
    reservedByCurrentUser?: boolean;
    status: string;
    latitude?: number;
    longitude?: number;
};

const ParkingPage = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const getSpotCity = () => "Montreal";

    const fetchSpots = async () => {
        try {
            const res = await api.get('/parking-spots');
            setSpots(res.data as ParkingSpot[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpots();
    }, []);

    const reserveSpot = async (spotId: string) => {
        if (!profile) return;
        const raw = localStorage.getItem(getPaymentStorageKey(profile.id));
        const paymentData = parseStoredPaymentData(raw);
        if (!isRentalPaymentDataValid(paymentData)) {
            navigate('/payment');
            return;
        }
        try {
            const start = new Date();
            const end = new Date(start.getTime() + 7200000); // 2 hours

            await api.post('/parking-spots/reservations', {
                spotId,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            });
            setMsg('Spot reserved successfully (for 2 hours)!');
            fetchSpots();
        } catch (err: unknown) {
            setMsg(getErrorMessage(err, 'Unable to reserve this spot.'));
        }
    };

    const unreserveSpot = async (spotId: string) => {
        try {
            await api.delete(`/parking-spots/reservations/${spotId}`);
            setMsg('Spot unreserved successfully!');
            fetchSpots();
        } catch (err: unknown) {
            setMsg(getErrorMessage(err, 'Unable to unreserve this spot.'));
        }
    };

    const defaultCenter: [number, number] = [45.4971, -73.5789]; // Concordia University, Montreal

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">Parking Availability</h1>

            {msg && <p className="status-msg">{msg}</p>}

            {!loading && spots.length > 0 && (
                <div className="parking-map-container">
                    <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {spots.filter(s => s.latitude && s.longitude).map(spot => (
                            <Marker key={spot.id} position={[spot.latitude!, spot.longitude!]}>
                                <Popup>
                                    <div className="map-popup-content">
                                        <h3>{spot.location}</h3>
                                        <p>City: {getSpotCity()}</p>
                                        <div className={`map-status-badge ${spot.status === 'AVAILABLE' ? 'map-status-available' : 'map-status-reserved'}`}>
                                            {spot.status}
                                        </div>
                                        <div style={{ marginTop: '10px' }}>
                                            {spot.status === 'AVAILABLE' ? (
                                                <button
                                                    className="rentals-pay-btn"
                                                    onClick={() => reserveSpot(spot.id)}
                                                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                >
                                                    Reserve Now
                                                </button>
                                            ) : spot.reservedByCurrentUser && (
                                                <button
                                                    className="del-btn"
                                                    onClick={() => unreserveSpot(spot.id)}
                                                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                >
                                                    Unreserve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            )}

            {loading ? <p>Loading parking spots...</p> : (
                <div className="grid">
                    {spots.map(spot => (
                        <div
                            key={spot.id}
                            className={spot.status === 'RESERVED' ? 'card parking-reserved-card' : 'card'}
                        >
                            <h3>{spot.location}</h3>
                            <p>City: {getSpotCity()}</p>
                            <p>Status: {spot.status}</p>
                            {spot.status === 'AVAILABLE' ? (
                                <button className="rentals-pay-btn" onClick={() => reserveSpot(spot.id)}>
                                    Reserve Spot
                                </button>
                            ) : spot.reservedByCurrentUser ? (
                                <button className="del-btn" onClick={() => unreserveSpot(spot.id)}>
                                    Unreserve Spot
                                </button>
                            ) : (
                                <button disabled>
                                    Unavailable
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!loading && spots.length === 0 && (
                <p>No parking spots found.</p>
            )}
        </div>
    );
};

export default ParkingPage;
