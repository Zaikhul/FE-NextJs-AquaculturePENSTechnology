import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Spin, Alert, Badge, Progress, Tabs, Tooltip, Statistic, Row, Col, Divider, Tag, Button, Select } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import cookiesHandler from '@/utils/storage/cookies';
import ChartPrediction from '@/components/RecordChart/CardPrediction';
import {
  PARAMETER_THRESHOLDS,
  QUALITY_DESCRIPTIONS,
  QUALITY_COLORS,
  STATUS_COLORS,
  WaterQualityData,
  PredictionResponse,
  MonitoringRecord,
  PredictionRecord,
  CompletePredictionRecord,
  PredictionComparison,
  DashboardPredictionProps,
  ChartViewMode,
  TimeRange,
  PointType,
} from '@/interfaces/prediction';

const { TabPane } = Tabs;
const { Option } = Select;

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL;

/**
 * Dashboard component for water quality monitoring and prediction visualization
 */
const DashboardPrediction: React.FC<DashboardPredictionProps> = ({ poolId }) => {
  // Core state management
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [historicalMonitoring, setHistoricalMonitoring] = useState<MonitoringRecord[]>([]);
  const [historicalPredictions, setHistoricalPredictions] = useState<PredictionRecord[]>([]);
  const [CompletePredictions, setCompletePredictions] = useState<CompletePredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionHorizon, setPredictionHorizon] = useState(6);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // NEW: Unified state management for chart controls
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartView, setChartView] = useState<ChartViewMode>('combined');

  /**
   * Format local time for display
   */
  const formatLocalTime = useCallback((date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) throw new Error('Invalid date');
      return dateObj.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  }, []);

  /**
   * Filter predictions to avoid showing those too close in time
   */
  const filterTimeProximity = useCallback((
    predictions: CompletePredictionRecord[]
  ): CompletePredictionRecord[] => {
    console.log(`Filtering ${predictions.length} predictions for time proximity`);
    if (predictions.length <= 5) {
      console.log("Not enough predictions to filter - keeping all", predictions.length);
      return predictions;
    }

    const sorted = [...predictions].sort((a, b) => {
      const getTargetTime = (pred: CompletePredictionRecord): number => {
        if (pred.predictionTimes?.targetTime) {
          return new Date(pred.predictionTimes.targetTime).getTime();
        }
        return new Date(pred.predictionTime ?? Date.now()).getTime() +
          ((pred.predictionHorizon ?? 6) * 60 * 60 * 1000);
      };
      return getTargetTime(a) - getTargetTime(b);
    });

    // Minimum time difference (2 hours)
    const minTimeDiffMs = 2 * 60 * 60 * 1000;
    const filtered: CompletePredictionRecord[] = [];
    let pastPredictions = 0;
    let pastPredictionsWithComparison = 0;
    let futurePredictions = 0;

    sorted.forEach((prediction, index) => {
      if (prediction.completed) {
        pastPredictions++;
        if (prediction.comparison) pastPredictionsWithComparison++;
      } else {
        futurePredictions++;
      }

      if (index === 0) {
        filtered.push(prediction);
        return;
      }

      const prevPredItem = filtered[filtered.length - 1];
      let prevPredTime: number;
      let currPredTime: number;

      try {
        if (prevPredItem.predictionTimes?.targetTime) {
          prevPredTime = new Date(prevPredItem.predictionTimes.targetTime).getTime();
        } else {
          prevPredTime = new Date(prevPredItem.predictionTime ?? Date.now()).getTime() +
            ((prevPredItem.predictionHorizon ?? 6) * 60 * 60 * 1000);
        }

        if (prediction.predictionTimes?.targetTime) {
          currPredTime = new Date(prediction.predictionTimes.targetTime).getTime();
        } else {
          currPredTime = new Date(prediction.predictionTime ?? Date.now()).getTime() +
            ((prediction.predictionHorizon ?? 6) * 60 * 60 * 1000);
        }

        if (prediction.completed && prediction.comparison) {
          filtered.push(prediction);
          return;
        }

        if (Math.abs(currPredTime - prevPredTime) >= minTimeDiffMs) {
          filtered.push(prediction);
        }
      } catch (error) {
        console.error("Error in time proximity filtering:", error);
        filtered.push(prediction);
      }
    });

    return filtered;
  }, []);

  /**
   * Identification of past predictions
   */
  const CompletedPredictions = useCallback((
    predictions: PredictionRecord[],
    monitoringData: MonitoringRecord[]
  ): CompletePredictionRecord[] => {
    const currentTime = new Date().getTime();
    const completePredictions: CompletePredictionRecord[] = [];

	const sortedMonitoringData = [...monitoringData].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    predictions.forEach(prediction => {
      let targetTimestamp: number;
      if (prediction.predictionTimes?.targetTime) {
        targetTimestamp = new Date(prediction.predictionTimes.targetTime).getTime();
      } else if (prediction.predictionTime) {
        targetTimestamp = new Date(prediction.predictionTime).getTime() +
          ((prediction.predictionHorizon ?? 6) * 60 * 60 * 1000);
      } else {
        return;
      }

      const isPast = targetTimestamp < currentTime;
      let comparison: PredictionComparison | null = null;

      if (isPast && monitoringData.length > 0) {
        const closestMonitoring = monitoringData.reduce((prev, curr) => {
          const currTime = new Date(curr.createdAt).getTime();
          const prevTime = new Date(prev.createdAt).getTime();
          return Math.abs(currTime - targetTimestamp) < Math.abs(prevTime - targetTimestamp) ? curr : prev;
        });

        const monitoringTime = new Date(closestMonitoring.createdAt).getTime();
        comparison = {
          predictionId: prediction._id,
          targetTime: targetTimestamp,
          monitoringTime,
          timeDiff: Math.abs(targetTimestamp - monitoringTime),
          predictedValues: prediction.predictions,
          accuracy: {
            temperature: Math.abs(prediction.predictions.temperature - closestMonitoring.temperature),
            oxygen: Math.abs(prediction.predictions.oxygen - closestMonitoring.oxygen),
            salinity: Math.abs(prediction.predictions.salinity - closestMonitoring.salinity),
            acidity: Math.abs(prediction.predictions.acidity - closestMonitoring.acidity),
          },
        };
      }

      completePredictions.push({
        ...prediction,
        completed: isPast,
        comparison,
      });
    });

    return filterTimeProximity(completePredictions);
  }, [filterTimeProximity]);

  /**
   * Fetch historical monitoring data based on selected time range
   */
  const fetchMonitoring = useCallback(async () => {
    try {
      const token = cookiesHandler.getCookie('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get monitoring records from last X hours based on timeRange
      const hoursToFetch = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 72;
      const response = await fetch(`${ML_API_URL}/monitors/${poolId}?hours=${hoursToFetch}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail ?? `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setHistoricalMonitoring(data);
    } catch (err) {
      console.error("Error fetching historical monitoring data:", err);
      setError(`Failed to fetch monitoring data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [poolId, timeRange]);

  /**
   * Fetch historical predictions
   */
  const fetchHistoricalPredictions = useCallback(async () => {
    try {
      const token = cookiesHandler.getCookie('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${ML_API_URL}/predictions/${poolId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail ?? `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Retrieved ${data.length} historical predictions`);

      if (data.length === 0) {
        console.warn('API returned empty predictions array - this may indicate a configuration issue');
      }

      const now = new Date().getTime();
      const pastPredictions = data.filter((pred: PredictionRecord) => {
        try {
          const targetTime = pred.predictionTimes?.targetTime
            ? new Date(pred.predictionTimes.targetTime).getTime()
            : new Date(pred.predictionTime).getTime() + ((pred.predictionHorizon ?? 6) * 60 * 60 * 1000);
          return targetTime < now;
        } catch (e) {
          console.warn("Error calculating prediction target time:", e);
          return false;
        }
      });

      console.log(`Found ${pastPredictions.length} past predictions out of ${data.length} total`);
      setHistoricalPredictions(data);
    } catch (err) {
      console.error("Error fetching historical predictions:", err);
      setError(`Failed to fetch prediction history: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [poolId]);

/**
 * Process predictions with monitoring data to identify completed predictions
 */
	useEffect(() => {
		if (historicalPredictions.length > 0 && historicalMonitoring.length > 0) {
		console.log(`Processing ${historicalPredictions.length} historical predictions and ${historicalMonitoring.length} monitoring records`);

		if (historicalMonitoring.length > 0) {
			const monitoringTimes = historicalMonitoring.map(m => new Date(m.createdAt).getTime());
			console.log(`Monitoring data timespan: ${new Date(Math.min(...monitoringTimes)).toISOString()} to ${new Date(Math.max(...monitoringTimes)).toISOString()}`);
		}

		if (historicalPredictions.length > 0) {
			const predictionTimes = historicalPredictions
			.filter(p => p.predictionTime)
			.map(p => new Date(p.predictionTime).getTime());
			if (predictionTimes.length > 0) {
			console.log(`Prediction creation timespan: ${new Date(Math.min(...predictionTimes)).toISOString()} to ${new Date(Math.max(...predictionTimes)).toISOString()}`);
			}
		}

		const ComparisonValues = CompletedPredictions(historicalPredictions, historicalMonitoring);
		setCompletePredictions(ComparisonValues);
		console.log('Enhanced predictions:', {
			total: ComparisonValues.length,
			completed: ComparisonValues.filter(p => p.completed).length,
			withComparison: ComparisonValues.filter(p => p.comparison !== null).length,
			future: ComparisonValues.filter(p => !p.completed).length
		});
		} else {
		console.log(`Missing data for prediction enhancement: ${historicalPredictions.length} predictions, ${historicalMonitoring.length} monitoring records`);
		}
	}, [historicalPredictions, historicalMonitoring, CompletedPredictions]);

	const handleTimeRangeChange = useCallback(async (newTimeRange: TimeRange) => {
	console.log(`Changing time range from ${timeRange} to ${newTimeRange}`);
	setTimeRange(newTimeRange);

	try {
		await Promise.all([
		fetchMonitoring(),
		fetchHistoricalPredictions()
		]);
	} catch (error) {
		console.error('Error updating data for new time range:', error);
		setError(`Failed to update data: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
	}, [fetchMonitoring, fetchHistoricalPredictions]);

	const handleChartViewChange = useCallback((newChartView: ChartViewMode) => {
	console.log(`Changing chart view from ${chartView} to ${newChartView}`);
	setChartView(newChartView);
	}, []);


/**
 * BARU: Apply proximity filter khusus untuk visualization
 * Berbeda dengan filterTimeProximity yang untuk data processing,
 * ini khusus untuk menghindari penumpukan di chart
 */
	const applyProximityFilterForVisualization = useCallback((
	predictions: CompletePredictionRecord[]
	): CompletePredictionRecord[] => {
	if (predictions.length <= 1) return predictions;

	// Sort berdasarkan targetTime
	const sorted = [...predictions].sort((a, b) => {
		const getTargetTime = (pred: CompletePredictionRecord): number => {
		if (pred.predictionTimes?.targetTime) {
			return new Date(pred.predictionTimes.targetTime).getTime();
		}
		return new Date(pred.predictionTime ?? Date.now()).getTime() +
			((pred.predictionHorizon ?? 6) * 60 * 60 * 1000);
		};
		return getTargetTime(a) - getTargetTime(b);
	});

	// Minimum time difference berdasarkan timeRange untuk visualization
	const getMinTimeDiff = () => {
		switch (timeRange) {
		case '24h': return 2 * 60 * 60 * 1000;  // 2 jam untuk 24h view
		case '72h': return 4 * 60 * 60 * 1000;  // 4 jam untuk 3 hari view
		case '7d': return 12 * 60 * 60 * 1000;  // 12 jam untuk 7 hari view
		default: return 2 * 60 * 60 * 1000;
		}
	};

	const minTimeDiffMs = getMinTimeDiff();
	const filtered: CompletePredictionRecord[] = [];

	console.log(`Applying proximity filter with ${minTimeDiffMs / (60 * 60 * 1000)} hour minimum gap for ${timeRange} timeRange`);

	sorted.forEach((prediction, index) => {
		if (index === 0) {
		filtered.push(prediction);
		return;
		}

		const currentTargetTime = (() => {
		if (prediction.predictionTimes?.targetTime) {
			return new Date(prediction.predictionTimes.targetTime).getTime();
		}
		return new Date(prediction.predictionTime ?? Date.now()).getTime() +
			((prediction.predictionHorizon ?? 6) * 60 * 60 * 1000);
		})();

		// Cek apakah ada prediksi yang sudah difilter dalam jarak minimum
		const hasNearbyPrediction = filtered.some(filteredPred => {
		const filteredTargetTime = (() => {
			if (filteredPred.predictionTimes?.targetTime) {
			return new Date(filteredPred.predictionTimes.targetTime).getTime();
			}
			return new Date(filteredPred.predictionTime ?? Date.now()).getTime() +
			((filteredPred.predictionHorizon ?? 6) * 60 * 60 * 1000);
		})();

		return Math.abs(currentTargetTime - filteredTargetTime) < minTimeDiffMs;
		});

		// Prioritas untuk prediksi dengan comparison data
		if (!hasNearbyPrediction) {
		filtered.push(prediction);
		} else if (prediction.comparison && !filtered[filtered.length - 1].comparison) {
		// Replace last prediction jika yang baru punya comparison data
		filtered[filtered.length - 1] = prediction;
		}

		// Log untuk debugging
		if (hasNearbyPrediction && prediction.comparison) {
		console.log(`Replaced nearby prediction with one that has comparison data: ${prediction._id}`);
		} else if (hasNearbyPrediction) {
		console.log(`Filtered out nearby prediction: ${prediction._id}`);
		}
	});

	console.log(`Proximity filter result: ${sorted.length} -> ${filtered.length} predictions`);
	return filtered;
	}, [timeRange]);

/**
 * Time series data
 */
	const TimeSeriesData = useCallback(() => {
	if (!predictionData || historicalMonitoring.length === 0) {
		console.log("Missing required data for chart visualization");
		return null;
	}

    const monitoringDataPoints: PointType[] = [];
    const predictionPoints: PointType[] = [];
    const currentTime = new Date().getTime();

    // Time range filtering configuration
    const timeRangeFilter = {
      '24h': 24 * 60 * 60 * 1000,
      '72h': 72 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange];

    // Process monitoring data with timeRange filter
	const monitoringCutoffTime = currentTime - timeRangeFilter;
	const sortedMonitoring = [...historicalMonitoring]
	.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
	.filter(record => new Date(record.createdAt).getTime() >= monitoringCutoffTime);

	sortedMonitoring.forEach(record => {
	const timestamp = new Date(record.createdAt).getTime();
	monitoringDataPoints.push({
		timestamp,
		displayTime: formatLocalTime(new Date(record.createdAt)),
		type: 'monitoring',
		PastPrediction: false,
		temperature: record.temperature,
		oxygen: record.oxygen,
		salinity: record.salinity,
		acidity: record.acidity,
	});
	});

	// Process current prediction (future)
	if ((chartView === 'combined' || chartView === 'predictions') && predictionData) {
	const baseTime = new Date(predictionData.timestamp).getTime();
	const timePadding = predictionHorizon <= 6 ? (predictionHorizon * 60 * 60 * 1000) * 0.2 : 0;
	const predictionTimestamp = baseTime + (predictionHorizon * 60 * 60 * 1000) + timePadding;

	const lastMonitoringPoint = monitoringDataPoints.length > 0 ?
		monitoringDataPoints[monitoringDataPoints.length - 1] : null;

	if (lastMonitoringPoint && chartView === 'combined') {
		predictionPoints.push({
		timestamp: lastMonitoringPoint.timestamp,
		displayTime: lastMonitoringPoint.displayTime + ' (Terakhir)',
		type: 'prediction',
		PastPrediction: false,
		FuturePrediction: true,
		temperature: lastMonitoringPoint.temperature,
		oxygen: lastMonitoringPoint.oxygen,
		salinity: lastMonitoringPoint.salinity,
		acidity: lastMonitoringPoint.acidity,
		predictionId: 'current-transition'
		});
	}

	predictionPoints.push({
		timestamp: predictionTimestamp,
		displayTime: formatLocalTime(new Date(predictionTimestamp)) + ' (Prediksi)',
		type: 'prediction',
		PastPrediction: false,
		FuturePrediction: true,
		temperature: predictionData.predictions.temperature,
		oxygen: predictionData.predictions.oxygen,
		salinity: predictionData.predictions.salinity,
		acidity: predictionData.predictions.acidity,
		predictionId: predictionData.predictionId ?? `current-${predictionTimestamp}`
	});
	}


	if ((chartView === 'predictions' || chartView === 'combined') && CompletePredictions.length > 0) {
		console.log(`Processing ${CompletePredictions.length} predictions for visualization with timeRange: ${timeRange}`);

		const predictionCutoffTime = currentTime - timeRangeFilter;

		const timeRangeFilteredPredictions = CompletePredictions.filter(pred => {
		if (!pred.completed) return false;

		let targetTime: number;
		if (pred.predictionTimes?.targetTime) {
			targetTime = new Date(pred.predictionTimes.targetTime).getTime();
		} else if (pred.predictionTime) {
			const horizonHours = pred.predictionHorizon ?? 6;
			targetTime = new Date(pred.predictionTime).getTime() + (horizonHours * 60 * 60 * 1000);
		} else {
			console.warn(`Prediction ${pred._id} has no valid time reference`);
			return false;
		}

		const isInTimeRange = targetTime >= predictionCutoffTime;
		if (!isInTimeRange) {
			console.log(`Filtering out prediction ${pred._id} - target time ${new Date(targetTime).toLocaleString()} is before cutoff ${new Date(predictionCutoffTime).toLocaleString()}`);
		}
		return isInTimeRange;
		});

		const proximityFilteredPredictions = applyProximityFilterForVisualization(timeRangeFilteredPredictions);

		console.log(`Proximity filtering: ${timeRangeFilteredPredictions.length} -> ${proximityFilteredPredictions.length} predictions`);

		proximityFilteredPredictions.forEach(pred => {
		let targetTime: number;
		if (pred.predictionTimes?.targetTime) {
			targetTime = new Date(pred.predictionTimes.targetTime).getTime();
		} else if (pred.predictionTime) {
			const horizonHours = pred.predictionHorizon ?? 6;
			targetTime = new Date(pred.predictionTime).getTime() + (horizonHours * 60 * 60 * 1000);
		} else {
			return;
		}

		const displayLabel = formatLocalTime(new Date(targetTime)) + ' (Prediksi Terdahulu)';

		predictionPoints.push({
			timestamp: targetTime,
			displayTime: displayLabel,
			type: 'prediction',
			PastPrediction: true,
			FuturePrediction: false,
			temperature: pred.predictions?.temperature ?? 0,
			oxygen: pred.predictions?.oxygen ?? 0,
			salinity: pred.predictions?.salinity ?? 0,
			acidity: pred.predictions?.acidity ?? 0,
			predictionId: pred._id,
			comparisonData: pred.comparison ?? undefined
		});
		});
	}

    predictionPoints.sort((a, b) => a.timestamp - b.timestamp);

    let filteredDataPoints: PointType[] = [];
    if (chartView === 'monitoring') {
      filteredDataPoints = [...monitoringDataPoints];
    } else if (chartView === 'predictions') {
      filteredDataPoints = [...predictionPoints];
    } else { // combined view
      filteredDataPoints = [...monitoringDataPoints, ...predictionPoints];
    }

    filteredDataPoints.sort((a, b) => a.timestamp - b.timestamp);

    console.log('Data points breakdown with timeRange filter:', {
      timeRange,
      monitoring: monitoringDataPoints.length,
      predictions: predictionPoints.length,
      pastPredictions: predictionPoints.filter(p => p.PastPrediction).length,
      futurePredictions: predictionPoints.filter(p => !p.PastPrediction && p.FuturePrediction).length,
      totalFiltered: filteredDataPoints.length,
      timeRangeMs: timeRangeFilter,
      cutoffTime: new Date(currentTime - timeRangeFilter).toLocaleString(),
      oldestTimestamp: filteredDataPoints.length > 0 ?
        new Date(Math.min(...filteredDataPoints.map(p => p.timestamp))).toLocaleString() : 'none',
      newestTimestamp: filteredDataPoints.length > 0 ?
        new Date(Math.max(...filteredDataPoints.map(p => p.timestamp))).toLocaleString() : 'none'
    });

    return {
      labels: filteredDataPoints.map(point => point.displayTime),
      timestamps: filteredDataPoints.map(point => point.timestamp),
      temperature: filteredDataPoints.map(point => point.temperature),
      oxygen: filteredDataPoints.map(point => point.oxygen),
      salinity: filteredDataPoints.map(point => point.salinity),
      pH: filteredDataPoints.map(point => point.acidity),
      pointTypes: filteredDataPoints,
      optimals: {
        temperature: PARAMETER_THRESHOLDS.temperature.optimal,
        oxygen: PARAMETER_THRESHOLDS.oxygen.optimal,
        salinity: PARAMETER_THRESHOLDS.salinity.optimal,
        pH: PARAMETER_THRESHOLDS.acidity.optimal,
      },
      acceptable: {
        temperature: PARAMETER_THRESHOLDS.temperature.acceptable,
        oxygen: PARAMETER_THRESHOLDS.oxygen.acceptable,
        salinity: PARAMETER_THRESHOLDS.salinity.acceptable,
        pH: PARAMETER_THRESHOLDS.acidity.acceptable,
      }
    };
  }, [
    chartView,
    formatLocalTime,
    timeRange,
    historicalMonitoring,
    predictionHorizon,
    predictionData,
    CompletePredictions,
	applyProximityFilterForVisualization,
  ]);

  /**
   * Fetch current prediction data from API
   */
  const fetchPrediction = useCallback(async () => {
    try {
      setLoading(true);
      const token = cookiesHandler.getCookie('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${ML_API_URL}/predict/${poolId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          horizon: predictionHorizon,
          preserve_variance: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail ?? `HTTP error! status: ${response.status}`);
      }

      const data: PredictionResponse = await response.json();
      setPredictionData(data);
      setLastUpdated(new Date());
      setError(null); // Clear any previous errors
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [poolId, predictionHorizon]);

  /**
   * Effect to load all required data on component mount
   * and when key dependencies change
   */
  useEffect(() => {
    if (poolId) {
      let isMounted = true;
      const loadData = async () => {
        try {
          setLoading(true);
          if (isMounted) {
            await Promise.all([
              fetchPrediction(),
              fetchMonitoring(),
              fetchHistoricalPredictions()
            ]);
          }
        } catch (error) {
          if (isMounted) {
            console.error("Error loading data:", error);
            setError("Failed to load data. Please try again.");
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadData();

      return () => {
        isMounted = false;
      };
    }
  }, [fetchPrediction, fetchMonitoring, fetchHistoricalPredictions, poolId, predictionHorizon]);

  /**
   * Handler for prediction horizon change
   */
  const handleHorizonChange = (newHorizon: string) => {
    setPredictionHorizon(parseInt(newHorizon));
  };

  /**
   * Generate status information for water quality parameters
   */
  const getParameterStatusInfo = useCallback((param: string, value: number) => {
    const thresholds = PARAMETER_THRESHOLDS[param as keyof typeof PARAMETER_THRESHOLDS];
    if (value >= thresholds.optimal[0] && value <= thresholds.optimal[1]) {
      return {
        status: 'optimal',
        color: '#52c41a',
        text: 'Optimal'
      };
    } else if (value >= thresholds.acceptable[0] && value <= thresholds.acceptable[1]) {
      return {
        status: 'acceptable',
        color: '#fa8c16',
        text: 'Dapat Diterima'
      };
    }
    return {
      status: 'out_of_range',
      color: '#f5222d',
      text: 'Di Luar Rentang'
    };
  }, []);

  /**
   * Format parameter values with change indicators
   */
  const formatValueWithChange = useCallback((current: number, predicted: number, unit: string) => {
    const change = predicted - current;
    const changeAbs = Math.abs(change);
    return (
      <div>
        <div>{predicted.toFixed(2)} {unit}</div>
        {change !== 0 && (
          <div style={{ color: change > 0 ? "green" : "red" }} className="mt-1">
            {change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {changeAbs.toFixed(2)} {unit}
          </div>
        )}
        {change === 0 && <div>Tidak ada perubahan</div>}
      </div>
    );
  }, []);

  /**
   * Get display unit based on parameter
   */
  const getParameterUnit = (paramName: string): string => {
    if (paramName === 'temperature') {
      return '°C';
    } else if (paramName === 'oxygen') {
      return 'mg/L';
    } else if (paramName === 'salinity') {
      return 'ppt';
    } else {
      return 'pH';
    }
  };

  /**
   * UPDATE: Render prediction chart dengan props baru untuk unified state management
   */
  const renderPredictionChart = useCallback(() => {
    const chartData = TimeSeriesData();
    if (!chartData) {
      return (
        <Alert
          message="Data tidak tersedia"
          description="Belum ada data untuk ditampilkan. Silakan periksa koneksi atau coba refresh."
          type="info"
          showIcon
        />
      );
    }

    const pastPredictionCount = chartData.pointTypes.filter(pt =>
      pt.type === 'prediction' && pt.PastPrediction).length;
    const futurePredictionCount = chartData.pointTypes.filter(pt =>
      pt.type === 'prediction' && pt.FuturePrediction).length;

    console.log(`Rendering chart with ${pastPredictionCount} past predictions and ${futurePredictionCount} future predictions in ${chartView} mode for ${timeRange} timeRange`);

    return (
      <ChartPrediction
        {...chartData}
        predictionHorizon={predictionHorizon}
        viewMode={chartView}
        fetchPrediction={fetchPrediction}
        fetchMonitoring={fetchMonitoring}
        fetchHistoricalPredictions={fetchHistoricalPredictions}
        lastUpdated={lastUpdated}
        timeRange={timeRange}
        chartView={chartView}
        onTimeRangeChange={handleTimeRangeChange}
        onChartViewChange={handleChartViewChange}
      />
    );
  }, [
    TimeSeriesData,
    chartView,
    timeRange,
    predictionHorizon,
    fetchPrediction,
    fetchMonitoring,
    fetchHistoricalPredictions,
    lastUpdated,
    handleTimeRangeChange,
    handleChartViewChange,
  ]);

  const parameterCards = useMemo(() => {
    if (!predictionData) return null;

    const currentValues = predictionData.currentValues || {};
    const predictions = predictionData.predictions || {};

    return (
      <Row gutter={[16, 16]}>
        {/* Current Values Card */}
        <Col span={12}>
          <Card title="Kondisi Saat Ini" size="small">
            {Object.entries(currentValues).map(([key, value]) => {
              const displayKey = key === 'acidity' ? 'pH' : key;
              const unit = PARAMETER_THRESHOLDS[key as keyof typeof PARAMETER_THRESHOLDS].unit;
              const statusInfo = getParameterStatusInfo(key, value);

              return (
                <div key={key} className="mb-2">
                  <div className="flex justify-between items-center">
                    <span>{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</span>
                    <Badge color={statusInfo.color} text={statusInfo.text} />
                  </div>
                  <div className="text-lg font-semibold">
                    {value.toFixed(2)} {unit}
                  </div>
                </div>
              );
            })}
          </Card>
        </Col>

        {/* Predicted Values Card */}
        <Col span={12}>
          <Card title={`Prediksi ${predictionHorizon} Jam`} size="small">
            {Object.entries(predictions).map(([key, value]) => {
              const displayKey = key === 'acidity' ? 'pH' : key;
              const unit = PARAMETER_THRESHOLDS[key as keyof typeof PARAMETER_THRESHOLDS].unit;
              const statusInfo = getParameterStatusInfo(key, value);
              const currentValue = currentValues[key as keyof WaterQualityData];

              return (
                <div key={key} className="mb-2">
                  <div className="flex justify-between items-center">
                    <span>{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</span>
                    <Badge color={statusInfo.color} text={statusInfo.text} />
                  </div>
                  <div className="text-lg font-semibold">
                    {formatValueWithChange(currentValue, value, unit)}
                  </div>
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>
    );
  }, [predictionData, predictionHorizon, getParameterStatusInfo, formatValueWithChange]);

  // Main component rendering
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Menganalisis kualitas air..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button
            size="small"
            onClick={() => fetchPrediction()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Coba Lagi
          </Button>
        }
      />
    );
  }

  if (!predictionData) {
    return <Alert message="Belum ada data prediksi tersedia." type="info" />;
  }

  const { classification, confidence, explanation } = predictionData;
  const qualityColor = QUALITY_COLORS[classification as keyof typeof QUALITY_COLORS] ?? '#1890ff';

  return (
    <div className="space-y-6">
      {/* Prediction Horizon Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span>Jangka Prediksi:</span>
          <Select value={predictionHorizon.toString()} onChange={handleHorizonChange} className="w-32">
            <Option value="6">6 Jam</Option>
            <Option value="12">12 Jam</Option>
            <Option value="24">24 Jam</Option>
          </Select>
          <Tooltip title="Refresh prediksi terbaru">
            <Button
              type="default"
              size="small"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => fetchPrediction()}
              className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            />
          </Tooltip>
        </div>
        <div className="text-sm text-gray-600">
          <InfoCircleOutlined className="mr-1" />
          Menampilkan prediksi untuk {predictionHorizon} jam ke depan
          {lastUpdated && (
            <div>Terakhir diperbarui: {lastUpdated.toLocaleString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta'
            })}</div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <div className="flex justify-between items-start">
          <div>
            <h2 style={{ color: qualityColor }} className="text-xl font-bold mb-2">
              {classification}
            </h2>
            <Progress
              percent={confidence * 100}
              status={confidence > 0.7 ? "success" : confidence > 0.4 ? "normal" : "exception"}
              className="mt-2"
            />
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Akurasi Prediksi</div>
            <div className="text-2xl font-bold">{(confidence * 100).toFixed(1)}%</div>
          </div>
        </div>
        <Divider />
        <div>
          <h4>Prediksi {predictionHorizon} Jam Kedepan</h4>
          <p className="text-gray-600 mb-4">
            {QUALITY_DESCRIPTIONS[classification as keyof typeof QUALITY_DESCRIPTIONS]}
          </p>
          <div>
            <span className="font-medium">Membutuhkan Penanganan:</span>
            <div className="mt-2">
              {Object.entries(explanation.parameters)
                .filter(([_, paramData]) => paramData.status !== 'optimal')
                .map(([key, paramData]) => {
                  const displayKey = key === 'acidity' ? 'pH' : key;
                  return (
                    <Tag key={key} color={STATUS_COLORS[paramData.status as keyof typeof STATUS_COLORS]} className="mb-1">
                      {displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}
                    </Tag>
                  );
                })}
              {Object.entries(explanation.parameters).every(([_, paramData]) => paramData.status === 'optimal') && (
                <Tag color="success">Semua Parameter Optimal</Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Parameter Comparison Grid */}
      {parameterCards}

      {/* Prediction Chart */}
      {renderPredictionChart()}

      {/* Detailed Parameter Analysis */}
      <Tabs defaultActiveKey="analysis">
        <TabPane tab="Analisis Detail" key="analysis">
          {Object.entries(predictionData.predictions).map(([key, value]) => {
            const displayKey = key === 'acidity' ? 'pH' : key;
            const unit = PARAMETER_THRESHOLDS[key as keyof typeof PARAMETER_THRESHOLDS].unit;
            const paramStatus = explanation.parameters[key].status;
            const optimalRange = explanation.parameters[key].optimal_range;
            const acceptableRange = explanation.parameters[key].acceptable_range;
            const currentValue = predictionData.currentValues[key as keyof WaterQualityData];

            const rangeMin = acceptableRange[0];
            const rangeMax = acceptableRange[1];

            const calculatePosition = (value: number, rangeMin: number, rangeMax: number) => {
              if (value < rangeMin) return 0;
              if (value > rangeMax) return 100;
              return ((value - rangeMin) / (rangeMax - rangeMin)) * 100;
            };

            const currentPos = calculatePosition(currentValue, rangeMin, rangeMax);
            const predictedPos = calculatePosition(value, rangeMin, rangeMax);
            const optimalLeftPos = calculatePosition(optimalRange[0], rangeMin, rangeMax);
            const optimalWidth = calculatePosition(optimalRange[1], rangeMin, rangeMax) - optimalLeftPos;

            const currentOutOfRange = currentValue < rangeMin || currentValue > rangeMax;
            const predictedOutOfRange = value < rangeMin || value > rangeMax;

            return (
              <Card key={key} className="mb-4">
                <h4>{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</h4>

                {/* Visualization content */}
                <div className="relative h-20 bg-gray-100 rounded mb-4 mt-4">
                  {/* Optimal range */}
                  <div
                    className="absolute h-full bg-green-200 border-2 border-green-400"
                    style={{
                      left: `${optimalLeftPos}%`,
                      width: `${optimalWidth}%`,
                      top: 0
                    }}
                  />

                  {/* Current value marker */}
                  <div
                    className="absolute w-2 h-full bg-blue-500 border-2 border-blue-700"
                    style={{ left: `${currentPos}%` }}
                  >
                    <div className="absolute -top-8 -left-4 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      {currentValue.toFixed(1)}
                    </div>
                  </div>

                  {/* Predicted value marker */}
                  <div
                    className="absolute w-2 h-full bg-red-500 border-2 border-red-700"
                    style={{ left: `${predictedPos}%` }}
                  >
                    <div className="absolute -top-8 -left-4 text-xs bg-red-500 text-white px-2 py-1 rounded">
                      {value.toFixed(1)}
                    </div>
                  </div>

                  {/* Range labels */}
                  <div className="absolute -bottom-6 left-0 text-xs text-gray-600">
                    {rangeMin} {unit}
                  </div>
                  <div className="absolute -bottom-6 right-0 text-xs text-gray-600">
                    {rangeMax} {unit}
                  </div>
                </div>

                {/* Parameter explanation */}
                <div className="mt-6">
                  <strong>Analisis Parameter:</strong>
                  <p className="text-gray-700 mt-1">
                    {explanation.parameters[key].explanation}
                  </p>
                </div>

                {/* Parameter recommendation*/}
                {paramStatus !== 'optimal' && (
                  <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
                    <strong>Rekomendasi:</strong>
                    <p className="text-yellow-800 mt-1">
                      {explanation.parameters[key]?.recommendation ??
                        `Jaga nilai ${displayKey} dalam rentang optimal (${optimalRange[0]}-${optimalRange[1]} ${unit}).`}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DashboardPrediction;
