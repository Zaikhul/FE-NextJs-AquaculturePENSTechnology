import { getAllMonitoring } from "./get-all.monitoring";
import { getTodayMonitoring } from "./get-today.monitoring";
import { getPrediction } from "./get-prediction.monitoring"

const Monitoring = {
	getTodayMonitoring,
	getAllMonitoring,
	getPrediction
};

export { Monitoring };
