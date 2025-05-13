import { serviceInstance } from "..";

interface IPredictionRequest {
  isNotify: boolean;
  poolsId: string;
  parameters: {
    temperature: number;
    oxygen: number;
    salinity: number;
    acidity: number;
  };
}

async function getPrediction(request: IPredictionRequest) {
  const { data } = await serviceInstance(request.isNotify).post(
    `/api/v1/predict`,
    {
      poolsId: request.poolsId,
      parameters: request.parameters
    }
  );
  return data;
}

export { getPrediction };