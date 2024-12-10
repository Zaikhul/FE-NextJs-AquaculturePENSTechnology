import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

type positionDataType = {
    id: number;
    name: string;
    lat: number;
    lng: number;
}

function DashboardMap() {
    const [positionData, setPositionData] = useState<positionDataType[]>([]);
    
    // Define center position with correct type
    const defaultCenter: LatLngExpression = [0, 0];

    useEffect(() => {}, []);

    return (
        <MapContainer 
            center={defaultCenter}
            zoom={2} 
            style={{ height: '500px', width: '100%' }}
            scrollWheelZoom={false}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.webp"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {positionData.map((position: positionDataType) => {
                const markerPosition: LatLngExpression = [position.lat, position.lng];
                return (
                    <Marker key={position.id} position={markerPosition}>
                        <Popup>
                            {position.name}
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}

export default DashboardMap;