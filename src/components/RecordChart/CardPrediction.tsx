import React, { useCallback, useState } from 'react';
import { Alert, Button, Select, Tooltip } from 'antd';
import dynamic from 'next/dynamic';
import { ReloadOutlined } from '@ant-design/icons';
import ChartLegend from '@/components/RecordChart/ChartLegend';

const ChartComponent = dynamic(() => import('./ChartComponent'), {
	ssr: false,
});

const { Option } = Select;

import {
  PARAMETER_THRESHOLDS,
  TimeRange,
  ChartViewMode,
//   PointType,
//   OptimalRanges,
  RecordChartProps
} from '@/interfaces/prediction';

/**
 * RecordChart component for water quality parameter visualization
 * Now uses centralized state management through props
 */
const ChartPrediction: React.FC<RecordChartProps> = ({
	labels,
	timestamps,
	temperature,
	oxygen,
	salinity,
	pH,
	optimals,
	acceptable,
	predictionHorizon,
	viewMode = 'combined',
	pointTypes,
	fetchPrediction,
	fetchMonitoring,
	fetchHistoricalPredictions,
	lastUpdated,
	timeRange,
	chartView,
	onTimeRangeChange,
	onChartViewChange,
}) => {

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    console.log(`Chart component: TimeRange changing to ${value}`);
    onTimeRangeChange(value);
  }, [onTimeRangeChange]);
  const handleChartViewChange = useCallback((value: ChartViewMode) => {
    console.log(`Chart component: ChartView changing to ${value}`);
    onChartViewChange(value);
  }, [onChartViewChange]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('Manual refresh triggered from chart component');
      await Promise.all([
        fetchPrediction(),
        fetchMonitoring(),
        fetchHistoricalPredictions(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPrediction, fetchMonitoring, fetchHistoricalPredictions]);

  // Validasi data
  const hasData = labels.length > 0 && timestamps.length > 0 &&
    (temperature.length > 0 || oxygen.length > 0 || salinity.length > 0 || pH.length > 0);

  if (!hasData) {
    return (
      <Alert
        message="Data tidak tersedia"
        description="Belum ada data monitoring untuk ditampilkan. Silakan coba refresh atau periksa koneksi sensor."
        type="info"
        showIcon
        action={
          <Button size="small" onClick={handleRefresh} loading={isRefreshing}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Tren Parameter Kualitas Air
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Rentang Waktu:</span>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="w-32"
              size="small"
            >
              <Option value="24h">24 Jam</Option>
              <Option value="72h">3 Hari</Option>
              <Option value="7d">7 Hari</Option>
            </Select>
          </div>

          {/* Chart View Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Tampilan:</span>
            <Select
              value={chartView}
              onChange={handleChartViewChange}
              className="w-48"
              size="small"
            >
              <Option value="combined">Monitoring & Prediksi</Option>
              <Option value="monitoring">Data Monitoring</Option>
              <Option value="predictions">Histori Prediksi</Option>
            </Select>
          </div>

          {/* Refresh Button */}
          <Tooltip title="Refresh data terbaru">
            <Button
              type="default"
              size="small"
              icon={<ReloadOutlined />}
              loading={isRefreshing}
              onClick={handleRefresh}
              className="flex-shrink-0"
            />
          </Tooltip>
        </div>
      </div>

      {/* Chart Component */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <ChartComponent
          labels={labels}
          timestamps={timestamps}
          temperature={temperature}
          oxygen={oxygen}
          salinity={salinity}
          pH={pH}
          optimals={optimals}
          acceptable={acceptable}
          predictionHorizon={predictionHorizon}
          viewMode={chartView}
          pointTypes={pointTypes}
        />
      </div>

      {/* Chart Legend */}
      <ChartLegend
        parameters={PARAMETER_THRESHOLDS}
        predictionHorizon={predictionHorizon}
        chartView={chartView}
        lastUpdated={lastUpdated}
      />
    </div>
  );
};

export default ChartPrediction;
