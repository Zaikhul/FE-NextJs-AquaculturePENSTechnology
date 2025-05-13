/**
 * ChartPrediction interface
 */
export interface PointType {
  type: 'monitoring' | 'prediction';
  isPastPrediction: boolean;
  predictionId?: string;
}

export interface DataPoint {
  x: number; // timestamp
  y: number; // value
  predictionId?: string;
}
