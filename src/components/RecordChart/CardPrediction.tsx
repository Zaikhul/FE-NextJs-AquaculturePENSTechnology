import React, { useRef, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartOptions,
  ChartDataset,
  ScriptableContext,
  PointStyle,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Select, Tooltip as AntTooltip } from 'antd';
import {
  RecordChartProps as BaseRecordChartProps,
  ColorScheme,
  ParameterColors,
  PredictionComparison
} from '@/interfaces/prediction';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  annotationPlugin
);

const { Option } = Select;

/**
 * Enhanced point type to include additional metadata for predictions
 */
export interface PointType {
  type: 'monitoring' | 'prediction';
  isPastPrediction: boolean;
  isFuture?: boolean;
  predictionId?: string;
  comparisonData?: PredictionComparison;
}

/**
 * Data point structure for chart datasets
 */
export interface DataPoint {
  x: number; // timestamp
  y: number; // value
  isFuture?: boolean;
  isPastPrediction?: boolean;
  predictionId?: string;
  comparisonData?: PredictionComparison;
}

/**
 * Extended props to support enhanced prediction visualization
 */
interface RecordChartProps extends Omit<BaseRecordChartProps, 'pointTypes'> {
  pointTypes?: PointType[] | null;
}

/**
 * Custom dataset extension for Chart.js with enhanced metadata
 */
interface CustomDataset extends ChartDataset<'line', DataPoint[]> {
  labels?: string[];
  dataType?: 'monitoring' | 'unifiedPrediction';
  showInLegendOnce?: boolean;
  predictionId?: string;
}

/**
 * Helper function to add transparency to colors
 */
const colorWithOpacity = (color: string, opacity: number): string => {
  // Handle rgba format
  if (color.startsWith('rgba')) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${opacity})`);
  }
  // Handle rgb format
  else if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `,${opacity})`);
  }
  // Handle hex format - simplified version
  else {
    const [r, g, b] = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
    return `rgba(${r},${g},${b},${opacity})`;
  }
};

// Plugin to shade future prediction area with improved type safety and null handling
const timelineShadingPlugin = {
  id: 'timelineShading',
  beforeDraw: (chart: ChartJS) => {
    if (!chart?.ctx || !chart?.chartArea || !chart?.scales?.['x'] || !chart?.data?.datasets?.[0]) return;

    const { ctx, chartArea, scales } = chart;

    const datasets = chart.data.datasets;
    const monitoringDataset = datasets.find((d: any) => d.dataType === 'monitoring');
    const predictionDataset = datasets.find((d: any) => d.dataType === 'unifiedPrediction');

    if (!monitoringDataset?.data?.length || !predictionDataset) return;

    const lastMonitoringPoint = monitoringDataset.data[monitoringDataset.data.length - 1];

    // Proper type checking to handle all Chart.js data point formats
    if (!lastMonitoringPoint) return;

    // Check if it's a Point object with x property
    let pointX = null;
    if (typeof lastMonitoringPoint === 'object' && 'x' in lastMonitoringPoint) {
      pointX = lastMonitoringPoint.x;
    } else if (typeof lastMonitoringPoint === 'number') {
      pointX = lastMonitoringPoint;
    } else if (Array.isArray(lastMonitoringPoint) && lastMonitoringPoint.length > 0) {
      pointX = lastMonitoringPoint[0];
    }

    if (pointX === null) return;

    const transitionX = scales.x.getPixelForValue(pointX);

    ctx.fillStyle = 'rgba(230, 236, 255, 0.3)';
    ctx.fillRect(
      transitionX,
      chartArea.top,
      chartArea.right - transitionX,
      chartArea.bottom - chartArea.top
    );

    // Add a vertical line at the transition point
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(transitionX, chartArea.top);
    ctx.lineTo(transitionX, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Add "Sekarang" label
    ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sekarang', transitionX, chartArea.top - 5);
  }
};

// Register the custom plugins
ChartJS.register(timelineShadingPlugin);

/**
 * Enhanced Record Chart component with improved past prediction identification
 */
const RecordChart: React.FC<RecordChartProps> = ({
  labels,
  temp,
  oxygen,
  salinity,
  pH,
  optimals,
  acceptable,
  predictionHorizon,
  viewMode = 'combined',
  pointTypes,
  timestamps
}) => {
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const [activeParameter, setActiveParameter] = useState<'all' | 'temperature' | 'oxygen' | 'salinity' | 'pH'>('all');

  useEffect(() => {
    const chartInstance = chartRef.current;
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);

  // Define colors for chart lines and areas
  const colors: ColorScheme = {
    temperature: {
      line: 'rgb(255, 99, 132)',
      fill: 'rgba(255, 99, 132, 0.2)',
      point: 'rgb(255, 99, 132)',
      prediction: 'rgb(255, 0, 0)',
      optimal: 'rgba(75, 192, 192, 0.2)',
    },
    oxygen: {
      line: 'rgb(54, 162, 235)',
      fill: 'rgba(54, 162, 235, 0.2)',
      point: 'rgb(54, 162, 235)',
      prediction: 'rgb(0, 0, 255)',
      optimal: 'rgba(75, 192, 192, 0.2)',
    },
    salinity: {
      line: 'rgb(255, 159, 64)',
      fill: 'rgba(255, 159, 64, 0.2)',
      point: 'rgb(255, 159, 64)',
      prediction: 'rgb(255, 100, 0)',
      optimal: 'rgba(75, 192, 192, 0.2)',
    },
    pH: {
      line: 'rgb(75, 192, 192)',
      fill: 'rgba(75, 192, 192, 0.2)',
      point: 'rgb(75, 192, 192)',
      prediction: 'rgb(0, 128, 128)',
      optimal: 'rgba(75, 192, 192, 0.2)',
    }
  };

  /**
   * Helper function to determine point style based on data type
   * Fixed: Returns valid PointStyle type
   */
  const getPointStyle = (dataPoint: DataPoint): PointStyle => {
    if (dataPoint.isFuture) {
      return 'circle';
    } else if (dataPoint.isPastPrediction) {
      return 'rect';
    } else {
      return 'circle';
    }
  };

  /**
   * Get unit for parameter
   */
  const getUnitForParam = (paramName: string): string => {
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
   * Data separation - Reduced complexity
   */
  const splitData = React.useCallback((
    allLabels: string[],
    allValues: number[],
    allTimestamps: number[] = [],
    allTypes?: PointType[] | null
  ) => {
    const monitoringLabels: string[] = [];
    const monitoringValues: number[] = [];
    const monitoringTimestamps: number[] = [];

    const PredictionValues: number[] = [];
    const unifiedPredictionTimestamps: number[] = [];
    const unifiedPredictionMeta: Array<{
      isFuture: boolean,
      isPastPrediction: boolean,
      predictionId?: string,
      comparisonData?: PredictionComparison
    }> = [];

    // Create data points array with all necessary properties
    const dataPoints = allLabels
      .map((label, index) => {
        if (allValues[index] === null || allValues[index] === undefined) {
          return null;
        }

        return {
          label,
          value: allValues[index],
          timestamp: allTimestamps[index] ?? index,
          type: allTypes?.[index]?.type ?? 'monitoring',
          isPastPrediction: Boolean(allTypes?.[index]?.isPastPrediction),
          isFuture: Boolean(allTypes?.[index]?.isFuture),
          predictionId: allTypes?.[index]?.predictionId,
          comparisonData: allTypes?.[index]?.comparisonData
        };
      })
      .filter(Boolean);

    // Sort data points by timestamp
    dataPoints.sort((a, b) => (a?.timestamp ?? 0) - (b?.timestamp ?? 0));

    // Process and categorize data points
    dataPoints.forEach(point => {
      if (!point) return; // Safety check

      if (point.type === 'monitoring') {
        monitoringLabels.push(point.label);
        monitoringValues.push(point.value);
        monitoringTimestamps.push(point.timestamp);
      } else if (point.type === 'prediction') {
        // Store prediction value and metadata
        PredictionValues.push(point.value);
        unifiedPredictionTimestamps.push(point.timestamp);

        unifiedPredictionMeta.push({
          isFuture: Boolean(point.isFuture),
          isPastPrediction: Boolean(point.isPastPrediction),
          predictionId: point.predictionId,
          comparisonData: point.comparisonData
        });
      }
    });

    return {
      monitoringLabels,
      monitoringValues,
      monitoringTimestamps,
      unifiedPredictionLabels: [], // Empty array for unused variable
      PredictionValues,
      unifiedPredictionTimestamps,
      unifiedPredictionMeta
    };
  }, []);

  /**
   * Create monitoring dataset
   */
  const createMonitoringDataset = (
    monitoringValues: number[],
    monitoringTimestamps: number[],
    monitoringLabels: string[],
    displayName: string,
    paramColors: ParameterColors
  ): CustomDataset | null => {
    if (monitoringValues.length === 0) return null;

    // Convert to proper x,y format for timeline display
    const monitoringPoints = monitoringValues.map((value, i) => ({
      x: monitoringTimestamps[i],
      y: value,
      timestamp: monitoringTimestamps[i]
    }));

    return {
      label: `${displayName} (Monitoring)`,
      data: monitoringPoints,
      labels: monitoringLabels,
      borderColor: paramColors.line,
      backgroundColor: paramColors.point,
      borderWidth: 2,
      pointRadius: 4,
      tension: 0.2,
      fill: false,
      dataType: 'monitoring'
    };
  };

  /**
   * Create prediction dataset
   */
  const createPredictionDataset = (
    PredictionValues: number[],
    unifiedPredictionTimestamps: number[],
    unifiedPredictionMeta: any[],
    displayName: string,
    paramColors: ParameterColors
  ): { dataset: CustomDataset | null, points: DataPoint[] } => {
    if (PredictionValues.length === 0) {
      return { dataset: null, points: [] };
    }

    const PredictionPoints = PredictionValues.map((value, idx) => {
      const meta = unifiedPredictionMeta[idx] ?? {};
      return {
        x: unifiedPredictionTimestamps[idx],
        y: value,
        isFuture: Boolean(meta.isFuture),
        isPastPrediction: Boolean(meta.isPastPrediction),
        predictionId: meta.predictionId,
        comparisonData: meta.comparisonData
      };
    });

    // Sort by timestamp for proper rendering
    PredictionPoints.sort((a, b) => a.x - b.x);

    const dataset: CustomDataset = {
      label: `${displayName} (Hasil Prediksi)`,
      data: PredictionPoints,
      borderColor: (ctx: ScriptableContext<'line'>) => {
        if (!ctx || typeof ctx.dataIndex !== 'number') return paramColors.prediction;
        const dataIndex = ctx.dataIndex;
        if (dataIndex >= PredictionPoints.length) return paramColors.prediction;

        const point = PredictionPoints[dataIndex];
        return point.isFuture ? paramColors.prediction : '#8b5cf6';
      },
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        if (!ctx || typeof ctx.dataIndex !== 'number') return paramColors.prediction;
        const dataIndex = ctx.dataIndex;
        if (dataIndex >= PredictionPoints.length) return paramColors.prediction;

        const point = PredictionPoints[dataIndex];
        return point.isFuture ? paramColors.prediction : '#8b5cf6';
      },
      borderWidth: 3,
      pointRadius: 5,
      // Fixed: Use pointStyle function that returns valid PointStyle
      pointStyle: (ctx: ScriptableContext<'line'>) => {
        if (!ctx || typeof ctx.dataIndex !== 'number') return 'circle';
        const dataIndex = ctx.dataIndex;
        if (dataIndex >= PredictionPoints.length) return 'circle';

        return getPointStyle(PredictionPoints[dataIndex]);
      },
      tension: 0.2,
      borderDash: (ctx: ScriptableContext<'line'>) => {
        if (!ctx || typeof ctx.dataIndex !== 'number') return [4, 4];
        const dataIndex = ctx.dataIndex;
        if (dataIndex >= PredictionPoints.length) return [4, 4];

        return PredictionPoints[dataIndex].isFuture ? [4, 4] : [2, 2];
      },
      dataType: 'unifiedPrediction'
    };

    return { dataset, points: PredictionPoints };
  };

  /**
   * Create tooltip callbacks
   */
  const createTooltipCallbacks = (
    datasets: CustomDataset[],
    displayName: string,
    paramName: string,
    predictionHorizon: number
  ) => {
    return {
      title: function(tooltipItems: any[]) {
        if (!tooltipItems?.length) return '';

        const item = tooltipItems[0];
        if (!item) return '';

        const datasetIndex = item.datasetIndex ?? 0;
        const dataIndex = item.dataIndex ?? 0;

        if (datasetIndex >= datasets.length) return '';
        const dataset = datasets[datasetIndex];
        if (!dataset) return '';

        // Format timestamp for tooltip
        const timestamp = item.parsed?.x;
        if (timestamp) {
          const date = new Date(timestamp);
          const formattedDate = date.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          if (dataset.dataType === 'unifiedPrediction') {
            // Fixed: Proper type checking for dataPoint
            if (!dataset.data?.[dataIndex]) return formattedDate;

            const dataPoint = dataset.data[dataIndex] as DataPoint;

            if (dataPoint.isFuture) {
              return `${formattedDate} (Prediksi ${predictionHorizon} jam)`;
            } else if (dataPoint.isPastPrediction) {
              return `${formattedDate} (Prediksi Terdahulu)`;
            }
          }
          return formattedDate;
        }

        return dataset.labels?.[dataIndex] ?? dataset.label ?? '';
      },
      label: function(context: any) {
        if (!context?.parsed?.y === undefined || !context?.dataset?.data) return '';

        const dataIndex = context.dataIndex ?? 0;
        const dataset = context.dataset;

        if (dataIndex >= dataset.data.length) return '';

        // Fixed: Properly handle data type checking
        const dataPoint = dataset.data[dataIndex] as unknown as DataPoint;
        if (!dataPoint) return '';

        const value = context.parsed.y;
        const unit = getUnitForParam(paramName);

        return `${displayName}: ${value.toFixed(2)} ${unit}`;
      }
    };
  };

  /**
   * Render parameter-specific chart with enhanced prediction visualization
   * Refactored to reduce cognitive complexity
   */
  const renderParameterChart = React.useCallback((paramName: string) => {
    // Configure chart based on parameter
    const getParameterConfig = () => {
      let allValues: number[];
      let displayName: string;
      let paramColors: ParameterColors;
      let optimalRange: [number, number];
      let acceptableRange: [number, number];

      switch(paramName) {
        case 'temperature':
          allValues = temp;
          displayName = 'Temperature';
          paramColors = colors.temperature;
          optimalRange = optimals.temperature;
          acceptableRange = acceptable.temperature;
          break;
        case 'oxygen':
          allValues = oxygen;
          displayName = 'Oxygen';
          paramColors = colors.oxygen;
          optimalRange = optimals.oxygen;
          acceptableRange = acceptable.oxygen;
          break;
        case 'salinity':
          allValues = salinity;
          displayName = 'Salinity';
          paramColors = colors.salinity;
          optimalRange = optimals.salinity;
          acceptableRange = acceptable.salinity;
          break;
        case 'pH':
          allValues = pH;
          displayName = 'pH';
          paramColors = colors.pH;
          optimalRange = optimals.pH;
          acceptableRange = acceptable.pH;
          break;
        default:
          return null;
      }

      return {
        allValues,
        displayName,
        paramColors,
        optimalRange,
        acceptableRange
      };
    };

    const config = getParameterConfig();
    if (!config) return null;

    const { allValues, displayName, paramColors, optimalRange, acceptableRange } = config;

    // Use actual timestamps if available, otherwise generate sequential indices
    const actualTimestamps = timestamps && timestamps.length === allValues.length
      ? timestamps
      : Array.from({ length: allValues.length }, (_, i) => i);

    // Split data into monitoring and prediction series
    const {
      monitoringLabels,
      monitoringValues,
      monitoringTimestamps,
      PredictionValues,
      unifiedPredictionTimestamps,
      unifiedPredictionMeta
    } = splitData(labels, allValues, actualTimestamps, pointTypes ?? null);

    // Prepare chart datasets
    const datasets: CustomDataset[] = [];

    // Create monitoring dataset if in appropriate view mode
    if (viewMode === 'combined' || viewMode === 'monitoring') {
      const monitoringDataset = createMonitoringDataset(
        monitoringValues,
        monitoringTimestamps,
        monitoringLabels,
        displayName,
        paramColors
      );

      if (monitoringDataset) {
        datasets.push(monitoringDataset);
      }
    }

    // Create prediction dataset if in appropriate view mode
    let predictionPoints: DataPoint[] = [];
    if (viewMode === 'combined' || viewMode === 'predictions') {
      const { dataset: predictionDataset, points } = createPredictionDataset(
        PredictionValues,
        unifiedPredictionTimestamps,
        unifiedPredictionMeta,
        displayName,
        paramColors
      );

      if (predictionDataset) {
        datasets.push(predictionDataset);
        predictionPoints = points;
      }
    }

    // Get last monitoring time for timeline visualization
    const lastMonitoringTime = monitoringTimestamps.length > 0 ?
      monitoringTimestamps[monitoringTimestamps.length - 1] : null;

    // Create chart data structure
    const chartData = {
      datasets: datasets
    };

    // Configure chart options
    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest' as const,
        intersect: false,
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: 'hour',
            displayFormats: {
              hour: 'dd/MM HH:mm'
            },
            tooltipFormat: 'dd/MM/yyyy HH:mm'
          },
          title: {
            display: true,
            text: 'Waktu'
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 }
          },
          grid: {
            color: (context) => {
              if (lastMonitoringTime && context.tick &&
                  Math.abs(context.tick.value - lastMonitoringTime) < 10000) {
                return 'rgba(0, 0, 255, 0.5)';
              }
              return 'rgba(0, 0, 0, 0.1)';
            },
            lineWidth: (context) => {
              return lastMonitoringTime && context.tick &&
                     Math.abs(context.tick.value - lastMonitoringTime) < 10000 ? 2 : 1;
            }
          }
        },
        y: {
          title: {
            display: true,
            text: `${displayName} (${getUnitForParam(paramName)})`
          },
          min: paramName === 'pH' ?
                Math.max(6, Math.min(...allValues.filter(v => v !== null && v !== undefined)) - 1) :
                Math.max(0, Math.min(...allValues.filter(v => v !== null && v !== undefined)) - 2),
          max: paramName === 'pH' ?
                Math.min(14, Math.max(...allValues.filter(v => v !== null && v !== undefined)) + 1) :
                Math.max(...allValues.filter(v => v !== null && v !== undefined)) + 2
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 6,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: createTooltipCallbacks(datasets, displayName, paramName, predictionHorizon)
        },
        annotation: {
          annotations: {
            // Optimal range
            optimalRange: {
              type: 'box',
              yScaleID: 'y',
              yMin: optimalRange[0],
              yMax: optimalRange[1],
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 0.6)',
              borderWidth: 1,
              borderDash: [5, 5] as [number, number]
            },
            // Acceptable range
            acceptableRange: {
              type: 'box',
              yScaleID: 'y',
              yMin: acceptableRange[0],
              yMax: acceptableRange[1],
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              borderColor: 'rgba(255, 193, 7, 0.4)',
              borderWidth: 1,
              borderDash: [2, 2] as [number, number]
            }
          }
        }
      }
    };

    return (
      <div className="mb-6 pb-3 border-b">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">{displayName}</h3>
          <div className="flex items-center text-xs gap-3">
            {/* Series type indicators */}
            {(viewMode === 'combined' || viewMode === 'monitoring') && (
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: paramColors.line}}></div>
                <span>Monitoring</span>
              </div>
            )}

            {/* Unified prediction legend */}
            {(viewMode === 'combined' || viewMode === 'predictions') && (
              <>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: paramColors.prediction}}></div>
                  <span>Prediksi Mendatang</span>
                </div>

                <div className="flex items-center">
                  <div className="w-3 h-3 rounded mr-1" style={{backgroundColor: '#8b5cf6'}}></div>
                  <span>Prediksi Terdahulu</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="h-64">
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
          />
        </div>
      </div>
    );
  }, [
    temp, oxygen, salinity, pH,
    optimals, acceptable,
    predictionHorizon, viewMode,
    pointTypes, timestamps,
    splitData,
    colors.temperature, colors.oxygen, colors.salinity, colors.pH,
    labels
  ]);

  // Re-render chart when viewMode changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [viewMode]);

  // Memoize parameter selection handler for performance
  const handleParameterChange = React.useCallback((value: 'all' | 'temperature' | 'oxygen' | 'salinity' | 'pH') => {
    setActiveParameter(value);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <Select
          value={activeParameter}
          onChange={handleParameterChange}
          style={{ width: 200 }}
        >
          <Option value="all">All Parameters</Option>
          <Option value="temperature">Temperature</Option>
          <Option value="oxygen">Oxygen</Option>
          <Option value="salinity">Salinity</Option>
          <Option value="pH">pH</Option>
        </Select>

        <div className="flex items-center">
          <AntTooltip title="Chart shows monitoring data and predictions with clear visual separation. Past and future predictions are distinguished by color and shape.">
            <InfoCircleOutlined className="text-gray-400 ml-2" />
          </AntTooltip>
        </div>
      </div>

      <div className="relative">
        {activeParameter === 'all' ? (
          <>
            {renderParameterChart('temperature')}
            {renderParameterChart('oxygen')}
            {renderParameterChart('salinity')}
            {renderParameterChart('pH')}
          </>
        ) : (
          renderParameterChart(activeParameter)
        )}
      </div>

      {/* Enhanced unified legend */}
      <div className="bg-gray-50 p-3 rounded-lg mt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: colors.temperature.line}}></div>
            <div className="w-8 h-0 border-t-2 border-solid mr-2" style={{borderColor: colors.temperature.line}}></div>
            <span className="text-sm">Data Monitoring</span>
          </div>

          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: colors.temperature.prediction}}></div>
            <div className="w-8 h-0 border-t-2 border-dashed mr-2" style={{borderColor: colors.temperature.prediction}}></div>
            <span className="text-sm">Prediksi Mendatang</span>
          </div>

          {/* Past prediction legend */}
          {(viewMode === 'predictions' || viewMode === 'combined') && (
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-1" style={{backgroundColor: '#8b5cf6'}}></div>
              <div className="w-8 h-0 border-t-2 border-dotted mr-2" style={{borderColor: '#8b5cf6'}}></div>
              <span className="text-sm">Prediksi Terdahulu</span>
            </div>
          )}
        </div>

        <div className="flex items-center mt-2">
          <div className="w-8 h-4 bg-blue-50 opacity-80 mr-2"></div>
          <span className="text-sm">Area Prediksi Masa Depan</span>

          <div className="ml-4 w-8 h-4 bg-green-100 opacity-80 mr-2"></div>
          <span className="text-sm">Rentang Optimal</span>

          <div className="ml-4 w-8 h-4 bg-yellow-50 opacity-80 mr-2"></div>
          <span className="text-sm">Rentang Dapat Diterima</span>
        </div>
      </div>

      {/* Enhanced explanation */}
      <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
        <div className="flex items-start">
          <InfoCircleOutlined className="mt-0.5 mr-1 text-blue-500" />
          <div>
            <p className="text-blue-800 font-medium mb-1">Cara Membaca Grafik:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Data <strong>monitoring</strong> ditampilkan dari kiri (masa lalu) ke kanan (saat ini)</li>
              <li>Data <strong>prediksi mendatang</strong> memperpanjang grafik ke masa depan (area biru)</li>
              {(viewMode === 'predictions' || viewMode === 'combined') && (
                <>
                  <li>Data <strong>prediksi terdahulu</strong> (persegi ungu) memungkinkan evaluasi riwayat model</li>
                </>
              )}
              <li>Garis vertikal biru menandai batas antara data aktual dan prediksi</li>
              <li>Hover pada titik untuk melihat nilai parameter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordChart;
