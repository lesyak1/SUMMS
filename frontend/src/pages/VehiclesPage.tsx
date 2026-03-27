import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import carImage from '../assets/lightning-mcqueen-cars-movie.gif';

const VehiclesPage = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('');
    const navigate = useNavigate();

    const fetchVehicles = async () => {
      setLoading(true);
      try {
        let query = '?';
        if (typeFilter) query += `type=${typeFilter}&`;
            if (priceFilter) query += `maxPrice=${priceFilter}&`;

        const res = await api.get(`/vehicles${query}`);
        setVehicles(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
    fetchVehicles();
    }, [typeFilter, priceFilter]);

    return (
        <div className="min-h-screen  px-10 py-14">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-5xl font-bold mb-12">Find Vehicles</h1>

        <div className="flex flex-col gap-3 max-w-md mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Max Price</span>
            <span className="text-sm font-semibold text-black">
              ${Number(priceFilter).toFixed(2)}/min
            </span>
          </div>
          <input
            type="range"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            min={0.05}
            max={5.0}
            step={0.05}
            className="w-full accent-black"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>$0.05</span>
            <span>$5.00</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {['', 'Car', 'Bike', 'Scooter'].map((type) => (
            <button
              key={type || 'ALL'}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                typeFilter === type
                  ? '!bg-black !text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <img
                  src={carImage}
                  alt="vehicle"
                  className="h-40 w-full object-cover mb-4"
                />

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    {v.car?.model || (v.bike ? 'Bike' : 'Scooter')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Type: {v.car ? 'Car' : v.bike ? 'Bike' : 'Scooter'}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Price:{' '}
                    <span className="font-medium">${v.costPerMinute}/min</span>
                  </p>
                  <p className="text-sm">
                    Available:{' '}
                    <span
                      className={
                        v.availability
                          ? 'text-green-600 font-medium'
                          : 'text-red-500'
                      }
                    >
                      {v.availability ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/vehicles/${v.id}`)}
                  disabled={!v.availability}
                  className={`w-full py-2 rounded-md text-sm font-medium transition-colors focus:outline-none ${
                    v.availability
                      ? '!bg-black !text-white hover:!bg-gray-800'
                      : '!bg-gray-600 !text-gray-300 !opacity-60 cursor-not-allowed'
                  }`}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && vehicles.length === 0 && (
          <p className="text-gray-500 text-center py-8">No vehicles found.</p>
        )}
      </div>
    </div>
  );
};

export default VehiclesPage;
