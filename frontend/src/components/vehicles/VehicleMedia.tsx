import type { CSSProperties } from 'react';
import { Bike, CarFront, Scooter } from 'lucide-react';
import {
    fallbackStylesByType,
    getVehicleDisplayName,
    getVehicleImageUrl,
    getVehicleType,
    type VehicleWithMedia
} from './vehicleMedia.shared';

type VehicleMediaProps = {
    vehicle: VehicleWithMedia;
    alt?: string;
    className?: string;
    style?: CSSProperties;
    iconSize?: number;
};

const renderFallbackIcon = (type: ReturnType<typeof getVehicleType>, iconSize: number) => {
    const iconProps = {
        size: iconSize,
        strokeWidth: 2.1
    };

    if (type === 'CAR') return <CarFront {...iconProps} />;
    if (type === 'BIKE') return <Bike {...iconProps} />;
    return <Scooter {...iconProps} />;
};

const VehicleMedia = ({ vehicle, alt, className, style, iconSize = 44 }: VehicleMediaProps) => {
    const imageUrl = getVehicleImageUrl(vehicle);
    const label = alt || getVehicleDisplayName(vehicle);

    if (imageUrl) {
        return (
            <div className={className} style={{ overflow: 'hidden', ...style }}>
                <img
                    src={imageUrl}
                    alt={label}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            </div>
        );
    }

    const vehicleType = getVehicleType(vehicle);

    return (
        <div
            aria-label={label}
            className={className}
            role="img"
            style={{
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                ...fallbackStylesByType[vehicleType],
                ...style
            }}
        >
            {renderFallbackIcon(vehicleType, iconSize)}
        </div>
    );
};

export default VehicleMedia;
