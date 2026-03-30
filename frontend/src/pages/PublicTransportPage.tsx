import { useEffect, useState } from 'react';
import api from '../lib/api';

const PublicTransportPage = () => {
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/public-transport/routes')
            .then(res => setRoutes(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">Public Transport Schedules</h1>

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
