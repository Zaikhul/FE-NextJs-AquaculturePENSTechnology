import { serviceInstance } from "..";

interface ILogin {
  isNotify: boolean;
}

async function getAllCities(user: ILogin) {
  const { data } = await serviceInstance(user.isNotify).get("/api/v1/cities?cityName=");
  return data;
}
export { getAllCities };
