import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Spin, Alert, Badge, Progress, Tabs, Tooltip, Statistic, Row, Col, Divider, Tag, Button, Select } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import cookiesHandler from '@/utils/storage/cookies';
import RecordChart from '@/components/RecordChart/CardPrediction';
import ChartLegend from '@/components/RecordChart/ChartLegend';

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
  DashboardPredictionProps,
  ChartViewMode,
  TimeRange,
  DataPoint,
} from '@/interfaces/prediction';

const { TabPane } = Tabs;
const { Option } = Select;

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
        // FIXED: Used nullish coalescing
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
          // FIXED: Used nullish coalescing
          prevPredTime = new Date(prevPredItem.predictionTime ?? Date.now()).getTime() +
            ((prevPredItem.predictionHorizon ?? 6) * 60 * 60 * 1000);
        }

        if (prediction.predictionTimes?.targetTime) {
          currPredTime = new Date(prediction.predictionTimes.targetTime).getTime();
        } else {
          // FIXED: Used nullish coalescing
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
        // FIXED: Proper error handling
        console.error("Error in time proximity filtering:", error);
        // Still add the prediction despite the error to avoid data loss
        filtered.push(prediction);
      }
    });

    console.log(`Filtering results: ${filtered.length}/${sorted.length} predictions kept`);
    console.log(`Prediction types: ${pastPredictions} past (${pastPredictionsWithComparison} with comparison data), ${futurePredictions} future`);

    return filtered;
  }, []);

  /**
   * Identification of past predictions
   */
  const CompletedPredictions = useCallback((
    predictions: PredictionRecord[],
    monitoringData: MonitoringRecord[]
  ): CompletePredictionRecord[] => {
    if (!predictions.length || !monitoringData.length) {
      console.log(`Missing data for prediction enhancement: ${predictions.length} predictions, ${monitoringData.length} monitoring records`);
      return [];
    }

    console.log(`Processing ${predictions.length} predictions against ${monitoringData.length} monitoring records`);

    const currentTime = new Date().getTime();
    const completePredictions: CompletePredictionRecord[] = [];

    console.log("Current time reference:", new Date(currentTime).toISOString());

    predictions.forEach(prediction => {
      try {
        let targetTimestamp: number;
        if (prediction.predictionTimes?.targetTime) {
          targetTimestamp = new Date(prediction.predictionTimes.targetTime).getTime();
        } else if (prediction.predictionTime) {
          // FIXED: Used nullish coalescing
          const horizonHours = prediction.predictionHorizon ?? 6;
          targetTimestamp = new Date(prediction.predictionTime).getTime() + (horizonHours * 60 * 60 * 1000);
        } else {
          console.warn(`Prediction ${prediction._id} has no valid time reference`);
          return;
        }

        console.log(`Prediction ${prediction._id} target time:`, new Date(targetTimestamp).toISOString(),
                   `(${targetTimestamp < currentTime ? 'PAST' : 'FUTURE'})`);

        const isPast = targetTimestamp < currentTime;

        if (isPast) {
          completePredictions.push({
            ...prediction,
            completed: true,
            comparison: null
          });
        } else {
          // Future prediction
          completePredictions.push({
            ...prediction,
            completed: false,
            comparison: null
          });
        }
      } catch (error) {
        // FIXED: Added proper error message and logging
        console.error(`Error processing prediction ${prediction._id}:`, error);
        // Still add the prediction with minimal data to maintain continuity
        completePredictions.push({
          ...prediction,
          completed: false,
          comparison: null
        });
      }
    });

    return filterTimeProximity(completePredictions);
  }, [filterTimeProximity]);

  /**
   * Fetch historical monitoring data based on selected time range
   */
  const fetchHistoricalMonitoring = useCallback(async () => {
    try {
      const token = cookiesHandler.getCookie('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get monitoring records from last X hours based on timeRange
      const hoursToFetch = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 72;

      const response = await fetch(`http://103.24.56.162:5154/api/v1/monitors/${poolId}?hours=${hoursToFetch}`, {
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
      // Surface the error to the user interface for better UX
      setError(`Failed to fetch monitoring data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [poolId, timeRange]); // timeRange is necessary here as it affects the API call

  /**
   * Fetch historical predictions with increased limit
   */
  const fetchHistoricalPredictions = useCallback(async () => {
    try {
      const token = cookiesHandler.getCookie('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log(`Fetching historical predictions for pool ${poolId}`);

      const response = await fetch(
        `http://103.24.56.162:5154/api/v1/predictions/${poolId}?limit=50`,
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

      const enhanced = CompletedPredictions(historicalPredictions, historicalMonitoring);
      setCompletePredictions(enhanced);

      console.log('Enhanced predictions:', {
        total: enhanced.length,
        completed: enhanced.filter(p => p.completed).length,
        withComparison: enhanced.filter(p => p.comparison !== null).length,
        future: enhanced.filter(p => !p.completed).length
      });
    } else {
      console.log(`Missing data for prediction enhancement: ${historicalPredictions.length} predictions, ${historicalMonitoring.length} monitoring records`);
    }
  }, [historicalPredictions, historicalMonitoring, CompletedPredictions]);

  /**
   * Get past prediction status text
   */
  const getPastPredictionStatus = (accuracyError: number): string => {
    if (accuracyError < 10) {
      return 'Tinggi';
    } else if (accuracyError < 25) {
      return 'Sedang';
    } else {
      return 'Rendah';
    }
  };

/**
 * Generate time series data with past prediction identification
 */
const TimeSeriesData = useCallback(() => {
  if (!predictionData || historicalMonitoring.length === 0) {
    console.log("Missing required data for chart visualization");
    return null;
  }

  const monitoringDataPoints: DataPoint[] = [];
  const predictionPoints: DataPoint[] = [];
  const currentTime = new Date().getTime();

  // Time range filtering configuration
  const timeRangeFilter = {
    '24h': 24 * 60 * 60 * 1000,
    '72h': 72 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  }[timeRange];

  // Process monitoring data
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
      isPastPrediction: false,
      temperature: record.temperature,
      oxygen: record.oxygen,
      salinity: record.salinity,
      acidity: record.acidity,
    });
  });

  // Process current prediction (future)
  if ((chartView === 'combined' || chartView === 'predictions') && predictionData) {
    const baseTime = new Date(predictionData.timestamp).getTime();

    // Add extra time padding for short predictions (ensuring 6-hour predictions are visible)
    // For 6-hour prediction horizon, add 20% extra time buffer
    const timePadding = predictionHorizon <= 6 ? (predictionHorizon * 60 * 60 * 1000) * 0.2 : 0;
    const predictionTimestamp = baseTime + (predictionHorizon * 60 * 60 * 1000) + timePadding;

    const lastMonitoringPoint = monitoringDataPoints.length > 0 ?
      monitoringDataPoints[monitoringDataPoints.length - 1] : null;

    if (lastMonitoringPoint && chartView === 'combined') {
      predictionPoints.push({
        timestamp: lastMonitoringPoint.timestamp,
        displayTime: lastMonitoringPoint.displayTime + ' (Terakhir)',
        type: 'prediction',
        isPastPrediction: false,
        isFuture: true,
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
      isPastPrediction: false,
      isFuture: true,
      temperature: predictionData.predictions.temperature,
      oxygen: predictionData.predictions.oxygen,
      salinity: predictionData.predictions.salinity,
      acidity: predictionData.predictions.acidity,
      predictionId: predictionData.predictionId ?? `current-${predictionTimestamp}`
    });
  }

  if ((chartView === 'predictions' || chartView === 'combined') && CompletePredictions.length > 0) {
    console.log(`Processing ${CompletePredictions.length} enhanced predictions for visualization`);

    // Process completed predictions
    CompletePredictions.filter(pred => pred.completed).forEach(pred => {
      let targetTime: number;

      if (pred.predictionTimes?.targetTime) {
        targetTime = new Date(pred.predictionTimes.targetTime).getTime();
      } else if (pred.predictionTime) {
        const horizonHours = pred.predictionHorizon ?? 6;
        targetTime = new Date(pred.predictionTime).getTime() + (horizonHours * 60 * 60 * 1000);
      } else {
        console.warn(`Prediction ${pred._id} has no valid time reference`);
        return;
      }

      const displayLabel = formatLocalTime(new Date(targetTime)) + ' (Prediksi Terdahulu)';

      // Add the historical prediction point
      predictionPoints.push({
        timestamp: targetTime,
        displayTime: displayLabel,
        type: 'prediction',
        isPastPrediction: true,
        isFuture: false,
        temperature: pred.predictions?.temperature ?? 0,
        oxygen: pred.predictions?.oxygen ?? 0,
        salinity: pred.predictions?.salinity ?? 0,
        acidity: pred.predictions?.acidity ?? 0,
        predictionId: pred._id
      });
    });
  }

  predictionPoints.sort((a, b) => a.timestamp - b.timestamp);

  let filteredDataPoints: DataPoint[] = [];

  if (chartView === 'monitoring') {
    filteredDataPoints = [...monitoringDataPoints];
  } else if (chartView === 'predictions') {
    filteredDataPoints = [...predictionPoints];
  } else { // combined view
    filteredDataPoints = [...monitoringDataPoints, ...predictionPoints];
  }

  filteredDataPoints.sort((a, b) => a.timestamp - b.timestamp);

  console.log('Data points breakdown:', {
    monitoring: monitoringDataPoints.length,
    predictions: predictionPoints.length,
    pastPredictions: predictionPoints.filter(p => p.isPastPrediction).length,
    futurePredictions: predictionPoints.filter(p => !p.isPastPrediction && p.isFuture).length,
    totalFiltered: filteredDataPoints.length,
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
    pointTypes: filteredDataPoints.map(point => ({
      type: point.type,
      isPastPrediction: Boolean(point.isPastPrediction),
      isFuture: Boolean(point.isFuture),
      predictionId: point.predictionId ?? undefined,
    })),
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

      const response = await fetch(`http://103.24.56.162:5154/api/v1/predict/${poolId}`, {
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
              fetchHistoricalMonitoring(),
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

      // Set up polling for real-time updates (every 5 minutes)
      const intervalId = setInterval(() => {
        fetchPrediction();
        fetchHistoricalMonitoring();
        fetchHistoricalPredictions();
      }, 5 * 60 * 1000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }
  }, [fetchPrediction, fetchHistoricalMonitoring, fetchHistoricalPredictions, poolId, predictionHorizon, timeRange]);

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
        <span className="text-2xl">{predicted.toFixed(2)} {unit}</span>
        <div className="mt-1">
          {change !== 0 && (
            <Tag color={change > 0 ? "green" : "red"} className="mt-1">
              {change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {changeAbs.toFixed(2)} {unit}
            </Tag>
          )}
          {change === 0 && <Tag color="blue">Tidak ada perubahan</Tag>}
        </div>
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
   * Render prediction chart
   */
  const renderPredictionChart = useCallback(() => {
    const chartData = TimeSeriesData();

    if (!chartData) {
      return (
        <div className="flex flex-col justify-center items-center h-48">
          <Alert
            message="Data tidak tersedia"
            description="Tidak ada data historis yang tersedia untuk menampilkan grafik."
            type="info"
            showIcon
          />
        </div>
      );
    }

    const pastPredictionCount = chartData.pointTypes.filter(pt =>
      pt.type === 'prediction' && pt.isPastPrediction).length;
    const futurePredictionCount = chartData.pointTypes.filter(pt =>
      pt.type === 'prediction' && pt.isFuture).length;

    console.log(`Rendering chart with ${pastPredictionCount} past predictions and ${futurePredictionCount} future predictions in ${chartView} mode`);

    return (
      <Card
        title={`Tren Parameter Kualitas Air`}
        className="mb-4 shadow-sm"
        variant="borderless"
        extra={
          <div className="flex items-center space-x-4">
            <Select
              value={timeRange}
              onChange={(value: TimeRange) => setTimeRange(value)}
              className="w-32"
            >
              <Option value="24h">24 Jam</Option>
              <Option value="72h">3 Hari</Option>
              <Option value="7d">7 Hari</Option>
            </Select>

            <Select
              value={chartView}
              onChange={(value: ChartViewMode) => setChartView(value)}
              className="w-40"
            >
              <Option value="combined">Monitoring & Prediksi</Option>
              <Option value="monitoring">Data Monitoring</Option>
              <Option value="predictions">Histori Prediksi</Option>
            </Select>

            <Tooltip title="Refresh Data">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchPrediction();
                  fetchHistoricalMonitoring();
                  fetchHistoricalPredictions();
                }}
              />
            </Tooltip>
          </div>
        }
      >
        <RecordChart
          labels={chartData.labels}
          timestamps={chartData.timestamps}
          temp={chartData.temperature}
          oxygen={chartData.oxygen}
          salinity={chartData.salinity}
          pH={chartData.pH}
          optimals={chartData.optimals}
          acceptable={chartData.acceptable}
          predictionHorizon={predictionHorizon}
          viewMode={chartView}
          pointTypes={chartData.pointTypes}
        />

        <ChartLegend
          parameters={PARAMETER_THRESHOLDS}
          predictionHorizon={predictionHorizon}
          chartView={chartView}
          lastUpdated={lastUpdated}
        />
      </Card>
    );
  }, [
    TimeSeriesData,
    chartView,
    timeRange,
    predictionHorizon,
    fetchPrediction,
    fetchHistoricalMonitoring,
    fetchHistoricalPredictions,
    lastUpdated
  ]);

  const parameterCards = useMemo(() => {
    if (!predictionData) return null;

    const currentValues = predictionData.currentValues || {};
    const predictions = predictionData.predictions || {};

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Current Values Card */}
        <Card title="Parameter Kualitas Air Saat Ini" variant="borderless" className="shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(currentValues).map(([key, value]) => {
              const displayKey = key === 'acidity' ? 'pH' : key;
              const unit = PARAMETER_THRESHOLDS[key as keyof typeof PARAMETER_THRESHOLDS].unit;
              const statusInfo = getParameterStatusInfo(key, value);

              return (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold">{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</div>
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  </div>
                  <div className="text-2xl mt-2">{value.toFixed(2)} {unit}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Predicted Values Card */}
        <Card
          title={`Parameter Kualitas Air ${predictionHorizon} Jam Kedepan`}
          variant="borderless"
          className="shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(predictions).map(([key, value]) => {
              const displayKey = key === 'acidity' ? 'pH' : key;
              const unit = PARAMETER_THRESHOLDS[key as keyof typeof PARAMETER_THRESHOLDS].unit;
              const statusInfo = getParameterStatusInfo(key, value);
              const currentValue = currentValues[key as keyof WaterQualityData];

              return (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold">{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</div>
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  </div>
                  {formatValueWithChange(currentValue, value, unit)}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }, [predictionData, predictionHorizon, getParameterStatusInfo, formatValueWithChange]);

  // Main component rendering
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Spin size="large" />
        <div className="mt-4 text-gray-500">Menganalisis kualitas air...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Prediction Data"
        description={error}
        type="error"
        showIcon
        className="mb-4"
        action={
          <button
            onClick={() => fetchPrediction()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Coba Lagi
          </button>
        }
      />
    );
  }

  if (!predictionData) {
    return <Alert message="No prediction data available" type="warning" showIcon />;
  }

  const { classification, confidence, explanation } = predictionData;
  const qualityColor = QUALITY_COLORS[classification as keyof typeof QUALITY_COLORS] ?? '#1890ff';

  return (
    <div className="mt-8 w-full">
      {/* Prediction Horizon Selector */}
      <Card className="mb-4 shadow-sm" variant="borderless">
        <div className="flex justify-between items-center mb-4">
          <Tabs
            activeKey={predictionHorizon.toString()}
            onChange={handleHorizonChange}
            items={[
              { key: '6', label: '6 Jam' },
              { key: '12', label: '12 Jam' },
              { key: '24', label: '24 Jam' }
            ]}
          />

          <Tooltip title="Refresh Data">
            <button
              onClick={() => fetchPrediction()}
              className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ReloadOutlined style={{ fontSize: '18px' }} />
            </button>
          </Tooltip>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>Menampilkan prediksi untuk {predictionHorizon} jam ke depan</div>
          {lastUpdated && <div>Terakhir diperbarui: {lastUpdated.toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta'
          })}</div>}
        </div>
      </Card>

      {/* Summary Card */}
      <Card
        className="mb-4 shadow-md border-t-4"
        style={{ borderTopColor: qualityColor }}
        variant="borderless"
      >
        <Row gutter={16} align="middle">
          <Col xs={24} md={6}>
            <Statistic
              title="Status Kualitas Air"
              value={classification}
              valueStyle={{ color: qualityColor, fontWeight: 'bold' }}
            />
            <Progress
              percent={Math.round(confidence * 100)}
              size="small"
              status={confidence > 0.7 ? "success" : confidence > 0.4 ? "normal" : "exception"}
              className="mt-2"
            />
          </Col>

          <Col xs={24} md={18}>
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="font-medium mb-2">
                Prediksi {predictionHorizon} Jam Kedepan
                <Tooltip title="Hasil prediksi akan menunjukkan kondisi beberapa parameter kualitas air tambak.">
                  <InfoCircleOutlined className="ml-1 text-gray-400" />
                </Tooltip>
              </div>
              <div>{QUALITY_DESCRIPTIONS[classification as keyof typeof QUALITY_DESCRIPTIONS]}</div>

              <Divider className="my-3" />

              <div className="text-sm">
                <strong>Membutuhkan Penanganan:</strong>
                {Object.entries(explanation.parameters)
                  .filter(([_, paramData]) => paramData.status !== 'optimal')
                  .map(([key, paramData]) => {
                    const displayKey = key === 'acidity' ? 'pH' : key;
                    return (
                      <Tag
                        key={key}
                        color={paramData.status === 'acceptable' ? 'orange' : 'red'}
                        className="ml-1"
                      >
                        {displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}
                      </Tag>
                    );
                  })}
                {Object.entries(explanation.parameters).every(([_, paramData]) => paramData.status === 'optimal') && (
                  <Tag color="green" className="ml-1">Semua Parameter Optimal</Tag>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Parameter Comparison Grid */}
      {parameterCards}

      {/* Prediction Chart */}
      {renderPredictionChart()}

      {/* Detailed Parameter Analysis */}
      <Card
        title="Analisis Detail Parameter"
        className="mb-4 shadow-sm"
        variant="borderless"
        extra={
          <Badge
            color={qualityColor}
            text={classification}
          />
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div key={key} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-lg font-semibold">{displayKey.charAt(0).toUpperCase() + displayKey.slice(1)}</div>
                  <Badge
                    color={STATUS_COLORS[paramStatus]}
                    text={
                      // FIXED: Extracted nested ternary
                      paramStatus === 'optimal' ? 'Optimal' :
                      paramStatus === 'acceptable' ? 'Dapat Diterima' :
                                                    'Di Luar Rentang'
                    }
                  />
                </div>

                {/* Visualization content */}
                <div className="mb-4">
                  <div className="relative h-10 bg-gray-200 rounded">
                    {/* Optimal range */}
                    <div
                      className="absolute h-full bg-green-100 rounded"
                      style={{
                        left: `${optimalLeftPos}%`,
                        width: `${optimalWidth}%`
                      }}
                    />

                    {/* Current value marker */}
                    <div
                      className={`absolute top-0 transform -translate-x-1/2 z-10 ${currentOutOfRange ? 'opacity-50' : ''}`}
                      style={{ left: `${currentPos}%` }}
                    >
                      <div className="w-px h-10 bg-blue-500"></div>
                      <div className="w-4 h-4 bg-blue-500 rounded-full -mt-2 ml-[-7px]"></div>
                      <div className="text-xs mt-1 ml-[-10px] font-medium">
                        {currentValue.toFixed(1)}
                      </div>
                    </div>

                    {/* Predicted value marker */}
                    <div
                      className={`absolute top-0 transform -translate-x-1/2 z-20 ${predictedOutOfRange ? 'opacity-50' : ''}`}
                      style={{ left: `${predictedPos}%` }}
                    >
                      <div className="w-px h-10 bg-red-500"></div>
                      <div className="w-4 h-4 bg-red-500 rounded-full -mt-2 ml-[-7px]"></div>
                      <div className="text-xs mt-1 font-medium text-red-500 ml-[-10px]">
                        {value.toFixed(1)}
                      </div>
                    </div>

                    {/* Range labels */}
                    <div className="absolute -bottom-6 left-0 text-xs font-medium">
                      {rangeMin} {unit}
                    </div>
                    <div className="absolute -bottom-6 right-0 text-xs font-medium">
                      {rangeMax} {unit}
                    </div>
                  </div>
                </div>

                {/* Parameter explanation */}
                <div className="mt-6 text-sm">
                  <div className="font-medium mb-1">Analisis Parameter:</div>
                  <div className="p-2 rounded bg-gray-50">
                    {explanation.parameters[key].explanation}
                  </div>
                </div>

                {/* Parameter recommendation*/}
                {paramStatus !== 'optimal' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="font-medium text-yellow-700 mb-1">Rekomendasi:</div>
                    <div className="text-yellow-800">
                      {explanation.parameters[key]?.recommendation ??
                      `Jaga nilai ${displayKey} dalam rentang optimal (${optimalRange[0]}-${optimalRange[1]} ${unit}).`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default DashboardPrediction;
