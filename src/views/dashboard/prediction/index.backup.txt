// pages/predict/[poolsId].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import ChartAcidisity from '../../../components/Chart/ChartAcidicity';
import ChartOxygen from '../../../components/Chart/ChartOxygen';
import ChartTemperature from '../../../components/Chart/ChartTemperature';
import ChartSalinity from '../../../components/Chart/ChartSalinity';
import Link from 'next/link';
import ArrowLeftOutlined from '@ant-design/icons/lib/icons/ArrowLeftOutlined';

interface Data {
	actual: {
		acidity: number[];
		oxygen: number[];
		salinity: number[];
		temperature: number[];
	};
	predicted: {
		acidity: number[];
		oxygen: number[];
		salinity: number[];
		temperature: number[];
	};
	quality: {
		acidity: {
			category: string;
			description: string;
		};
		oxygen: {
			category: string;
			description: string;
		};
		salinity: {
			category: string;
			description: string;
		};
		temperature: {
			category: string;
			description: string;
		};
	};
}

function DashboardPrediction() {
	const router = useRouter();
	const { pool_id } = router.query;
	const [data, setData] = useState<Data | null>(null);

	useEffect(() => {
		if (pool_id) {
			const fetchData = async () => {
				try {
					const response = await axios.get(`https://dev-python.aquaculturepens.com/predict/${pool_id}`);
					setData(response.data);
				} catch (error) {
					console.error('Error fetching data:', error);
				}
			};

			fetchData();
		}
	}, [pool_id]);

	const getColor = (category: string) => {
		if (category.toLowerCase().includes('buruk')) return 'bg-red-500';
		if (category.toLowerCase().includes('baik')) return 'bg-green-500';
		if (category.toLowerCase().includes('normal') || category.toLowerCase().includes('cukup') || category.toLowerCase().includes('memadai')) return 'bg-blue-500';
		return 'bg-gray-500';
	};

	if (!data) {
		return <div>Loading...</div>;
	}

	return (
		<div className="container mx-auto p-4">
			<Link href="/dashboard/ponds">
				<button className="text-2xl font-bold text-red-600">
					<ArrowLeftOutlined />
				</button>
			</Link>
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Acidity Levels</h1>
				<ChartAcidisity data={data} />
				<div className={`rounded p-4 text-white ${getColor(data.quality.acidity.category)}`}>
					<p className="text-3xl font-bold">{data.quality.acidity.category}</p>
					<p className="text-lg">{data.quality.acidity.description}</p>
				</div>
			</div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Temperature Levels</h1>
				<ChartTemperature data={data} />
				<div className={`rounded p-4 text-white ${getColor(data.quality.temperature.category)}`}>
					<p className="text-3xl font-bold">{data.quality.temperature.category}</p>
					<p className="text-lg">{data.quality.temperature.description}</p>
				</div>
			</div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Salinity Levels</h1>
				<ChartSalinity data={data} />
				<div className={`rounded p-4 text-white ${getColor(data.quality.salinity.category)}`}>
					<p className="text-3xl font-bold">{data.quality.salinity.category}</p>
					<p className="text-lg">{data.quality.salinity.description}</p>
				</div>
			</div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Oxygen Levels</h1>
				<ChartOxygen data={data} />
				<div className={`rounded p-4 text-white ${getColor(data.quality.oxygen.category)}`}>
					<p className="text-3xl font-bold">{data.quality.oxygen.category}</p>
					<p className="text-lg">{data.quality.oxygen.description}</p>
				</div>
			</div>
		</div>
	);
};

export default DashboardPrediction;
