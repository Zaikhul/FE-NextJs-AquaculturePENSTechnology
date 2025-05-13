import React from 'react';
import { Divider, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ChartLegendProps } from '@/interfaces/prediction';

/**
 * ChartLegend component with comparison data visualization support
 * Provides context and explanation for chart visualization
 */
const ChartLegend: React.FC<ChartLegendProps> = ({
  parameters,
  predictionHorizon,
  chartView,
  lastUpdated
}) => {


  /**
   * prediction legend section that shows future, past predictions,
   * and actual measurements for comparison
   */
  const PredictionLegendSection = () => (
    <div className="mt-3 border-t pt-3 border-gray-200">
      <div className="font-medium mb-2">Hasil Prediksi & Evaluasi</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Future prediction */}
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <div className="mr-2 w-8 h-0 border-b-2 border-dashed border-red-500"></div>
          </div>
          <span className="text-sm">Prediksi Mendatang ({predictionHorizon} jam)</span>
        </div>

        {/* Past prediction */}
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-purple-400 mr-2"></div>
            <div className="mr-2 w-8 h-0 border-b-2 border-dotted border-purple-400"></div>
          </div>
          <span className="text-sm">Prediksi Terdahulu</span>
        </div>

        {/* Actual values */}
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-4 h-4 transform rotate-45 bg-green-500 mr-2"></div>
          </div>
          <span className="text-sm">Nilai Aktual</span>
        </div>
      </div>

      <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-800">
        <InfoCircleOutlined className="mr-1" />
        Pada grafik, prediksi terdahulu (persegi ungu) dapat dibandingkan dengan nilai aktual (segitiga hijau)
        untuk mengevaluasi akurasi model prediksi. Hover pada titik prediksi terdahulu untuk melihat tingkat akurasi.
      </div>
    </div>
  );

  return (
    <div className="mt-4 bg-gray-50 p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="font-medium">Legenda Parameter</div>

        {/* Prediction horizon indicator */}
        <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
          Jangka Prediksi: {predictionHorizon} jam
        </div>
      </div>

      {/* Parameter details section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {Object.entries(parameters).map(([param, ranges]) => {
          const displayParam = param === 'acidity' ? 'pH' : param;
          const unit = ranges.unit;

          let paramColor: string;
          switch(param) {
            case 'temperature': paramColor = 'rgb(255, 99, 132)'; break;
            case 'oxygen': paramColor = 'rgb(54, 162, 235)'; break;
            case 'salinity': paramColor = 'rgb(255, 159, 64)'; break;
            case 'acidity': paramColor = 'rgb(75, 192, 192)'; break;
            default: paramColor = '#666';
          }

          return (
            <div key={param} className="flex">
              {/* Parameter color box */}
              <div
                className="w-4 h-12 rounded mr-2 flex-shrink-0"
                style={{ backgroundColor: paramColor }}
              ></div>

              {/* Parameter details */}
              <div className="text-sm flex-grow">
                <div className="font-semibold">{displayParam.charAt(0).toUpperCase() + displayParam.slice(1)}</div>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Optimal: {ranges.optimal[0]} - {ranges.optimal[1]} {unit}</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                  <span>Dapat Diterima: {ranges.acceptable[0]} - {ranges.acceptable[1]} {unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Divider className="my-2" />

      {/* Point visualization examples */}
      <div className="mt-3">
        <div className="font-medium mb-1">Jenis Area</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="flex items-center">
            <div className="w-full h-4 bg-green-300 opacity-50 rounded mr-2" style={{width: '40px'}}></div>
            <span className="text-sm">Rentang Optimal</span>
          </div>

          <div className="flex items-center">
            <div className="w-full h-4 bg-blue-100 opacity-50 rounded mr-2" style={{width: '40px'}}></div>
            <span className="text-sm">Area Prediksi</span>
          </div>
        </div>
      </div>

      {/* prediction section with comparison visualization */}
      {(chartView === 'predictions' || chartView === 'combined') && <PredictionLegendSection />}

      {/* reading guide with updated language */}
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
        <div className="flex items-start">
          <InfoCircleOutlined className="mr-1 mt-0.5 text-blue-500" />
          <div>
            <p className="text-blue-800 font-medium mb-1">Panduan Membaca Grafik:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Setiap parameter memiliki grafik terpisah untuk memudahkan analisis</li>
              <li>Pada sisi kanan atas, pilih jangka waktu dan tipe visualisasi yang diinginkan</li>
              <li>Garis solid menunjukkan data historis pengukuran yang telah terekam</li>
              <li>Bagian dengan latar belakang biru menunjukkan area prediksi mendatang</li>
              <li>Area hijau menunjukkan rentang optimal parameter kualitas air</li>
              <li>Data diurutkan dari kiri ke kanan berdasarkan waktu</li>
              {(chartView === 'predictions' || chartView === 'combined') && (
                <>
                  <li>Bulat merah: prediksi mendatang untuk {predictionHorizon} jam ke depan</li>
                  <li>Persegi ungu: prediksi terdahulu yang dapat dievaluasi akurasinya</li>
                  <li>Segitiga hijau: nilai aktual pengukuran untuk prediksi terdahulu</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Update information */}
      <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
        <div>
          <InfoCircleOutlined className="mr-1" />
          Data monitoring diperbarui setiap 10 menit
        </div>
        <div>
          Pembaruan Terakhir: {lastUpdated?.toLocaleString('id-ID') || '-'}
        </div>
      </div>
    </div>
  );
};

export default ChartLegend;
