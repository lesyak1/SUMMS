import { useEffect, useState } from 'react';
import api from '../lib/api';

type PublicTransportRoute = {
    id: string;
    name: string;
    schedule: string;
    type: string;
};

const PublicTransportPage = () => {
    const [routes, setRoutes] = useState<PublicTransportRoute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/public-transport/routes')
            .then(res => setRoutes(res.data as PublicTransportRoute[]))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, gap: 16 }}>
                <h1 className="text-5xl font-bold mb-12">Public Transport Schedules</h1>
                <a
                    href="https://www.stm.info/fr"
                    target="_blank"
                    rel="noreferrer"
                >
                    <button type="button">View STM Schedule</button>
                </a>
            </div>

            {loading ? <p>Loading routes...</p> : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Schedule</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.map(r => (
                            <tr key={r.id}>
                                <td>{r.type}</td>
                                <td>{r.name}</td>
                                <td>{r.schedule}</td>
                            </tr>
                        ))}
                        {routes.length === 0 && (
                            <tr><td colSpan={3}>No routes found</td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PublicTransportPage;
