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

// Point type for chart visualization
export interface PointType {
	timestamp: number;
	displayTime: string;
	type: 'monitoring' | 'prediction';
	PastPrediction: boolean;
	FuturePrediction?: boolean;
	temperature: number;
	oxygen: number;
	salinity: number;
	acidity: number;
	predictionId?: string;
	comparisonData?: PredictionComparison | null;
}

/**
 *
 *
 ********* Interfaces Index **********
 *
 */
// Dashboard prediction props
export interface DashboardPredictionProps {
	poolId: string;
}

// Time range for historical data
export type TimeRange = '24h' | '72h' | '7d';

// View mode for chart display
export type ChartViewMode = 'combined' | 'monitoring' | 'predictions';

// Optimal ranges for chart visualization
export interface OptimalRanges {
	temperature: [number, number];
	oxygen: [number, number];
	salinity: [number, number];
	pH: [number, number];
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

// prediction records
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
		predictionTime: string;
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

export interface CompletePredictionRecord extends PredictionRecord {
	completed: boolean;
	comparison: PredictionComparison | null;
}

export interface PredictionComparison {
	predictionId: string;
    targetTime: number;
    monitoringTime: number;
    timeDiff: number;
    predictedValues: WaterQualityData;
    accuracy: Record<string, number>;
}

/**
 *
 *
 ********* Interfaces CardPrediction **********
 *
 */

export interface ChartControlProps {
	timeRange: TimeRange;
	chartView: ChartViewMode;
	onTimeRangeChange: (value: TimeRange) => void;
	onChartViewChange: (value: ChartViewMode) => void;
}

// Chart props
export interface RecordChartProps {
	labels: string[];
	timestamps: number[];
	temperature: number[];
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
	pointTypes?: PointType[] | null;
	fetchPrediction: () => Promise<void>;
	fetchMonitoring: () => Promise<void>;
	fetchHistoricalPredictions: () => Promise<void>;
	lastUpdated: Date | null;
	timeRange: TimeRange;
	chartView: ChartViewMode;
	onTimeRangeChange: (value: TimeRange) => void;
	onChartViewChange: (value: ChartViewMode) => void;
}

// Chart colors configuration
export interface ColorScheme {
	temperature: ParameterColors;
	oxygen: ParameterColors;
	salinity: ParameterColors;
	pH: ParameterColors;
}

// Chart parameter color scheme
export interface ParameterColors {
	line: string;
	fill: string;
	point: string;
	prediction: string;
	optimal: string;
}

/**
 * tooltip item type
 */
export interface ChartTooltipItem {
	datasetIndex: number;
	dataIndex: number;
	parsed?: {
		x?: number;
		y?: number;
	};
}

/**
 * Data point structure for chart datasets
 */
export interface DataPoint {
	x: number; // timestamp
	y: number; // value
	predictionId?: string;
	FuturePrediction?: boolean;
	PastPrediction?: boolean;
	comparisonData?: PredictionComparison;
}

export interface PredictionComparison {
	predictionId: string;
	targetTime: number;
	monitoringTime: number;
	timeDiff: number;
	predictedValues: WaterQualityData;
	accuracy: Record<string, number>;
}

/**
 *
 *
 ********* Interfaces ChartLegend **********
 *
 */

// Chart legend props
export interface ChartLegendProps {
	parameters: typeof PARAMETER_THRESHOLDS;
	predictionHorizon: number;
	chartView: ChartViewMode;
	lastUpdated: Date | null;
}

/**
 *
 *
 ********* Interfaces Card Components **********
 *
 */
export interface ChartComponentProps {
  labels: string[];
  timestamps: number[];
  temperature: number[];
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
  pointTypes?: PointType[] | null;
}
