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
import zoomPlugin from 'chartjs-plugin-zoom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Select, Tooltip as AntTooltip } from 'antd';
import {
  ColorScheme,
  ParameterColors,
  DataPoint,
  ChartComponentProps,
} from '@/interfaces/prediction';

interface CustomDataset extends ChartDataset<'line', DataPoint[]> {
  labels?: string[];
  dataType?: 'monitoring' | 'prediction';
}

// Register komponen dan plugin Chart.js
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
  annotationPlugin,
  zoomPlugin
);

const { Option } = Select;

// Fungsi helper untuk warna dengan opacity
const colorWithOpacity = (color: string, opacity: number): string => {
  if (!color || typeof color !== 'string') return `rgba(0, 0, 0, ${opacity})`;
  const safeOpacity = Math.max(0, Math.min(1, opacity));

  if (color.startsWith('rgba')) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${safeOpacity})`);
  } else if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `,${safeOpacity})`);
  } else if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
    }
  }
  return `rgba(128, 128, 128, ${safeOpacity})`;
};

const ChartComponent = React.memo<ChartComponentProps>(({
  labels,
  temperature,
  oxygen,
  salinity,
  pH,
  optimals,
  acceptable,
  predictionHorizon,
  viewMode = 'combined',
  pointTypes,
  timestamps,
}) => {
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const [activeParameter, setActiveParameter] = useState<'all' | 'temperature' | 'oxygen' | 'salinity' | 'pH'>('all');

// Bersihkan chart saat komponen unmount
useEffect(() => {
return () => {
	if (chartRef.current) {
		try {
			chartRef.current.destroy();
		} catch (error) {
			console.warn('Chart cleanup error:', error);
		} finally {
			chartRef.current = null;
		}
	}
};
}, []);

// Definisikan skema warna
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
},
};

  // Fungsi untuk menentukan gaya titik
  const getPointStyle = (dataPoint: DataPoint): PointStyle => {
    if (dataPoint.FuturePrediction) return 'circle';
    if (dataPoint.PastPrediction) return 'rectRot';
    return 'circle';
  };

  // Fungsi untuk mendapatkan unit parameter
  const getUnitForParam = (paramName: string): string => {
    switch (paramName) {
      case 'temperature': return '°C';
      case 'oxygen': return 'mg/L';
      case 'salinity': return 'ppt';
      default: return 'pH';
    }
  };

  // Pisahkan data monitoring dan prediksi
  const splitData = React.useCallback((
    allLabels: string[],
    allValues: number[],
    allTimestamps: number[] = [],
    allTypes?: typeof pointTypes
  ) => {
    if (!allLabels?.length || !allValues?.length) return {
      monitoringLabels: [], monitoringValues: [], monitoringTimestamps: [],
      unifiedPredictionLabels: [], PredictionValues: [], unifiedPredictionTimestamps: [], PredictionMeta: [],
    };

    const monitoringLabels: string[] = [];
    const monitoringValues: number[] = [];
    const monitoringTimestamps: number[] = [];
    const PredictionValues: number[] = [];
    const unifiedPredictionTimestamps: number[] = [];
    const PredictionMeta: Array<{ FuturePrediction: boolean; PastPrediction: boolean; predictionId?: string }> = [];

    const dataPoints = allLabels.map((label, index) => {
      if (allValues[index] == null || isNaN(allValues[index])) return null;
      return {
        label,
        value: allValues[index],
        timestamp: allTimestamps[index] ?? index,
        type: allTypes?.[index]?.type ?? 'monitoring',
        PastPrediction: Boolean(allTypes?.[index]?.PastPrediction),
        FuturePrediction: Boolean(allTypes?.[index]?.FuturePrediction),
        predictionId: allTypes?.[index]?.predictionId,
      };
    }).filter(Boolean);

    dataPoints.sort((a, b) => (a?.timestamp ?? 0) - (b?.timestamp ?? 0));

    dataPoints.forEach(point => {
      if (!point) return;

      if (point.type === 'monitoring') {
        monitoringLabels.push(point.label);
        monitoringValues.push(point.value);
        monitoringTimestamps.push(point.timestamp);
      } else if (point.type === 'prediction') {
        PredictionValues.push(point.value);
        unifiedPredictionTimestamps.push(point.timestamp);
        PredictionMeta.push({
          FuturePrediction: point.FuturePrediction,
          PastPrediction: point.PastPrediction,
          predictionId: point.predictionId,
        });
      }
    });

    return {
      monitoringLabels,
      monitoringValues,
      monitoringTimestamps,
      unifiedPredictionLabels: [],
      PredictionValues,
      unifiedPredictionTimestamps,
      PredictionMeta,
    };
  }, []);

  // Buat dataset monitoring
  const createMonitoringDataset = (
    monitoringValues: number[],
    monitoringTimestamps: number[],
    monitoringLabels: string[],
    displayName: string,
    paramColors: ParameterColors
  ): CustomDataset | null => {
    if (!monitoringValues?.length) return null;

    const monitoringPoints = monitoringValues.map((value, i) => ({
      x: monitoringTimestamps[i],
      y: value,
      timestamp: monitoringTimestamps[i],
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
      dataType: 'monitoring',
    };
  };

  // Buat dataset prediksi
  const createPredictionDataset = (
    PredictionValues: number[],
    unifiedPredictionTimestamps: number[],
    PredictionMeta: Array<{ FuturePrediction: boolean; PastPrediction: boolean; predictionId?: string }>,
    displayName: string,
    paramColors: ParameterColors
  ): { dataset: CustomDataset | null; points: DataPoint[] } => {
    if (!PredictionValues?.length) return { dataset: null, points: [] };

    const PredictionPoints = PredictionValues.map((value, idx) => ({
      x: unifiedPredictionTimestamps[idx],
      y: value,
      FuturePrediction: PredictionMeta[idx]?.FuturePrediction,
      PastPrediction: PredictionMeta[idx]?.PastPrediction,
      predictionId: PredictionMeta[idx]?.predictionId,
    }));

    const dataset: CustomDataset = {
      label: `${displayName} (Hasil Prediksi)`,
      data: PredictionPoints,
      borderColor: (ctx: ScriptableContext<'line'>) => {
        const point = PredictionPoints[ctx.dataIndex];
        return point?.FuturePrediction ? paramColors.prediction : '#8b5cf6';
      },
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        const point = PredictionPoints[ctx.dataIndex];
        return point?.FuturePrediction ? paramColors.prediction : '#8b5cf6';
      },
      borderWidth: 3,
      pointRadius: 5,
      pointStyle: (ctx: ScriptableContext<'line'>) => getPointStyle(PredictionPoints[ctx.dataIndex]),
      tension: 0.2,
	  fill: false,
      borderDash: (ctx: ScriptableContext<'line'>) => PredictionPoints[ctx.dataIndex]?.FuturePrediction ? [4, 4] : [2, 2],
      dataType: 'prediction',
    };

    return { dataset, points: PredictionPoints };
  };

  // Plugin untuk menandai area prediksi
  const TimelineShadingPlugin = {
    id: 'timelineShading',
    beforeDraw: (chart: ChartJS) => {
      const { ctx, chartArea, scales } = chart;
      const monitoringDataset = chart.data.datasets.find((d: any) => d.dataType === 'monitoring');
      if (!monitoringDataset?.data?.length) return;

      const lastMonitoringPoint = monitoringDataset.data[monitoringDataset.data.length - 1] as DataPoint;
      const transitionX = scales.x.getPixelForValue(lastMonitoringPoint.x);

      ctx.fillStyle = 'rgba(230, 236, 255, 0.3)';
      ctx.fillRect(transitionX, chartArea.top, chartArea.right - transitionX, chartArea.bottom - chartArea.top);

      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(transitionX, chartArea.top);
      ctx.lineTo(transitionX, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sekarang', transitionX, chartArea.top - 5);
    },
  };

  // Render chart untuk parameter tertentu
  const renderParameterChart = React.useCallback((paramName: string) => {
    const config = (() => {
      switch (paramName) {
        case 'temperature': return { allValues: temperature, displayName: 'Temperature', paramColors: colors.temperature, optimalRange: optimals.temperature, acceptableRange: acceptable.temperature };
        case 'oxygen': return { allValues: oxygen, displayName: 'Oxygen', paramColors: colors.oxygen, optimalRange: optimals.oxygen, acceptableRange: acceptable.oxygen };
        case 'salinity': return { allValues: salinity, displayName: 'Salinity', paramColors: colors.salinity, optimalRange: optimals.salinity, acceptableRange: acceptable.salinity };
        case 'pH': return { allValues: pH, displayName: 'pH', paramColors: colors.pH, optimalRange: optimals.pH, acceptableRange: acceptable.pH };
        default: return null;
      }
    })();

    if (!config) return null;

    const { allValues, displayName, paramColors, optimalRange, acceptableRange } = config;
    const actualTimestamps = timestamps && timestamps.length === allValues.length ? timestamps : Array.from({ length: allValues.length }, (_, i) => i);
    const { monitoringLabels, monitoringValues, monitoringTimestamps, PredictionValues, unifiedPredictionTimestamps, PredictionMeta } = splitData(labels, allValues, actualTimestamps, pointTypes);

    const datasets: CustomDataset[] = [];

    if (viewMode === 'combined' || viewMode === 'monitoring') {
      const monitoringDataset = createMonitoringDataset(monitoringValues, monitoringTimestamps, monitoringLabels, displayName, paramColors);
      if (monitoringDataset) datasets.push(monitoringDataset);
    }

    if (viewMode === 'combined' || viewMode === 'predictions') {
      const { dataset: predictionDataset } = createPredictionDataset(PredictionValues, unifiedPredictionTimestamps, PredictionMeta, displayName, paramColors);
      if (predictionDataset) datasets.push(predictionDataset);
    }

    const chartData = { datasets };

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour', displayFormats: { hour: 'dd/MM HH:mm' }, tooltipFormat: 'dd/MM/yyyy HH:mm' },
          title: { display: true, text: 'Waktu' },
          ticks: { autoSkip: true, maxTicksLimit: 8, maxRotation: 45, minRotation: 45, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: `${displayName} (${getUnitForParam(paramName)})` },
          min: paramName === 'pH' ? Math.max(6, Math.min(...allValues.filter(v => v != null)) - 1) : Math.max(0, Math.min(...allValues.filter(v => v != null)) - 2),
          max: paramName === 'pH' ? Math.min(14, Math.max(...allValues.filter(v => v != null)) + 1) : Math.max(...allValues.filter(v => v != null)) + 2,
        },
      },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const item = tooltipItems[0];
              const dataset = datasets[item.datasetIndex];
              const timestamp = item.parsed.x;
              const date = new Date(timestamp);
              const formattedDate = date.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

              if (dataset.dataType === 'prediction') {
                const dataPoint = dataset.data[item.dataIndex];
                if (dataPoint.FuturePrediction) return `${formattedDate} (Prediksi ${predictionHorizon} jam)`;
                if (dataPoint.PastPrediction) return `${formattedDate} (Prediksi Terdahulu)`;
              }
              return formattedDate;
            },
            label: (context) => `${displayName}: ${context.parsed.y.toFixed(2)} ${getUnitForParam(paramName)}`,
          },
        },
        annotation: {
          annotations: {
            optimalRange: { type: 'box', yScaleID: 'y', yMin: optimalRange[0], yMax: optimalRange[1], backgroundColor: paramColors.optimal, borderColor: 'rgba(75, 192, 192, 0.6)', borderWidth: 1, borderDash: [5, 5] },
            acceptableRange: { type: 'box', yScaleID: 'y', yMin: acceptableRange[0], yMax: acceptableRange[1], backgroundColor: 'rgba(255, 193, 7, 0.1)', borderColor: 'rgba(255, 193, 7, 0.4)', borderWidth: 1, borderDash: [2, 2] },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'xy',
          },
          pan: {
            enabled: true,
            mode: 'xy',
          },
        },
      },
    };

    return (
      <div key={paramName} className="mb-6">
        <h4 className="text-md font-medium mb-2">{displayName}</h4>
        <div style={{ height: '300px' }}>
          <Line ref={chartRef} data={chartData} options={chartOptions} plugins={[TimelineShadingPlugin]} />
        </div>
      </div>
    );
  }, [temperature, oxygen, salinity, pH, optimals, acceptable, predictionHorizon, viewMode, pointTypes, timestamps, labels]);

  // Handler untuk perubahan parameter
  const handleParameterChange = (value: 'all' | 'temperature' | 'oxygen' | 'salinity' | 'pH') => setActiveParameter(value);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <AntTooltip title="Pilih parameter untuk tampilan fokus atau lihat semua parameter sekaligus">
          <InfoCircleOutlined className="text-gray-400" />
        </AntTooltip>
        <Select value={activeParameter} onChange={handleParameterChange} className="w-40">
          <Option value="all">Semua Parameter</Option>
          <Option value="temperature">Suhu</Option>
          <Option value="oxygen">Oksigen</Option>
          <Option value="salinity">Salinitas</Option>
          <Option value="pH">pH</Option>
        </Select>
      </div>

      {activeParameter === 'all' ? (
        <>
          {renderParameterChart('temperature')}
          {renderParameterChart('oxygen')}
          {renderParameterChart('salinity')}
          {renderParameterChart('pH')}
        </>
      ) : renderParameterChart(activeParameter)}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.labels.length === nextProps.labels.length &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.predictionHorizon === nextProps.predictionHorizon &&
    JSON.stringify(prevProps.pointTypes?.map(pt => ({
      timestamp: pt.timestamp,
      type: pt.type,
      PastPrediction: pt.PastPrediction,
      FuturePrediction: pt.FuturePrediction
    }))) === JSON.stringify(nextProps.pointTypes?.map(pt => ({
      timestamp: pt.timestamp,
      type: pt.type,
      PastPrediction: pt.PastPrediction,
      FuturePrediction: pt.FuturePrediction
    })))
  );
});

ChartComponent.displayName = 'ChartComponent';

export default ChartComponent;
