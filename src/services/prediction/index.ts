import axios from 'axios';
import { message } from 'antd';

const API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://aquarise.tech:5154';

export interface PredictionResponse {
  poolId: string;
  timestamp: string;
  current_values: {
    temperature: number;
    oxygen: number;
    salinity: number;
    acidity: number;
  };
  predictions: {
    [key: string]: {
      [model: string]: number;
    };
  };
  classification: string;
  confidence: number;
  explanation: any;
}

export const Prediction = {
  async getPrediction({ 
    poolsId, 
    horizon = 24 
  }: { 
    poolsId: string; 
    horizon?: number 
  }): Promise<PredictionResponse | null> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        message.error('Sesi telah berakhir, silakan login kembali');

        return null;
      }

      const response = await axios.post(
        `${API_URL}/api/v1/predict/${poolsId}`,
        { horizon },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            message.error('Token tidak valid!');
            // Optionally redirect to login
            break;
          case 403:
            message.error('Anda tidak memiliki akses ke kolam ini');
            break;
          case 404:
            message.error('Data kolam tidak ditemukan');
            break;
          case 400:
            message.error(error.response.data.detail || 'Input tidak valid');
            break;
          default:
            message.error('Terjadi kesalahan pada server');
        }
      } else if (error.request) {
        message.error('Tidak dapat terhubung ke server');
      } else {
        message.error('Terjadi kesalahan');
      }
      return null;
    }
  },

  async getPredictionHistory(
    poolsId: string,
    date?: string
  ): Promise<any[]> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        message.error('Sesi telah berakhir, silakan login kembali');
        return [];
      }

      const url = date
        ? `${API_URL}/api/v1/predict/${poolsId}/history?date=${date}`
        : `${API_URL}/api/v1/predict/${poolsId}/history`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching prediction history:', error);
      message.error('Gagal memuat riwayat prediksi');
      return [];
    }
  }
};