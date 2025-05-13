// Parameter thresholds for all water quality parameters
export const PARAMETER_THRESHOLDS = {
	temperature: {
	  optimal: [28, 30] as [number, number],
	  acceptable: [18, 33] as [number, number],
	  unit: '°C'
	},
	oxygen: {
	  optimal: [5, 8] as [number, number],
	  acceptable: [4, 10] as [number, number],
	  unit: 'mg/L'
	},
	salinity: {
	  optimal: [26, 32] as [number, number],
	  acceptable: [5, 35] as [number, number],
	  unit: 'ppt'
	},
	acidity: {
	  optimal: [7.5, 8.5] as [number, number],
	  acceptable: [7, 9] as [number, number],
	  unit: 'pH'
	}
  };

  // Quality level descriptions
  export const QUALITY_DESCRIPTIONS = {
	SANGAT_BAIK: 'Semua parameter berada dalam rentang optimal untuk pertumbuhan udang.',
	BAIK: 'Sebagian besar parameter dalam rentang baik, tetapi beberapa mendekati batas atau diluar batas yang dibutuhkan dalam pertumbuhan udang.',
	BURUK: 'Beberapa parameter kualitas air berada di luar rentang optimal untuk pertumbuhan udang. Perlu dilakukan tindakan pencegahan segera!',
	SANGAT_BURUK: 'Kondisi KRITIS, sebagian besar parameter berada di luar rentang yang dapat diterima. Sangat buruk untuk kondisi pertumbuhan udang segera lakukan tindakan pencegahan!'
  };

  // Quality level colors for UI display
  export const QUALITY_COLORS = {
	SANGAT_BAIK: '#52c41a', // green
	BAIK: '#13c2c2',        // cyan
	BURUK: '#fa8c16',       // orange
	SANGAT_BURUK: '#f5222d' // red
  };

  // Status colors for UI display
  export const STATUS_COLORS = {
	'optimal': '#52c41a',     // green
	'acceptable': '#fa8c16',  // orange
	'out_of_range': '#f5222d' // red
  };

  // Water quality data structure
  export interface WaterQualityData {
	temperature: number;
	oxygen: number;
	salinity: number;
	acidity: number;
  }

  // Parameter status with additional information
	export interface ParameterStatus {
		value: number;
		status: 'optimal' | 'acceptable' | 'out_of_range';
		optimal_range: [number, number];
		acceptable_range: [number, number];
		explanation?: string;
		unit?: string;
		recommendation?: string;
	}

  // Prediction response from API
  export interface PredictionResponse {
	poolId: string;
	timestamp: string;
	currentValues: WaterQualityData;
	predictions: WaterQualityData;
	predictionTimes: {
	  predictionTime: string;
	  horizon: string;
	  targetTime: string;
	} | Record<string, number | string>;
	classification: string;
	confidence: number;
	explanation: {
	  overall?: string;
	  recommendation?: string;
	  prediction?: string;
	  confidence?: number;
	  weighted_score?: number;
	  parameters: Record<string, ParameterStatus>;
	};
	predictionId?: string;
	classificationId?: string;
  }

  // Monitoring record from API
  export interface MonitoringRecord {
	_id: string;
	poolsId: string;
	temperature: number;
	oxygen: number;
	salinity: number;
	acidity: number;
	createdAt: string;
	userId?: string;
  }

  // Previous prediction records
	export interface PredictionRecord {
		_id: string;
		poolId: string;
		userId?: string;
		predictionTime: string;
		predictionHorizon?: number;
		timestamp: string;
		currentValues: WaterQualityData;
		predictions: WaterQualityData;
		predictionTimes: {
			prediction_time: string;
			horizon: string;
			targetTime: string;
		};
		classification?: string | {
			_id: string;
			qualityLevel: string;
			confidence: number;
			explanation: any;
		};
		confidence?: number;
		explanation?: Record<string, any>;
	}

	export interface PredictionComparison {
		predictionId: string;
		targetTime: number;
		monitoringTime: number;
		timeDiff: number;
		predictedValues: WaterQualityData;
		actualValues: WaterQualityData;
		accuracy: Record<string, number>;
	}

  export interface CompletePredictionRecord extends PredictionRecord {
	completed: boolean;
 	comparison: PredictionComparison | null;
  }

  export interface DataPoint {
	timestamp: number;
	displayTime: string;
	type: 'monitoring' | 'prediction';
	isPastPrediction: boolean;
	isFuture?: boolean;
	isActual?: boolean;
	temperature: number;
	oxygen: number;
	salinity: number;
	acidity: number;
	predictionId?: string;
	comparisonData?: PredictionComparison;
}

  // Dashboard prediction props
  export interface DashboardPredictionProps {
	poolId: string;
  }

  // Optimal ranges for chart visualization
  export interface OptimalRanges {
	temperature: [number, number];
	oxygen: [number, number];
	salinity: [number, number];
	pH: [number, number];
  }

  // View mode for chart display
  export type ChartViewMode = 'combined' | 'monitoring' | 'predictions';

  // Time range for historical data
  export type TimeRange = '24h' | '72h' | '7d';

  // Chart parameter color scheme
  export interface ParameterColors {
	line: string;
	fill: string;
	point: string;
	prediction: string;
	optimal: string;
  }

  // Chart colors configuration
  export interface ColorScheme {
	temperature: ParameterColors;
	oxygen: ParameterColors;
	salinity: ParameterColors;
	pH: ParameterColors;
  }

  export interface TimelineData {
	timestamp: number;
	value: number;
	type: 'monitoring' | 'prediction';
	isPastPrediction: boolean;
  }

  export interface ChartTimelineConfig {
	currentTime: number;
	predictionHorizon: number;
	timeRange: TimeRange;
  }

  // Chart props
  export interface RecordChartProps {
	labels: string[];
	timestamps: number[],
	temp: number[];
	oxygen: number[];
	salinity: number[];
	pH: number[];
	optimals: OptimalRanges;
	acceptable: {
	  temperature: [number, number];
	  oxygen: [number, number];
	  salinity: [number, number];
	  pH: [number, number];
	};
	predictionHorizon: number;
	viewMode?: ChartViewMode;
	pointTypes?: Array<{
	  type: 'monitoring' | 'prediction';
	  isPastPrediction: boolean;
	}>;
  }

  // Chart legend props
  export interface ChartLegendProps {
	parameters: typeof PARAMETER_THRESHOLDS;
	predictionHorizon: number;
	chartView: ChartViewMode;
	lastUpdated: Date | null;
  }

  export const formatIndonesianDate = (date: Date): string => {
	return date.toLocaleString('id-ID', {
	  hour: '2-digit',
	  minute: '2-digit',
	  day: '2-digit',
	  month: '2-digit',
	  timeZone: 'Asia/Jakarta'
	});
  };

  export const addPredictionLabel = (dateString: string, isHistorical: boolean = false): string => {
	if (isHistorical) {
	  return `${dateString} (Historis Prediksi)`;
	}
	return `${dateString} (Prediksi)`;
  };

  export const isPredictionPoint = (index: number, data: any[], viewMode: ChartViewMode): boolean => {
	return (
	  (viewMode === 'combined' || viewMode === 'predictions') &&
	  index >= data.length - 2
	);
  };
